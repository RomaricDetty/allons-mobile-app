import { socketBaseUrl } from '@/api/config';
import { WebSocketMessage } from '@/types/tracking';
import { io, Socket } from 'socket.io-client';

type MessageHandler = (message: WebSocketMessage) => void;

/**
 * Service singleton Socket.IO pour le suivi bus en temps réel (positions, arrêts, voyage).
 */
class BusTrackingService {
    private socket: Socket | null = null;
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private isConnecting = false;
    private readonly joinedRoomIds = new Set<string>();
    private lastAuthToken: string | null = null;

    /**
     * Log uniquement en mode développement pour limiter la charge JS en production.
     */
    private debugLog(...args: unknown[]): void {
        if (__DEV__) console.log(...args);
    }

    /**
     * Normalise un payload Socket.IO en position bus (ignore les coordonnées invalides).
     */
    private normalizeBusPosition(data: unknown): WebSocketMessage | null {
        const d = data as Record<string, unknown> | null;
        if (!d || typeof d !== 'object') return null;

        const pos = d.position as Record<string, unknown> | undefined;
        const lat = Number(
            d.lat ?? d.latitude ?? pos?.lat ?? pos?.latitude,
        );
        const lng = Number(
            d.lng ?? d.longitude ?? pos?.lng ?? pos?.longitude,
        );

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.debugLog('[SocketIO] bus:position:update ignoré (coords invalides)', data);
            return null;
        }

        return {
            type: 'bus_position_update',
            data: {
                position: {
                    latitude: lat,
                    longitude: lng,
                    speed: Number(d.speed ?? d.velocity ?? pos?.speed ?? 0) || 0,
                    heading: Number(d.heading ?? d.bearing ?? pos?.heading ?? 0) || 0,
                    accuracy: Number(d.accuracy ?? pos?.accuracy ?? 20) || 20,
                    timestamp: (typeof d.timestamp === 'string' ? d.timestamp : null) ?? new Date().toISOString(),
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
     * Envoie l’auth au backend (événements usuels + payload legacy `message`).
     */
    private emitAuthenticate(tripId: string, bookingId: string): void {
        if (!this.socket?.connected) return;
        const payload = { bookingId, tripId, token: this.lastAuthToken };
        this.socket.emit('authenticate', payload);
        this.send({ type: 'authenticate', data: { bookingId, tripId, token: this.lastAuthToken } });
    }

    /**
     * Connecte au serveur Socket.IO (même origine que l’API, sans `/api`).
     */
    async connect(tripId: string, bookingId: string, authToken?: string | null): Promise<void> {
        const tid = tripId?.trim() ?? '';
        const bid = bookingId?.trim() ?? '';
        if (!tid || !bid) {
            this.debugLog('[SocketIO] connect ignoré (tripId ou bookingId vide)', { tid, bid });
            return;
        }

        this.lastAuthToken = authToken?.trim() || null;

        if (this.socket?.connected) {
            this.joinedRoomIds.add(tid);
            this.emitAllJoins();
            this.emitAuthenticate(tid, bid);
            return;
        }

        if (this.isConnecting) {
            this.debugLog('[SocketIO] connexion déjà en cours');
            return;
        }

        if (this.socket && !this.socket.connected) {
            this.joinedRoomIds.add(tid);
            this.socket.auth = { token: this.lastAuthToken, tripId: tid, bookingId: bid };
            this.socket.connect();
            return;
        }

        this.destroySocket();
        this.isConnecting = true;
        this.joinedRoomIds.add(tid);

        try {
            this.socket = io(socketBaseUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelayMax: 15000,
                auth: {
                    token: this.lastAuthToken,
                    tripId: tid,
                    bookingId: bid,
                },
            });

            this.socket.on('connect', () => {
                this.debugLog('[SocketIO] connect', { socketId: this.socket?.id });
                this.isConnecting = false;
                this.emitAllJoins();
                this.emitAuthenticate(tid, bid);
                this.notifyHandlers('connection', {
                    type: 'connection',
                    data: { connected: true },
                });
            });

            this.socket.on('bus:position:update', (data: unknown) => {
                this.debugLog('[SocketIO] bus:position:update', data);
                const msg = this.normalizeBusPosition(data);
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
     * Rejoint la room Socket.IO d’un bus / trajet (réappliqué après chaque reconnexion).
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
     * Coupe le socket, vide les rooms suivies et retire les handlers.
     */
    disconnect(): void {
        this.joinedRoomIds.clear();
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
        } else {
            if (__DEV__) console.warn('[SocketIO] non connecté, emit message ignoré');
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
