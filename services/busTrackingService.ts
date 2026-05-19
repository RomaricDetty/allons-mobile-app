import { socketBaseUrl } from '@/api/config';
import { WebSocketMessage } from '@/types/tracking';
import { io, Socket } from 'socket.io-client';

type MessageHandler = (message: WebSocketMessage) => void;

/** Payload position émis / reçu par l’app pro (`socket.service` / `location-tracking`). */
export interface SocketBusPositionPayload {
    busId: string;
    lat: number;
    lng: number;
    timestamp?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
}

/**
 * Service singleton Socket.IO pour le suivi bus en temps réel (aligné sur allon-mobile-pro).
 */
class BusTrackingService {
    private socket: Socket | null = null;
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private isConnecting = false;
    /** Rooms bus suivies (`bus:join` / `bus:leave`). */
    private readonly joinedRoomIds = new Set<string>();
    private lastAuthToken: string | null = null;
    private lastTripId: string | null = null;
    private lastBookingId: string | null = null;

    /**
     * Log uniquement en mode développement pour limiter la charge JS en production.
     */
    private debugLog(...args: unknown[]): void {
        if (__DEV__) console.log(...args);
    }

    /**
     * Convertit un timestamp numérique (s ou ms) en ISO string.
     */
    private normalizeTimestamp(value: unknown): string {
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Date.parse(value);
            if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            const ms = value < 1e12 ? Math.round(value * 1000) : Math.round(value);
            return new Date(ms).toISOString();
        }
        return new Date().toISOString();
    }

    /**
     * Parse une position au format app pro (`{ busId, lat, lng, … }`) et filtre par room bus.
     */
    private parseSocketBusPosition(data: unknown): WebSocketMessage | null {
        const d = data as Record<string, unknown> | null;
        if (!d || typeof d !== 'object') return null;

        const busId = String(d.busId ?? '').trim();
        if (!busId) return null;

        if (this.joinedRoomIds.size > 0 && !this.joinedRoomIds.has(busId)) {
            this.debugLog('[SocketIO] position ignorée (autre bus)', { busId });
            return null;
        }

        const pos = d.position as Record<string, unknown> | undefined;
        let lat = Number(d.lat ?? d.latitude ?? pos?.lat ?? pos?.latitude);
        let lng = Number(d.lng ?? d.longitude ?? pos?.lng ?? pos?.longitude);

        const coords = d.coordinates as unknown;
        if (
            (!Number.isFinite(lat) || !Number.isFinite(lng)) &&
            Array.isArray(coords) &&
            coords.length >= 2
        ) {
            lng = Number(coords[0]);
            lat = Number(coords[1]);
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.debugLog('[SocketIO] bus:position:update ignoré (coords invalides)', data);
            return null;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.debugLog('[SocketIO] bus:position:update ignoré (coords hors limites)', { lat, lng });
            return null;
        }

        return {
            type: 'bus_position_update',
            data: {
                busId,
                position: {
                    latitude: lat,
                    longitude: lng,
                    speed: Number(d.speed ?? pos?.speed ?? 0) || 0,
                    heading: Number(d.heading ?? d.bearing ?? pos?.heading ?? 0) || 0,
                    accuracy: Number(d.accuracy ?? pos?.accuracy ?? 20) || 20,
                    timestamp: this.normalizeTimestamp(d.timestamp),
                },
                raw: data,
            },
        };
    }

    /**
     * Réémet tous les `bus:join` après une reconnexion Socket.IO.
     */
    private emitAllJoins(): void {
        if (!this.socket?.connected) return;
        for (const busId of this.joinedRoomIds) {
            this.debugLog('[SocketIO] bus:join emit', { busId });
            this.socket.emit('bus:join', { busId });
        }
    }

    /**
     * Auth optionnelle passager (trip + réservation) si les deux IDs sont fournis.
     */
    private emitAuthenticate(): void {
        if (!this.socket?.connected || !this.lastTripId || !this.lastBookingId) return;
        const payload = {
            bookingId: this.lastBookingId,
            tripId: this.lastTripId,
            token: this.lastAuthToken,
        };
        this.socket.emit('authenticate', payload);
        this.send({ type: 'authenticate', data: payload });
    }

    /**
     * Branche les écouteurs Socket.IO (format identique à l’app pro).
     */
    private attachSocketListeners(): void {
        if (!this.socket) return;

        this.socket.on('bus:position:update', (data: unknown) => {
            this.debugLog('[SocketIO] bus:position:update', data);
            const msg = this.parseSocketBusPosition(data);
            if (msg) this.handleMessage(msg);
        });

        this.socket.on('bus:position:received', (data: unknown) => {
            this.debugLog('[SocketIO] bus:position:received', data);
            const msg = this.parseSocketBusPosition(data);
            if (msg) this.handleMessage(msg);
        });

        this.socket.on('bus_position_update', (data: unknown) => {
            this.debugLog('[SocketIO] bus_position_update', data);
            const msg = this.parseSocketBusPosition(data);
            if (msg) this.handleMessage(msg);
        });

        this.socket.on('bus:stop:update', (data: unknown) => {
            this.debugLog('[SocketIO] bus:stop:update', data);
            const stop =
                data && typeof data === 'object' && 'stop' in (data as object)
                    ? (data as { stop: unknown }).stop
                    : data;
            this.handleMessage({
                type: 'bus_stop_update',
                data: { stop },
            } as WebSocketMessage);
        });

        this.socket.on('trip:update', (data: unknown) => {
            this.debugLog('[SocketIO] trip:update', data);
            this.handleMessage({ type: 'trip_update', data: { trip: data } } as WebSocketMessage);
        });
    }

    /**
     * Connecte au serveur Socket.IO (même origine que l’API, sans `/api`).
     * Connexion possible avec le seul JWT (comme l’app pro) ou avec trip + booking en plus.
     */
    async connect(
        tripId: string,
        bookingId: string,
        authToken?: string | null,
    ): Promise<void> {
        const tid = tripId?.trim() ?? '';
        const bid = bookingId?.trim() ?? '';
        const token = authToken?.trim() || null;

        if (!token && (!tid || !bid)) {
            this.debugLog('[SocketIO] connect ignoré (token ou trip/booking requis)');
            return;
        }

        this.lastAuthToken = token;
        this.lastTripId = tid || null;
        this.lastBookingId = bid || null;

        if (this.socket?.connected) {
            this.emitAllJoins();
            this.emitAuthenticate();
            return;
        }

        if (this.isConnecting) {
            this.debugLog('[SocketIO] connexion déjà en cours');
            return;
        }

        if (this.socket && !this.socket.connected) {
            this.socket.auth = {
                token: this.lastAuthToken,
                ...(tid && bid ? { tripId: tid, bookingId: bid } : {}),
            };
            this.socket.connect();
            return;
        }

        this.destroySocket();
        this.isConnecting = true;

        try {
            this.socket = io(socketBaseUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelayMax: 15000,
                auth: {
                    token: this.lastAuthToken,
                    ...(tid && bid ? { tripId: tid, bookingId: bid } : {}),
                },
                query: {
                    platform: 'mobile-passenger',
                },
            });

            this.attachSocketListeners();

            this.socket.on('connect', () => {
                this.debugLog('[SocketIO] connect', { socketId: this.socket?.id });
                this.isConnecting = false;
                this.emitAllJoins();
                this.emitAuthenticate();
                this.notifyHandlers('connection', {
                    type: 'connection',
                    data: { connected: true },
                });
            });

            this.socket.on('connect_error', (error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('[SocketIO] connect_error', err.message);
                this.isConnecting = false;
                this.notifyHandlers('error', {
                    type: 'error',
                    data: { error: err },
                });
            });

            this.socket.on('disconnect', (reason: string) => {
                this.debugLog('[SocketIO] disconnect', reason);
                this.isConnecting = false;
                this.notifyHandlers('connection', {
                    type: 'connection',
                    data: { connected: false },
                });
            });
        } catch (error) {
            console.error('[SocketIO] erreur init:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    /**
     * Rejoint la room Socket.IO d’un bus (réappliqué après chaque reconnexion).
     */
    joinBusRoom(busId: string): void {
        const id = busId?.trim();
        if (!id) return;
        this.joinedRoomIds.add(id);
        if (!this.socket?.connected) return;
        this.debugLog('[SocketIO] bus:join emit', { busId: id });
        this.socket.emit('bus:join', { busId: id });
    }

    /**
     * Quitte la room d’un bus (comme l’app pro).
     */
    leaveBusRoom(busId: string): void {
        const id = busId?.trim();
        if (!id) return;
        this.joinedRoomIds.delete(id);
        if (!this.socket?.connected) return;
        this.debugLog('[SocketIO] bus:leave emit', { busId: id });
        this.socket.emit('bus:leave', { busId });
    }

    /**
     * Coupe le socket, vide les rooms suivies et retire les handlers.
     */
    disconnect(): void {
        this.joinedRoomIds.clear();
        this.lastTripId = null;
        this.lastBookingId = null;
        this.destroySocket();
        this.messageHandlers.clear();
    }

    /** Ferme proprement l’instance Socket.IO courante. */
    private destroySocket(): void {
        if (!this.socket) return;
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
    }

    /**
     * Envoie un message au serveur (canal legacy `message`).
     */
    send(message: { type: string; data?: unknown }): void {
        if (this.socket?.connected) {
            this.debugLog('[SocketIO] emit message', message);
            this.socket.emit('message', message);
        } else if (__DEV__) {
            console.warn('[SocketIO] non connecté, emit message ignoré');
        }
    }

    /**
     * Enregistre un handler pour un type de message normalisé.
     */
    on(type: string, handler: MessageHandler): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type)!.push(handler);
    }

    /**
     * Supprime un handler.
     */
    off(type: string, handler: MessageHandler): void {
        const handlers = this.messageHandlers.get(type);
        if (!handlers) return;
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
    }

    private handleMessage(message: WebSocketMessage): void {
        this.debugLog('[SocketIO] message', message.type);
        this.notifyHandlers(message.type, message);
    }

    private notifyHandlers(type: string, message: WebSocketMessage): void {
        const handlers = this.messageHandlers.get(type);
        handlers?.forEach((handler) => handler(message));
    }

    /**
     * Indique si le socket est connecté.
     */
    isConnected(): boolean {
        return this.socket !== null && this.socket.connected;
    }
}

export const busTrackingService = new BusTrackingService();
