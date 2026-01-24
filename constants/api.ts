/**
 * Configuration de l'API
 * URL de base pour les appels API
 * 
 * TODO: Remplacer par l'URL réelle de votre backend
 */
export const API_URL = 'https://votre-backend.com/api';

/**
 * Endpoints de l'API
 */
export const API_ENDPOINTS = {
    // Réservations
    BOOKINGS: '/customers/bookings',
    CANCEL_BOOKING: (id: string) => `/customers/bookings/${id}/cancel`,
    CANCEL_BOOKING_ITEMS: '/customers/bookings/items/cancel',
    
    // Voyages
    TRIPS: '/trips',
    TRIP_DETAILS: (id: string) => `/trips/${id}`,
} as const;
