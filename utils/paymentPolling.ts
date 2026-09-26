import { getBookingPaymentStatus } from '@/api/booking';
import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_MAX_MS } from '@/constants/payment';
import { BookingPaymentStatusResponse } from '@/interfaces/payment';
import { parsePaymentDeepLink } from '@/utils/paymentDeepLink';

export type PaymentPollOutcome =
    | { kind: 'succeeded'; status: BookingPaymentStatusResponse }
    | { kind: 'failed'; status: BookingPaymentStatusResponse }
    | { kind: 'expired'; status: BookingPaymentStatusResponse }
    | { kind: 'still_pending'; status: BookingPaymentStatusResponse | null }
    | { kind: 'cancelled'; status: BookingPaymentStatusResponse | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const classifyPaymentStatuses = (
    bookingStatus?: string | null,
    paymentStatus?: string | null
): 'succeeded' | 'failed' | 'expired' | 'pending' => {
    const booking = (bookingStatus || '').toUpperCase();
    const payment = (paymentStatus || '').toUpperCase();

    if (booking === 'PAID' || payment === 'SUCCEEDED') return 'succeeded';
    if (booking === 'FAILED' || payment === 'FAILED') return 'failed';
    if (booking === 'EXPIRED' || payment === 'EXPIRED') return 'expired';
    return 'pending';
};

/**
 * Poll le statut de paiement jusqu'à SUCCEEDED / FAILED / EXPIRED ou fin de fenêtre.
 * Timeout ≠ échec : retourne still_pending pour laisser l'utilisateur réessayer.
 */
export const pollBookingPaymentStatus = async (
    bookingId: string,
    options?: {
        token?: string;
        expiresAt?: string | null;
        intervalMs?: number;
        maxMs?: number;
        signal?: { cancelled: boolean };
        onTick?: (status: BookingPaymentStatusResponse) => void;
    }
): Promise<PaymentPollOutcome> => {
    const intervalMs = options?.intervalMs ?? PAYMENT_POLL_INTERVAL_MS;
    const startedAt = Date.now();
    const maxMs = options?.expiresAt
        ? Math.max(Date.parse(options.expiresAt) - startedAt, intervalMs)
        : (options?.maxMs ?? PAYMENT_POLL_MAX_MS);

    let lastStatus: BookingPaymentStatusResponse | null = null;

    while (Date.now() - startedAt < maxMs) {
        if (options?.signal?.cancelled) {
            return { kind: 'cancelled', status: lastStatus };
        }

        try {
            const response = await getBookingPaymentStatus(bookingId, options?.token);
            lastStatus = response.data;
            options?.onTick?.(lastStatus);

            const outcome = classifyPaymentStatuses(
                lastStatus.bookingStatus,
                lastStatus.payment?.status
            );

            if (outcome === 'succeeded') {
                return { kind: 'succeeded', status: lastStatus };
            }
            if (outcome === 'failed') {
                return { kind: 'failed', status: lastStatus };
            }
            if (outcome === 'expired') {
                return { kind: 'expired', status: lastStatus };
            }
        } catch (error) {
            console.warn('Polling payment-status échoué, nouvel essai…', error);
        }

        await sleep(intervalMs);
    }

    if (options?.signal?.cancelled) {
        return { kind: 'cancelled', status: lastStatus };
    }

    return { kind: 'still_pending', status: lastStatus };
};

/**
 * Un seul check de statut (reprise / bouton « Vérifier »).
 */
export const fetchBookingPaymentOutcome = async (
    bookingId: string,
    token?: string
): Promise<PaymentPollOutcome> => {
    try {
        const response = await getBookingPaymentStatus(bookingId, token);
        const status = response.data;
        const outcome = classifyPaymentStatuses(status.bookingStatus, status.payment?.status);
        if (outcome === 'succeeded') return { kind: 'succeeded', status };
        if (outcome === 'failed') return { kind: 'failed', status };
        if (outcome === 'expired') return { kind: 'expired', status };
        return { kind: 'still_pending', status };
    } catch (error) {
        console.warn('fetchBookingPaymentOutcome échoué:', error);
        return { kind: 'still_pending', status: null };
    }
};

/**
 * Indique si une URL de retour correspond au succès ou à l'échec paiement.
 */
export const classifyPaymentReturnUrl = (url: string): 'success' | 'error' | 'unknown' =>
    parsePaymentDeepLink(url).kind;
