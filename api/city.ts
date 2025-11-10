import axios, { AxiosResponse } from "axios"
import { baseUrl } from "./config"

/**
 * Get all cities
 * @returns AxiosResponse<any>
 */
export const getCities = async (): Promise<AxiosResponse<any>> => {
    return await axios.get(`${baseUrl}/customers/cities`)
}