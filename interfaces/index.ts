export interface ContactUrgent {
    fullName: string;
    phone: string;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    email: string;
    username: string;
    civility: string;
    dateOfBirth: string;
    picture?: string | null;
    role?: string | null;
    company?: string | null;
    address?: string | null;
    contactUrgent: ContactUrgent;
    phones?: any[];
    active: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    tripsCompleted?: number;
    clientType?: string;
    allonCoins?: number;
}

export interface ProfileScreenProps {
    onLogout: () => void;
}

/**
 * Écran de profil pour l'utilisateur connecté
 */
export interface Booking {
    id: string;
    code: string;
    companyName: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    status: string;
    totalAmount: string;
    currency: string;
    passengers: Array<{
        firstName: string;
        lastName: string;
    }>;
    trip: {
        label: string;
        stationFrom: {
            city: string;
        };
        stationTo: {
            city: string;
        };
    };
}