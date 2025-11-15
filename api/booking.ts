import axios, { AxiosResponse } from "axios";
import { baseUrl } from "./config";

/**
 * Get booking details
 * @param bookingId - The booking ID
 * @returns AxiosResponse<any>
 */
export const getBookingDetails = async (bookingId: string, token: string): Promise<AxiosResponse<any>> => {
    return await axios.get(`${baseUrl}/customers/bookings/${bookingId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}