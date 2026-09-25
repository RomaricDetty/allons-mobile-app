import { useAuth } from '@/contexts/AuthContext';
import { busTrackingService } from '@/services/busTrackingService';
import { getAuthToken } from '@/utils/storage';
import { notifyTripStatusLocally } from '@/utils/tripNotifications';
import { useEffect, useRef } from 'react';

const asRecord = (value: unknown): Record<string, any> =>
    value && typeof value === 'object' ? (value as Record<string, any>) : {};

/**
 * Écoute les mises à jour trajet (socket) et envoie des push in-app
 * quand le chauffeur démarre, retarde, annule ou termine le trajet.
 */
export function useTripStatusNotifications(enabled: boolean = true) {
    const { user } = useAuth();
    const attachedRef = useRef(false);

    useEffect(() => {
        if (!enabled || !user) return;

        let cancelled = false;

        const handleTripUpdate = (message: any) => {
            const trip = asRecord(message?.data?.trip ?? message?.data);
            const tripId = String(trip.id || trip.tripId || '').trim();
            const status = trip.status || trip.departureStatus || trip.state;
            if (!tripId || !status) return;

            const from =
                trip.stationFrom?.city ||
                trip.departureCity ||
                trip.originCity ||
                trip.fromCity ||
                '';
            const to =
                trip.stationTo?.city ||
                trip.arrivalCity ||
                trip.destinationCity ||
                trip.toCity ||
                '';
            const routeLabel =
                [from, to].filter(Boolean).join(' → ') ||
                trip.route ||
                trip.label ||
                'votre trajet';

            void notifyTripStatusLocally({
                tripId,
                status,
                routeLabel,
                bookingId: String(trip.bookingId || ''),
            });
        };

        const start = async () => {
            if (attachedRef.current) return;
            attachedRef.current = true;
            busTrackingService.on('trip_update', handleTripUpdate);

            const token = await getAuthToken();
            if (cancelled || !token) return;
            await busTrackingService.connect('', '', token);
        };

        void start();

        return () => {
            cancelled = true;
            attachedRef.current = false;
            busTrackingService.off('trip_update', handleTripUpdate);
        };
    }, [enabled, user]);
}
