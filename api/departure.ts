import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Get available departures
 * @param queryParams - The query parameters
 * @returns AxiosResponse<any>
 */
export const getAvailableDepartures = async (queryParams: string): Promise<AxiosResponse<any>> => {
    console.log('queryParams => ', `${baseUrl}/customers/departures?${queryParams}`);
    return await axios.get(`${baseUrl}/customers/departures?${queryParams}`);
}