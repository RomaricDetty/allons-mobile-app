import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Register a new user
 * @param data - The user data
 * @param data.name - The user's name
 * @param data.email - The user's email
 * @param data.password - The user's password
 * @returns AxiosResponse<any>
 */
export const authRegister = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/register/customer`, data,
        {
            headers: {
                'Content-Type': 'application/json',
                'X-App-Audience': 'frontoffice_mobile',
            },
        });
}

/**
 * Login a user
 * @param data - The user data
 * @param data.email - The user's email
 * @param data.password - The user's password
 * @returns AxiosResponse<any>
 */
export const authLogin = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/login`, data,
        {
            headers: {
                'Content-Type': 'application/json',
                'X-App-Audience': 'frontoffice_mobile',
            },
        });
}

/**
 * Get user info
 * @param userId - The user's ID
 * @param token - The user's token
 * @returns AxiosResponse<any>
 */
export const authGetUserInfo = async (userId: string, token: string): Promise<AxiosResponse<any>> => {
    // Vérifier que le token et l'ID utilisateur sont valides
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }

    if (!userId || userId.trim() === '') {
        throw new Error('ID utilisateur manquant ou invalide');
    }

    return await axios.get(`${baseUrl}/customers/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }
    );
}

/**
 * Get booking list
 * @param userId - The user's ID
 * @param token - The user's token
 * @returns AxiosResponse<any>
 */
export const bookingListInfo = async (userId: string, token: string): Promise<AxiosResponse<any>> => {
    // Vérifier que le token et l'ID utilisateur sont valides
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }

    if (!userId || userId.trim() === '') {
        throw new Error('ID utilisateur manquant ou invalide');
    }

    return await axios.get(`${baseUrl}/customers/bookings?createdById=${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Refresh token
 * @param token - The user's refresh token
 * @returns AxiosResponse<any>
 */
export const refreshTokenApi = async (token: string): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/refresh-token`, { refreshToken: token });
}

/**
 * Update user info
 * @param userId - The user's ID
 * @param data - The user data
 * @param token - The user's token
 * @returns AxiosResponse<any>
 */
export const updateUserInfo = async (userId: string, data: any, token: string): Promise<AxiosResponse<any>> => {
    // Vérifier que le token et l'ID utilisateur sont valides
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }

    if (!userId || userId.trim() === '') {
        throw new Error('ID utilisateur manquant ou invalide');
    }

    return await axios.patch(`${baseUrl}/customers/${userId}`, data, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Forgot password
 * @param data - The user data
 * @param data.email - The user's email
 * @param data.username - The user's username
 * @param data.phone - The user's phone
 * @returns AxiosResponse<any>
 */
export const forgotPasswordApi = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/forgot-password/initiate`, data, {
        headers: {
            'Content-Type': 'application/json'
        },
    });
}

/**
 * Envoie le code de réinitialisation via la méthode choisie
 * @param data - Les données de la demande
 * @param data.userIdToken - Le token de l'utilisateur
 * @param data.method - La méthode choisie (email, sms, whatsapp)
 * @returns AxiosResponse<any>
 */
export const sendResetCodeApi = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/forgot-password/choose-method`, data, {
        headers: {
            'Content-Type': 'application/json'
        },
    });
}

/**
 * Vérifie le code de réinitialisation
 * @param data - Les données de vérification
 * @param data.userIdToken - Le token de l'utilisateur
 * @param data.code - Le code de vérification à 6 chiffres
 * @returns AxiosResponse<any>
 */
export const verifyResetCodeApi = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/forgot-password/verify-code`, data, {
        headers: {
            'Content-Type': 'application/json'
        },
    });
}

/**
 * Réinitialise le mot de passe
 * @param data - Les données de réinitialisation
 * @param data.userIdToken - Le token de l'utilisateur
 * @param data.newPassword - Le nouveau mot de passe
 * @param data.confirmPassword - La confirmation du nouveau mot de passe
 * @returns AxiosResponse<any>
 */
export const resetPasswordApi = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/forgot-password/reset`, data, {
        headers: {
            'Content-Type': 'application/json'
        },
    });
}

/**
 * Recuperation de la liste des pays
 * @returns AxiosResponse<any>
 */
export const getCountryList = async (): Promise<AxiosResponse<any>> => {
    return await axios.get(`${baseUrl}/customers/countries`, {
        headers: {
            'Content-Type': 'application/json'
        },
    });
}