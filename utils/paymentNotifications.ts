import {
    PAYMENT_NOTIFICATION_TYPE,
    PaymentNotificationPayload,
    PaymentNotificationStatus,
    } from '@/interfaces/paymentNotification';
import { PendingPaymentSession } from '@/interfaces/payment';
import * as Notifications from 'expo-notifications';
import { Platform,
} from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

let permissionsReady: Promise<boolean> | null = null;

/**
 * Demande (une fois) l'autorisation des notifications locales.
 */
export const ensureLocalNotificationPermissions = async (): Promise<boolean> => {
    if (!permissionsReady) {
        permissionsReady = (async () => {
            if (Platform.OS === 'web') return false;

            const current = await Notifications.getPermissionsAsync();
            if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
                return true;
            }

            const requested = await Notifications.requestPermissionsAsync();
            return (
                requested.granted ||
                requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
            );
        })();
    }
    return permissionsReady;
};

const asRecord = (value: unknown): Record<string, any> =>
    value && typeof value === 'object' ? (value as Record<string, any>) : {};

/**
 * Construit un payload léger à partir de la session de paiement / booking.
 */
export const buildPaymentNotificationPayload = (
    status: PaymentNotificationStatus,
    session: PendingPaymentSession | null,
    bookingId: string
): PaymentNotificationPayload => {
    const trip = asRecord(session?.trip);
    const returnTrip = asRecord(session?.returnTrip);
    const booking = asRecord(session?.bookingResponse);
    const payment = asRecord(session?.paymentInitResponse);
    const passengers = Array.isArray(session?.passengers) ? session!.passengers : [];

    const from =
        trip.stationFrom?.city ||
        trip.fromCity ||
        trip.originCity ||
        trip.departureCity ||
        '';
    const to =
        trip.stationTo?.city ||
        trip.toCity ||
        trip.destinationCity ||
        trip.arrivalCity ||
        '';
    const returnTo =
        returnTrip.stationTo?.city ||
        returnTrip.toCity ||
        returnTrip.destinationCity ||
        '';

    const routeLabel = [from, to, returnTo].filter(Boolean).join(' → ') || 'Votre trajet';

    const bookingCode =
        booking.code ||
        booking.bookingCode ||
        booking.newBooking?.code ||
        booking.reference ||
        bookingId.slice(0, 8).toUpperCase();

    const amount =
        String(
            payment.amount ??
            session?.feesAndTaxes?.totalAmount ??
            booking.totalAmount ??
            ''
        ) || '—';

    const currency = String(payment.currency || trip.currency || 'XOF');
    const provider = String(payment.provider || booking.paymentProvider || 'Mobile Money');

    const travelDateRaw =
        trip.departureDateTime ||
        trip.departureDate ||
        trip.date ||
        '';
    let travelDate = '';
    if (travelDateRaw) {
        const d = new Date(travelDateRaw);
        travelDate = Number.isNaN(d.getTime())
            ? String(travelDateRaw)
            : d.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
    }

    return {
        type: PAYMENT_NOTIFICATION_TYPE,
        status,
        bookingId,
        bookingCode: String(bookingCode),
        routeLabel,
        amount,
        currency,
        provider,
        passengerCount: String(passengers.length || 1),
        travelDate,
    };
};

const titleForStatus = (status: PaymentNotificationStatus): string => {
    switch (status) {
        case 'success':
            return 'Paiement confirmé';
        case 'failed':
            return 'Paiement échoué';
        case 'expired':
            return 'Session de paiement expirée';
        default:
            return 'Statut du paiement';
    }
};

const bodyForPayload = (payload: PaymentNotificationPayload): string => {
    const amountLabel =
        payload.amount && payload.amount !== '—'
            ? `${payload.amount} ${payload.currency}`
            : payload.currency;

    if (payload.status === 'success') {
        return `${payload.routeLabel} · ${amountLabel} · Réf. ${payload.bookingCode}`;
    }
    if (payload.status === 'expired') {
        return `Votre session pour ${payload.routeLabel} a expiré. Réf. ${payload.bookingCode}`;
    }
    return `Le paiement pour ${payload.routeLabel} n’a pas abouti. Réf. ${payload.bookingCode}`;
};

/**
 * Envoie une notification locale immédiate avec le détail compact de la réservation.
 */
export const schedulePaymentStatusNotification = async (
    payload: PaymentNotificationPayload
): Promise<string | null> => {
    const allowed = await ensureLocalNotificationPermissions();
    if (!allowed) {
        console.warn('Notifications locales non autorisées');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('payment-status', {
            name: 'Statut de paiement',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1776BA',
        });
    }

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: titleForStatus(payload.status),
            body: bodyForPayload(payload),
            data: { ...payload },
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: 'payment-status' } : {}),
        },
        trigger: null,
    });

    return id;
};

export const isPaymentNotificationPayload = (
    data: unknown
): data is PaymentNotificationPayload => {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
        d.type === PAYMENT_NOTIFICATION_TYPE &&
        typeof d.bookingId === 'string' &&
        typeof d.status === 'string'
    );
};
