import { baseUrl } from '@/api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export type RefundOption = 'rebooking' | 'payment';

interface CancellationResponse {
    refundableAmount: number;
    refundType: string;
    rebookingTokenCode?: string;
}

/**
 * Gère les erreurs API d'annulation et retourne un message approprié
 */
const handleCancellationError = (error: any): never => {
    console.error('=== Erreur d\'annulation ===');
    console.error('Type:', error?.constructor?.name);
    
    if (axios.isAxiosError(error)) {
        console.error('Details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
        });
        
        if (error.response) {
            const { status, data } = error.response;
            const apiMessage = data?.message;
            
            const errorMessages: Record<number, string> = {
                400: apiMessage || 'Réservation déjà annulée ou données invalides',
                404: apiMessage || 'Réservation non trouvée',
                401: 'Session expirée. Veuillez vous reconnecter',
                403: 'Vous n\'avez pas les droits pour cette action',
                500: 'Erreur serveur. Veuillez réessayer plus tard',
            };
            
            throw new Error(errorMessages[status] || apiMessage || `Erreur (Code: ${status})`);
        }
        
        if (error.request) {
            throw new Error('Pas de réponse du serveur. Vérifiez votre connexion');
        }
    }
    
    throw new Error(error instanceof Error ? error.message : 'Erreur inattendue');
};

/**
 * Annule une réservation complète (tous les passagers)
 */
export const cancelFullBooking = async (
    bookingId: string,
    reason: string,
    refundOption: RefundOption
): Promise<CancellationResponse> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const url = `${baseUrl}/customers/bookings/${bookingId}/cancel`;
        const payload = {
            reason,
            refundOption: refundOption === 'rebooking' ? 'REBOOKING_TOKEN' : 'MONEY_REFUND',
        };

        console.log('Annulation complète:', { url, bookingId });
        
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        
        console.log('Succès:', response.status);
        return response.data;
    } catch (error) {
        return handleCancellationError(error);
    }
};

/**
 * Annule partiellement une réservation (certains passagers seulement)
 */
export const cancelPartialBooking = async (
    passengerIds: string[],
    reason: string,
    refundOption: RefundOption
): Promise<CancellationResponse> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const url = `${baseUrl}/customers/bookings/items/cancel`;
        const payload = {
            bookingItemIds: passengerIds,
            reason,
            refundOption: refundOption === 'rebooking' ? 'REBOOKING_TOKEN' : 'MONEY_REFUND',
        };

        console.log('Annulation partielle:', { url, count: passengerIds.length });
        
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        
        console.log('Succès:', response.status);
        return response.data;
    } catch (error) {
        return handleCancellationError(error);
    }
};
