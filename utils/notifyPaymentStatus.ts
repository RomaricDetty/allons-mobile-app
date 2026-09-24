import { PaymentNotificationStatus } from '@/interfaces/paymentNotification';
import { getPendingPayment } from '@/utils/pendingPayment';
import {
    buildPaymentNotificationPayload,
    schedulePaymentStatusNotification,
} from '@/utils/paymentNotifications';

/**
 * Notifie localement le statut de paiement avec les détails de réservation.
 */
export const notifyPaymentStatusLocally = async (
    status: PaymentNotificationStatus,
    bookingId: string
): Promise<void> => {
    try {
        const pending = await getPendingPayment();
        const payload = buildPaymentNotificationPayload(status, pending, bookingId);
        await schedulePaymentStatusNotification(payload);
    } catch (error) {
        console.warn('Impossible d’envoyer la notification locale de paiement:', error);
    }
};
