import { WebSocketMessage } from '@/types/tracking';
import { io, Socket } from 'socket.io-client';

type MessageHandler = (message: WebSocketMessage) => void;

class BusTrackingService {
    private socket: Socket | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private isConnecting = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseUrl = 'https://dev-allon-backend.onrender.com';
    private activeBusRoomId: string | null = null;

    /**
     * Normalise un payload Socket.IO en position bus.
     */
    private normalizeBusPosition(data: any): WebSocketMessage {
        const lat = Number(data?.lat ?? data?.latitude ?? data?.position?.lat ?? data?.position?.latitude);
        const lng = Number(data?.lng ?? data?.longitude ?? data?.position?.lng ?? data?.position?.longitude);

        return {
            type: 'bus_position_update',
            data: {
                position: {
                    latitude: lat,
                    longitude: lng,
                    speed: Number(data?.speed ?? data?.velocity ?? 0),
                    heading: Number(data?.heading ?? data?.bearing ?? 0),
                    accuracy: Number(data?.accuracy ?? 20),
                    timestamp: data?.timestamp ?? new Date().toISOString(),
                },
                raw: data,
            },
        };
    }

    /**
     * Connecte au serveur Socket.IO puis rejoint la room du bus.
     */
    async connect(tripId: string, bookingId: string): Promise<void> {
        console.log('[SocketIO] connect() appelé', { tripId, bookingId });
        if (this.isConnecting || (this.socket && this.socket.connected)) {
            console.log('Déjà connecté ou connexion en cours');
            return;
        }

        this.isConnecting = true;

        try {
            this.socket = io(this.baseUrl, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
            });

            this.socket.on('connect', () => {
                console.log('Connecté au tracking du bus');
                console.log('[SocketIO] socket connect', { socketId: this.socket?.id });
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.joinBusRoom(tripId);
                this.send({ type: 'authenticate', data: { bookingId, tripId } });

                // @ts-ignore
                this.notifyHandlers('connection' as any, { type: 'connection', data: { connected: true } });
            });

            this.socket.on('bus:position:update', (data: any) => {
                console.log('[SocketIO] bus:position:update reçu', data);
                this.handleMessage(this.normalizeBusPosition(data));
            });

            this.socket.on('bus:stop:update', (data: any) => {
                console.log('[SocketIO] bus:stop:update reçu', data);
                this.handleMessage({ type: 'bus_stop_update', data: { stop: data } } as WebSocketMessage);
            });

            this.socket.on('trip:update', (data: any) => {
                console.log('[SocketIO] trip:update reçu', data);
                this.handleMessage({ type: 'trip_update', data: { trip: data } } as WebSocketMessage);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Erreur WebSocket:', error);
                this.isConnecting = false;
                this.notifyHandlers('error', { type: 'error' as any, data: { error } });
            });

            this.socket.on('disconnect', () => {
                console.log('Déconnecté du tracking');
                this.isConnecting = false;
                this.socket = null;
                this.activeBusRoomId = null;
                // @ts-ignore
                this.notifyHandlers('connection' as any, { type: 'connection', data: { connected: false } });

                // Tentative de reconnexion
                this.attemptReconnect(tripId, bookingId);
            });
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    /**
     * Rejoint la room Socket.IO d'un bus donné.
     */
    joinBusRoom(busId: string): void {
        if (!this.socket || !this.socket.connected || !busId) return;
        if (this.activeBusRoomId === busId) return;
        this.activeBusRoomId = busId;
        console.log('[SocketIO] bus:join emit', { busId });
        this.socket.emit('bus:join', { busId });
    }

    /**
     * Tente de se reconnecter automatiquement
     */
    private attemptReconnect(tripId: string, bookingId: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Nombre maximum de tentatives de reconnexion atteint');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff

        console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);

        this.reconnectTimeout = setTimeout((delay: number | any): void => {
            this.connect(tripId, bookingId);
        }, delay);
    }

    /**
     * Déconnecte du serveur WebSocket
     */
    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.activeBusRoomId = null;
        this.messageHandlers.clear();
        this.reconnectAttempts = 0;
    }

    /**
     * Envoie un message au serveur
     */
    send(message: any): void {
        if (this.socket && this.socket.connected) {
            console.log('[SocketIO] message emit', message);
            this.socket.emit('message', message);
        } else {
            console.warn('WebSocket non connecté, impossible d\'envoyer le message');
        }
    }

    /**
     * Enregistre un handler pour un type de message
     */
    on(type: string, handler: MessageHandler): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type)!.push(handler);
    }

    /**
     * Supprime un handler
     */
    off(type: string, handler: MessageHandler): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Gère les messages reçus
     */
    private handleMessage(message: WebSocketMessage): void {
        console.log('Message reçu:', message.type);
        this.notifyHandlers(message.type, message);
    }

    /**
     * Notifie tous les handlers d'un type de message
     */
    private notifyHandlers(type: string, message: WebSocketMessage): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            handlers.forEach((handler) => handler(message));
        }
    }

    /**
     * Vérifie si le WebSocket est connecté
     */
    isConnected(): boolean {
        return this.socket !== null && this.socket.connected;
    }
}

export const busTrackingService = new BusTrackingService();