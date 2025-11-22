import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Get booking details
 * @param bookingId - The booking ID
 * @returns AxiosResponse<any>
 */
export const getBookingDetails = async (bookingId: string, token: string): Promise<AxiosResponse<any>> => {
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