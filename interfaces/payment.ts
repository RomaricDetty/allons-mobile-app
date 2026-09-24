/** Canal de paiement / réservation côté app mobile. */
export type PaymentChannel = 'MOBILE_APP';

/** Méthodes autorisées depuis l'app (pas CASH / POS). */
export type AppPaymentMethod = 'MOBILE_MONEY' | 'ALLON_COIN';

/** Wallets Mobile Money (provider Allon). */
export type MobileMoneyProvider = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MONEY';

export type BookingPaymentStatus =
    | 'PENDING'
    | 'PAID'
    | 'FAILED'
    | 'EXPIRED'
    | 'SUCCEEDED';

export interface PayBookingRequest {
    bookingId: string;
    method: AppPaymentMethod | string;
    amount: number;
    channel: PaymentChannel;
    currency?: string;
    provider?: MobileMoneyProvider | string | null;
    rawPayload?: {
        PaymentInfo?: {
            phoneNumber?: string;
        };
        [key: string]: unknown;
    };
}

export interface PayBookingResponse {
    status: string;
    bookingId: string;
    bookingStatus?: string;
    paymentId?: string;
    paymentStatus?: string;
    redirectUrl?: string | null;
    expiresAt?: string | null;
    amount?: number;
    currency?: string;
    method?: string;
    provider?: string;
    [key: string]: unknown;
}

export interface BookingPaymentStatusResponse {
    bookingId: string;
    bookingStatus: string;
    payment?: {
        id?: string;
        status?: string;
        paymentUrl?: string | null;
        expiresAt?: string | null;
        provider?: string;
        gatewayCode?: string;
        [key: string]: unknown;
    } | null;
    [key: string]: unknown;
}

/** Contexte local conservé pendant le checkout PSP. */
export interface PendingPaymentSession {
    bookingId: string;
    paymentId?: string;
    expiresAt?: string | null;
    bookingResponse: unknown;
    paymentInitResponse: PayBookingResponse;
    trip: unknown;
    returnTrip: unknown;
    passengers: unknown[];
    searchParams: unknown;
    rebookingCode?: string;
    emergencyContact?: unknown;
    feesAndTaxes?: {
        feesTotal?: number;
        taxesTotal?: number;
        totalAmount?: number;
        [key: string]: unknown;
    };
    createdAt: string;
    /** Phase locale pour reprise après kill / appel / reload. */
    phase?: 'checkout' | 'verifying';
    updatedAt?: string;
}
