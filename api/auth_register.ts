import axios, { AxiosResponse } from "axios"
import { baseUrl } from "./config"

/**
 * Register a new user
 * @param data - The user data
 * @param data.name - The user's name
 * @param data.email - The user's email
 * @param data.password - The user's password
 * @returns AxiosResponse<any>
 */
export const authRegister = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/register`, data)
}

/**
 * Login a user
 * @param data - The user data
 * @param data.email - The user's email
 * @param data.password - The user's password
 * @returns AxiosResponse<any>
 */
export const authLogin = async (data: any): Promise<AxiosResponse<any>> => {
    return await axios.post(`${baseUrl}/auth/login`, data)
}

/**
 * Get user info
 * @param userId - The user's ID
 * @param token - The user's token
 * @returns AxiosResponse<any>
 */
export const authGetUserInfo = async (userId: string, token: string): Promise<AxiosResponse<any>> => {
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