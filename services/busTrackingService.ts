import { WebSocketMessage } from '@/types/tracking';

type MessageHandler = (message: WebSocketMessage) => void;

class BusTrackingService {
    private ws: WebSocket | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private isConnecting = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseUrl = 'wss://votre-backend.com/ws'; // Remplacez par votre URL

    /**
     * Connecte au serveur WebSocket pour un voyage spécifique
     */
    async connect(tripId: string, bookingId: string): Promise<void> {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('Déjà connecté ou connexion en cours');
            return;
        }

        this.isConnecting = true;

        try {
            this.ws = new WebSocket(`${this.baseUrl}/bus-tracking/${tripId}`);

            this.ws.onopen = () => {
                console.log('Connecté au tracking du bus');
                this.isConnecting = false;
                this.reconnectAttempts = 0;

                // S'authentifier avec le bookingId
                this.send({
                    type: 'authenticate',
                    data: { bookingId, tripId },
                });

                // @ts-ignore
                this.notifyHandlers('connection' as any, { type: 'connection', data: { connected: true } });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Erreur parsing message WebSocket:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('Erreur WebSocket:', error);
                this.isConnecting = false;
                this.notifyHandlers('error', { type: 'error' as any, data: { error } });
            };

            this.ws.onclose = () => {
                console.log('Déconnecté du tracking');
                this.isConnecting = false;
                this.ws = null;
                // @ts-ignore
                this.notifyHandlers('connection' as any, { type: 'connection', data: { connected: false } });

                // Tentative de reconnexion
                this.attemptReconnect(tripId, bookingId);
            };
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            this.isConnecting = false;
            throw error;
        }
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

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.messageHandlers.clear();
        this.reconnectAttempts = 0;
    }

    /**
     * Envoie un message au serveur
     */
    send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
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
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const busTrackingService = new BusTrackingService();