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
 * Payload passager pour la réservation avec code rebooking (phone en objet)
 */
export interface RebookingPassengerPayload {
    seatNumber: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: { digits: string; countryCode: string; type: string; isPrimary: boolean };
    age?: number;
    passengerType: string;
    isMainPassenger: boolean;
    userId: string | null;
    price: number;
    leg: 'OUTBOUND' | 'RETURN';
}

/**
 * Crée une réservation avec un code de rebooking (POST body: tokenCode, departureId, returnDepartureId?, passengers).
 * @param payload - tokenCode, departureId, returnDepartureId (optionnel), passengers
 * @param token - Token d'authentification
 */
export const createRebookingBooking = async (
    payload: {
        tokenCode: string;
        departureId: string;
        returnDepartureId?: string | null;
        passengers: RebookingPassengerPayload[];
    },
    token?: string
): Promise<AxiosResponse<any>> => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token && token.trim() !== '') {
        headers.Authorization = `Bearer ${token}`;
    }
    const body: any = {
        tokenCode: payload.tokenCode,
        departureId: payload.departureId,
        passengers: payload.passengers
    };
    if (payload.returnDepartureId) {
        body.returnDepartureId = payload.returnDepartureId;
    }
    return await axios.post(`${baseUrl}/customers/bookings/rebook`, body, { headers });
};

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
    
    // console.log('bookingId: ', bookingId);
    // console.log('token: ', token);
    // console.log('baseUrl: ', `${baseUrl}/bookings/${bookingId}/qrcode`);
    
    return await axios.get(`${baseUrl}/customers/${bookingId}/qrcode`, {
        // headers: {
        //     Authorization: `Bearer ${token}`,
        // },
    });
}