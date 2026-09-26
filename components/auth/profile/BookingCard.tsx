// @ts-nocheck
import { AppButton } from '@/components/ui/AppButton';
import { formatBookingDate, formatStatus } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { Booking } from '@/interfaces';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface BookingCardProps {
    booking: Booking;
}

/**
 * Construit la date d'arrivée prévue : jour du départ + heure d'arrivée ;
 * si l'heure d'arrivée est avant celle du départ, l'arrivée est le lendemain.
 */
function getScheduledArrivalDate(booking: Booking): Date | null {
    if (!booking.departureDateTime || !booking.arrivalTime?.trim()) return null;

    const departure = new Date(booking.departureDateTime);
    if (Number.isNaN(departure.getTime())) return null;

    const arrivalParts = booking.arrivalTime.trim().split(':').map(Number);
    const arrH = arrivalParts[0];
    const arrM = arrivalParts[1] ?? 0;
    if (!Number.isFinite(arrH) || !Number.isFinite(arrM)) return null;

    const depParts = (booking.departureTime || '0:0').trim().split(':').map(Number);
    const depH = depParts[0] ?? 0;
    const depM = depParts[1] ?? 0;

    const arrival = new Date(departure);
    arrival.setHours(arrH, arrM, 0, 0);

    const depMinutes = depH * 60 + depM;
    const arrMinutes = arrH * 60 + arrM;
    if (arrMinutes < depMinutes) {
        arrival.setDate(arrival.getDate() + 1);
    }

    return arrival;
}

function getStatusTone(status: string, colors: ReturnType<typeof useAppColors>) {
    const key = (status || '').toUpperCase();
    if (['PAID', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'USED'].includes(key)) {
        return { backgroundColor: colors.successMuted, color: colors.success };
    }
    if (['PENDING', 'PROCESSING'].includes(key)) {
        return { backgroundColor: 'rgba(184, 110, 0, 0.12)', color: '#B86E00' };
    }
    if (['CANCELLED', 'CANCELED', 'FAILED'].includes(key)) {
        return { backgroundColor: colors.dangerMuted, color: colors.danger };
    }
    if (key === 'REFUNDED') {
        return { backgroundColor: colors.infoMuted, color: colors.activeTabColor };
    }
    return { backgroundColor: colors.inputBackground, color: colors.secondaryText };
}

/** Paiement encore finalisable (en attente / en cours uniquement). */
function canFinalizePayment(status?: string): boolean {
    const key = (status || '').toUpperCase();
    return key === 'PENDING' || key === 'PROCESSING';
}

/**
 * Carte de réservation — hiérarchie route / horaire / prix / actions
 */
export const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
    const colors = useAppColors();
    const navigation = useNavigation();

    const handleViewBooking = useCallback(() => {
        navigation.navigate('trip/ticket-details' as never, {
            bookingId: booking.id,
            departureCity: booking.trip?.stationFrom?.city ?? '',
            arrivalCity: booking.trip?.stationTo?.city ?? '',
        } as never);
    }, [booking.id, booking.trip?.stationFrom?.city, booking.trip?.stationTo?.city, navigation]);

    const isArrivalPast = useMemo(() => {
        const arrival = getScheduledArrivalDate(booking);
        if (arrival) return arrival.getTime() < Date.now();
        return booking.departureDateTime
            ? new Date(booking.departureDateTime).getTime() < Date.now()
            : false;
    }, [booking]);

    const showItineraryButton =
        booking.status !== 'CANCELLED' &&
        !isArrivalPast &&
        booking.departure?.status === 'DEPARTED';

    const statusTone = getStatusTone(booking.status || '', colors);
    const fromCity = booking?.trip?.stationFrom?.city || '—';
    const toCity = booking?.trip?.stationTo?.city || '—';
    const passengerCount = booking?.passengers?.length ?? 0;
    const showFinalizePayment = canFinalizePayment(booking.status);

    return (
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.topRow}>
                <View style={styles.routeBlock}>
                    <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={2}>
                        {fromCity} → {toCity}
                    </Text>
                    <Text style={[styles.scheduleText, { color: colors.secondaryText }]} numberOfLines={2}>
                        {formatBookingDate(booking.departureDateTime)}
                        {booking?.departureTime || booking?.arrivalTime
                            ? ` · ${booking?.departureTime || '—'} – ${booking?.arrivalTime || '—'}`
                            : ''}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusTone.backgroundColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusTone.color }]}>
                        {formatStatus(booking.status || '')}
                    </Text>
                </View>
            </View>

            <View style={[styles.metaBlock, { borderColor: colors.border }]}>
                <View style={styles.metaRow}>
                    <View style={styles.metaIcon}>
                        <MaterialCommunityIcons name="bus" size={18} color={colors.activeTabColor} />
                    </View>
                    <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                        {booking.companyName || '—'}
                    </Text>
                </View>
                <View style={styles.metaRow}>
                    <View style={styles.metaIcon}>
                        <MaterialCommunityIcons name="account-group" size={18} color={colors.activeTabColor} />
                    </View>
                    <Text style={[styles.metaText, { color: colors.secondaryText }]}>
                        {passengerCount} passager{passengerCount > 1 ? 's' : ''}
                    </Text>
                </View>
                <Text style={[styles.referenceText, { color: colors.secondaryText }]} numberOfLines={1}>
                    Réf. {booking.code}
                </Text>
            </View>

            <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.secondaryText }]}>Total</Text>
                <Text style={[styles.priceText, { color: colors.activeTabColor }]}>
                    {parseFloat(booking.totalAmount || '0').toLocaleString('fr-FR')} {booking.currency}
                </Text>
            </View>

            <View style={styles.actions}>
                {showFinalizePayment ? (
                    <AppButton
                        title="Finaliser le paiement"
                        onPress={() => {
                            navigation.navigate('payment/success' as never, {
                                bookingId: booking.id,
                                recovered: '1',
                            } as never);
                        }}
                        icon={<MaterialCommunityIcons name="wallet-outline" size={18} color="#FFFFFF" />}
                    />
                ) : null}
                <AppButton
                    title="Voir le ticket"
                    onPress={handleViewBooking}
                    variant={showFinalizePayment ? 'secondary' : 'primary'}
                    icon={
                        <MaterialCommunityIcons
                            name="ticket-confirmation"
                            size={18}
                            color={showFinalizePayment ? colors.activeTabColor : '#FFFFFF'}
                        />
                    }
                />
                {showItineraryButton && (
                    <AppButton
                        title="Itinéraire"
                        onPress={() => {
                            navigation.navigate(
                                'trip/route-viewer' as never,
                                { booking: JSON.stringify(booking) } as never,
                            );
                        }}
                        variant="secondary"
                        icon={
                            <MaterialCommunityIcons
                                name="map-marker-path"
                                size={18}
                                color={colors.activeTabColor}
                            />
                        }
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        gap: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    routeBlock: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    routeText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        lineHeight: 24,
    },
    scheduleText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
    },
    metaBlock: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        gap: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    metaIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    referenceText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 2,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
    },
    priceLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    priceText: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
    },
    actions: {
        gap: 10,
    },
});
