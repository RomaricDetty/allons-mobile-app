// @ts-nocheck
import { formatBookingDate, formatStatus, getStatusColor } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { Booking } from '@/interfaces';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface BookingCardProps {
    booking: Booking;
}

/**
 * Construit la date d'arrivée prévue : jour du départ + heure d'arrivée ;
 * si l'heure d'arrivée est avant celle du départ sur la même journée, l'arrivée est le lendemain.
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

/**
 * Composant carte de réservation avec toutes les informations et actions
 */
export const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
    const colors = useAppColors();
    const navigation = useNavigation();

    /** Ouvre l’écran détails du ticket (l’API est appelée sur l’écran ticket-details) */
    const handleViewBooking = useCallback(() => {
        navigation.navigate('trip/ticket-details' as never, { bookingId: booking.id } as never);
    }, [booking.id, navigation]);

    /** Indique si l'heure d'arrivée prévue est déjà passée (bouton Itinéraire masqué). */
    const isArrivalPast = (() => {
        const arrival = getScheduledArrivalDate(booking);
        if (arrival) return arrival.getTime() < Date.now();
        return booking.departureDateTime
            ? new Date(booking.departureDateTime).getTime() < Date.now()
            : false;
    })();

    /** Afficher le bouton Itinéraire uniquement si non annulé, trajet parti et arrivée pas encore passée. */
    const showItineraryButton = booking.status !== 'CANCELLED' && !isArrivalPast && booking.departure.status === 'DEPARTED';

    return (
        <View style={[styles.bookingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {/* Route et date */}
            <View style={styles.bookingHeader}>
                <Text style={[styles.routeText, { color: colors.text }]}>
                    {booking?.trip?.stationFrom?.city} → {booking?.trip?.stationTo?.city}
                </Text>
                <Text style={[styles.dateText, { color: colors.secondaryText }]}>
                    {formatBookingDate(booking.departureDateTime)}
                </Text>
                <Text style={[styles.timeText, { color: colors.secondaryText }]}>
                    {booking?.departureTime} - {booking?.arrivalTime}
                </Text>
            </View>

            {/* Compagnie et passagers */}
            <View style={styles.bookingInfo}>
                <Text style={[styles.companyText, { color: colors.text }]}>{booking.companyName}</Text>
                <Text style={[styles.passengersText, { color: colors.secondaryText }]}>
                    {booking?.passengers?.length} passager(s)
                </Text>
            </View>

            {/* Référence, prix et statut */}
            <View style={styles.bookingFooter}>
                <Text style={[styles.referenceText, { color: colors.secondaryText }]}>Réf: {booking.code}</Text>
                <View style={styles.priceStatusContainer}>
                    <Text style={[styles.priceText, { color: colors.activeTabColor }]}>
                        {parseFloat(booking.totalAmount).toLocaleString('fr-FR')} {booking.currency}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status || '') }]}>
                        <Text style={styles.statusBadgeText}>{formatStatus(booking.status || '')}</Text>
                    </View>
                </View>
            </View>

            {/* Boutons d'action */}
            <View style={styles.actionButtons}>
                <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.activeTabColor, borderColor: colors.activeTabColor }]}
                    onPress={handleViewBooking}
                >
                    <MaterialCommunityIcons name="eye-outline" size={20} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Ticket</Text>
                </Pressable>
                {showItineraryButton && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: 'transparent', borderColor: colors.border }]}
                        onPress={() => {
                            navigation.navigate('trip/route-viewer' as never, { booking: JSON.stringify(booking) } as never);
                        }}
                    >
                        <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.secondaryText} />
                        <Text style={[styles.actionButtonText, { color: colors.secondaryText }]}>Itinéraire</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bookingCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    bookingHeader: {
        marginBottom: 12,
    },
    routeText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    bookingInfo: {
        marginBottom: 12,
    },
    companyText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    passengersText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    referenceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
    priceStatusContainer: {
        alignItems: 'flex-end',
        gap: 8,
    },
    priceText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        minHeight: 44,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});
