import { grantPaymentNotificationScreenAccess } from '@/utils/paymentNotificationGate';
import { isPaymentNotificationPayload } from '@/utils/paymentNotifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Écoute le tap sur une notification locale de paiement et ouvre
 * l'écran dédié (uniquement via ce chemin).
 */
export function usePaymentNotificationResponse() {
    const router = useRouter();
    const handledResponseIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const openFromResponse = (response: Notifications.NotificationResponse | null) => {
            if (!response) return;

            const responseId = response.notification.request.identifier;
            if (handledResponseIds.current.has(responseId)) return;
            handledResponseIds.current.add(responseId);

            const data = response.notification.request.content.data;
            if (!isPaymentNotificationPayload(data)) return;

            grantPaymentNotificationScreenAccess();
            router.push({
                pathname: '/notification/payment-status',
                params: {
                    status: data.status,
                    bookingId: data.bookingId,
                    bookingCode: data.bookingCode,
                    routeLabel: data.routeLabel,
                    amount: data.amount,
                    currency: data.currency,
                    provider: data.provider,
                    passengerCount: data.passengerCount,
                    travelDate: data.travelDate,
                },
            });
        };

        Notifications.getLastNotificationResponseAsync().then(openFromResponse);

        const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
        return () => sub.remove();
    }, [router]);
}
