import axios from 'axios';
import { baseUrl } from './config';

/**
 * Interface pour la réponse de vérification du code de rebooking
 */
interface RebookingCodeResponse {
    id: string;
    code: string;
    creditAmount: number;
    remainingAmount: number;
    currency: string;
    status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
    expiresAt: string;
    usedAt?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string | null;
    metadata?: {
        cancellationReason?: string;
        cancellationType?: string;
        originalDepartureCode?: string;
        createdAtFrom?: string;
        parentTokenCode?: string;
    };
    originalBooking?: any;
    company?: any;
}

/**
 * Type pour l'export
 */
export type { RebookingCodeResponse };

/**
 * Vérifie un code de rebooking auprès de l'API
 * @param code - Le code de rebooking à vérifier
 * @param token - Token d'authentification (optionnel)
 * @returns Promesse avec la réponse de validation
 */
export const verifyRebookingCode = async (
    code: string,
    token?: string | null
): Promise<{ status: number; data: RebookingCodeResponse }> => {
    try {
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${baseUrl}/customers/bookings/rebooking-tokens/${code}`,
            { headers }
        );

        return {
            status: response.status,
            data: response.data
        };
    } catch (error: any) {
        console.error('Erreur lors de la vérification du code de rebooking:', error);
        
        if (error.response) {
            return {
                status: error.response.status,
                data: error.response.data
            };
        }
        
        throw error;
    }
};
