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