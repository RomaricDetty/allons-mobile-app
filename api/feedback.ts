import axios, { AxiosResponse } from 'axios';
import { baseUrl } from './config';

/**
 * Étiquettes de feedback (aligné sur le backend)
 */
export enum FeedbackTag {
    ON_TIME = 'ON_TIME',
    CLEAN_BUS = 'CLEAN_BUS',
    COMFORTABLE_SEATS = 'COMFORTABLE_SEATS',
    COURTEOUS_DRIVER = 'COURTEOUS_DRIVER',
    GOOD_SERVICE = 'GOOD_SERVICE',
    VALUE_FOR_MONEY = 'VALUE_FOR_MONEY',
    SMOOTH_RIDE = 'SMOOTH_RIDE',
    GOOD_CONDITIONS = 'GOOD_CONDITIONS',
}

/**
 * DTO pour la création d'un feedback
 */
export interface CreateFeedbackDto {
    bookingId: string;
    departureId?: string;
    rating: number;
    tags?: FeedbackTag[];
    comment?: string;
}

/**
 * Réponse API après création de feedback
 */
export interface FeedbackResponseDto {
    id: string;
    bookingId: string;
    departureId: string;
    rating: number;
    tags?: FeedbackTag[];
    comment?: string;
    submittedAt: string;
    createdAt: string;
    updatedAt?: string;
}

/**
 * Envoie un feedback pour une réservation.
 */
export const createFeedback = async (
    dto: CreateFeedbackDto,
    token: string
): Promise<AxiosResponse<FeedbackResponseDto>> => {
    if (!token?.trim()) {
        throw new Error('Token d\'authentification manquant');
    }
    return axios.post(`${baseUrl}/feedbacks`, dto, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
}
