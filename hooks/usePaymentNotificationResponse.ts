import { grantPaymentNotificationScreenAccess } from '@/utils/paymentNotificationGate';
import { isPaymentNotificationPayload } from '@/utils/paymentNotifications';
import { clearPendingPayment } from '@/utils/pendingPayment';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Découpe "Abidjan → Bouaké" (ou avec 3 segments A/R) pour les fallbacks ticket.
 */
const splitRouteCities = (routeLabel?: string): { from?: string; to?: string } => {
    if (!routeLabel) return {};
    const parts = routeLabel.split(/\s*→\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return {};
    return { from: parts[0], to: parts[1] };
};

/**
 * Écoute le tap sur une notification locale de paiement.
 * Succès → ticket ; échec / expiré → écran détail notif.
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

            // Attendre que la nav soit prête (cold start depuis notif)
            InteractionManager.runAfterInteractions(() => {
                setTimeout(async () => {
                    if (data.status === 'success' && data.bookingId) {
                        await clearPendingPayment().catch(() => undefined);
                        const { from, to } = splitRouteCities(data.routeLabel);
                        router.replace({
                            pathname: '/trip/ticket-details',
                            params: {
                                bookingId: data.bookingId,
                                ...(from ? { departureCity: from } : {}),
                                ...(to ? { arrivalCity: to } : {}),
                            },
                        });
                        return;
                    }

                    grantPaymentNotificationScreenAccess();
                    router.replace({
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
                }, 80);
            });
        };

        Notifications.getLastNotificationResponseAsync().then(openFromResponse);

        const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
        return () => sub.remove();
    }, [router]);
}
