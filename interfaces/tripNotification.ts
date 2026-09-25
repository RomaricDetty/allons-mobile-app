export const TRIP_NOTIFICATION_TYPE = 'trip_status' as const;

export type TripNotificationStatus =
    | 'DEPARTED'
    | 'BOARDING'
    | 'DELAYED'
    | 'CANCELLED'
    | 'ARRIVED'
    | 'COMPLETED';

export interface TripNotificationPayload {
    type: typeof TRIP_NOTIFICATION_TYPE;
    status: TripNotificationStatus;
    tripId: string;
    bookingId?: string;
    routeLabel?: string;
}
