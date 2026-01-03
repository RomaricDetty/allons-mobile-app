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