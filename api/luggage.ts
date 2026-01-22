import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Récupère la liste des bagages d'un passager (booking item)
 * @param bookingItemId - L'ID du booking item (passager)
 * @param token - Le token d'authentification
 * @returns AxiosResponse<any>
 */
export const getLuggageList = async (bookingItemId: string, token: string): Promise<AxiosResponse<any>> => {
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }
    
    return await axios.get(`${baseUrl}/customers/luggages/${bookingItemId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Crée une réclamation pour un bagage perdu ou volé
 * @param luggageId - L'ID du bagage
 * @param claimData - Les données de la réclamation (peut inclure metadata pour les dommages)
 * @param token - Le token d'authentification
 * @returns AxiosResponse<any>
 */
export const createLuggageClaim = async (
    luggageId: string,
    claimData: { type: string; description?: string; metadata?: { damageDescription?: string; estimatedValue?: number | null } },
    token: string
): Promise<AxiosResponse<any>> => {
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }
    
    return await axios.post(
        `${baseUrl}/customers/claims/${luggageId}`,
        claimData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
}
