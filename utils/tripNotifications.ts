import { TRIP_NOTIFICATION_TYPE, TripNotificationStatus } from '@/interfaces/tripNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureLocalNotificationPermissions } from '@/utils/paymentNotifications';

const LAST_TRIP_STATUS_KEY = '@allon/trip_status_notified';

const STATUS_COPY: Record<
    TripNotificationStatus,
    { title: string; body: (route: string) => string }
> = {
    DEPARTED: {
        title: 'Trajet démarré',
        body: (route) => `Votre trajet ${route} a démarré. Suivez le bus en direct.`,
    },
    BOARDING: {
        title: 'Embarquement en cours',
        body: (route) => `L’embarquement a commencé pour ${route}.`,
    },
    DELAYED: {
        title: 'Trajet retardé',
        body: (route) => `Votre trajet ${route} est retardé. Vérifiez les horaires.`,
    },
    CANCELLED: {
        title: 'Trajet annulé',
        body: (route) => `Votre trajet ${route} a été annulé.`,
    },
    ARRIVED: {
        title: 'Trajet terminé',
        body: (route) => `Votre trajet ${route} est terminé. Bonne arrivée !`,
    },
    COMPLETED: {
        title: 'Trajet terminé',
        body: (route) => `Votre trajet ${route} est terminé. Bonne arrivée !`,
    },
};

/**
 * Normalise un statut trajet (API / socket) vers un statut notifiable.
 */
export const normalizeTripNotificationStatus = (
    raw: unknown
): TripNotificationStatus | null => {
    const key = String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (key === 'DEPARTED' || key === 'IN_PROGRESS' || key === 'STARTED') return 'DEPARTED';
    if (key === 'BOARDING') return 'BOARDING';
    if (key === 'DELAYED' || key === 'DELAY') return 'DELAYED';
    if (key === 'CANCELLED' || key === 'CANCELED') return 'CANCELLED';
    if (key === 'ARRIVED' || key === 'COMPLETED' || key === 'FINISHED') {
        return key === 'ARRIVED' ? 'ARRIVED' : 'COMPLETED';
    }
    return null;
};

const readNotifiedMap = async (): Promise<Record<string, string>> => {
    try {
        const raw = await AsyncStorage.getItem(LAST_TRIP_STATUS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeNotifiedMap = async (map: Record<string, string>) => {
    await AsyncStorage.setItem(LAST_TRIP_STATUS_KEY, JSON.stringify(map));
};

/**
 * Envoie une notification locale si le statut du trajet a changé (anti-doublon).
 */
export const notifyTripStatusLocally = async (params: {
    tripId: string;
    status: unknown;
    routeLabel?: string;
    bookingId?: string;
}): Promise<string | null> => {
    const status = normalizeTripNotificationStatus(params.status);
    if (!status || !params.tripId) return null;

    const map = await readNotifiedMap();
    const previous = map[params.tripId];
    if (previous === status) return null;

    map[params.tripId] = status;
    await writeNotifiedMap(map);

    const allowed = await ensureLocalNotificationPermissions();
    if (!allowed) return null;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('trip-status', {
            name: 'Statut du trajet',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1776BA',
        });
    }

    const route = params.routeLabel?.trim() || 'votre trajet';
    const copy = STATUS_COPY[status];

    return Notifications.scheduleNotificationAsync({
        content: {
            title: copy.title,
            body: copy.body(route),
            data: {
                type: TRIP_NOTIFICATION_TYPE,
                status,
                tripId: params.tripId,
                bookingId: params.bookingId || '',
                routeLabel: route,
            },
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: 'trip-status' } : {}),
        },
        trigger: null,
    });
};
