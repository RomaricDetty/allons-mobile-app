/** Payload compact porté par la notification locale (tout en string pour iOS/Android). */
export type PaymentNotificationStatus = 'success' | 'failed' | 'expired';

export interface PaymentNotificationPayload {
    type: 'payment_status';
    status: PaymentNotificationStatus;
    bookingId: string;
    bookingCode: string;
    routeLabel: string;
    amount: string;
    currency: string;
    provider: string;
    passengerCount: string;
    travelDate: string;
}

export const PAYMENT_NOTIFICATION_TYPE = 'payment_status';
