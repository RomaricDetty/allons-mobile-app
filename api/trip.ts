import axios, { AxiosResponse } from "axios"
import { baseUrl } from "./config"

/**
 * Get popular trips
 * @returns AxiosResponse<any>
 */
export const getPopularTrips = async (): Promise<AxiosResponse<any>> => {
    return await axios.get(`${baseUrl}/customers/trips/popular`)
}