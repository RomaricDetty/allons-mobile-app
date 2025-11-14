import { Civility, PhoneType } from "@/types";

export interface ContactUrgent {
    fullName: string;
    phone: string;
}

/**
 * Type pour l'utilisateur
 */
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

/**
 * Type pour les props de l'écran de profil
 */
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

/**
 * Type pour les props de l'écran d'inscription
 */
export interface SignUpScreenProps {
    onSignUp: (data: { name: string; email: string; password: string }) => void;
    onSwitchToSignIn: () => void;
}

/**
 * Type pour les données de l'écran d'inscription
 */
export interface SignUpFormData {
    firstName: string;
    lastName: string;
    username: string;
    dateOfBirth: Date | null;
    civility: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    emergencyContactFirstName: string;
    emergencyContactLastName: string;
    emergencyContactPhone: string;
    agreeToTerms: boolean;
}

/**
 * Type pour les erreurs de validation
 */
export interface FormErrors {
    firstName?: string;
    lastName?: string;
    username?: string;
    dateOfBirth?: string;
    civility?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
}

/**
 * Type pour les données de l'inscription
 */
export interface RegisterData {
    firstName: string;
    lastName: string;
    username: string;
    middleName?: string;
    email: string;
    password: string;
    roleID?: string;
    civility: Civility;
    address?: any;
    phones: PhoneNumber[];
    dateOfBirth: string;
    contactUrgent?: ContactUrgent;
}

/**
 * Type pour le numéro de téléphone
 */
export interface PhoneNumber {
    type: PhoneType;
    digits: string;
}   