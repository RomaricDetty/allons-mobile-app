import { PopularTripsResponse } from "@/types"
import axios, { AxiosResponse } from "axios"
import { baseUrl } from "./config"

/**
 * Get popular trips
 * @returns AxiosResponse<PopularTripsResponse>
 */
export const getPopularTrips = async (): Promise<AxiosResponse<PopularTripsResponse>> => {
    return await axios.get(`${baseUrl}/customers/trips/popular`)
}

export const getNextTrip = async (token: string): Promise<AxiosResponse<any>> => {
    if (!token || token.trim() === '') {
        throw new Error('Token d\'authentification manquant ou invalide');
    }
    return await axios.get(`${baseUrl}/bookings/upcoming`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}   