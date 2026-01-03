import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Get booking details
 * @param bookingId - The booking ID
 * @param token - Le token d'authentification
 * @returns AxiosResponse<any>
 */
export const getBookingDetails = async (bookingId: string, token: string): Promise<AxiosResponse<any>> => {
    // Vérifier que le token est valide
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }
    
    return await axios.get(`${baseUrl}/customers/bookings/${bookingId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}


/**
 * Create a new booking
 * @param bookingData - The booking data
 * @returns AxiosResponse<any>
 */
export const createBooking = async (bookingData: any, token?: string): Promise<AxiosResponse<any>> => {
    const headers: any = {};
    
    // Ajouter le header Authorization uniquement si le token est fourni
    if (token && token.trim() !== '') {
        headers.Authorization = `Bearer ${token}`;
    }
    
    return await axios.post(`${baseUrl}/customers/bookings`, bookingData, {
        headers,
    });
}

/**
 * Crée un paiement pour une réservation
 * @param bookingData - Les données de paiement
 * @param token - Le token d'authentification (optionnel)
 * @returns AxiosResponse<any>
 */
export const createBookingPayment = async (bookingData: any, token?: string): Promise<AxiosResponse<any>> => {
    const headers: any = {};
    
    // Ajouter le header Authorization uniquement si le token est fourni
    if (token && token.trim() !== '') {
        headers.Authorization = `Bearer ${token}`;
    }
    
    return await axios.post(`${baseUrl}/customers/bookings/pay`, bookingData, {
        headers,
    });
}

/**
 * Recherche un ticket par référence (sans authentification)
 * @param referenceCode - Le code de référence du ticket
 * @returns AxiosResponse<any>
 */
export const getBookingByReference = async (referenceCode: string): Promise<AxiosResponse<any>> => {
    return await axios.get(`${baseUrl}/bookings/reference/${referenceCode}`);
}


/**
 * Récupère le QR code d'une réservation
 * @param bookingId - L'ID de la réservation
 * @param token - Le token d'authentification
 * @returns AxiosResponse<any>
 */
export const getBookingQrCode = async (bookingId: string, token: string): Promise<AxiosResponse<any>> => {
    // Vérifier que le token est valide
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }

    // console.log('bookingId: ', bookingId);
    // console.log('token: ', token);
    // console.log('baseUrl: ', `${baseUrl}/bookings/${bookingId}/qrcode`);
    
    return await axios.get(`${baseUrl}/customers/${bookingId}/qrcode`, {
        // headers: {
        //     Authorization: `Bearer ${token}`,
        // },
    });
}