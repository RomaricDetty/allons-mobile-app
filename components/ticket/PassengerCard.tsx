import { AppButton } from '@/components/ui/AppButton';
import { SeatBadge } from '@/components/ui/SeatBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Passenger {
    firstName: string;
    lastName: string;
    email: string;
    phone: {
        type: string;
        countryCode: string;
        digits: string;
    };
    seatNumber: number;
    id?: string;
    status?: string;
}

interface PassengerCardProps {
    passenger: Passenger;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    backgroundColor: string;
    borderColor: string;
    bookingItemId?: string;
    departureId?: string;
    /** Billet échoué / annulé : bouton bagages inactif */
    baggageDisabled?: boolean;
}

/**
 * Carte passager du billet (siège mis en avant + accès bagages)
 */
export const PassengerCard: React.FC<PassengerCardProps> = ({
    passenger,
    textColor,
    secondaryTextColor,
    primaryBlue,
    backgroundColor,
    borderColor,
    bookingItemId,
    departureId,
    baggageDisabled = false,
}) => {
    const handleBaggagePress = () => {
        if (baggageDisabled) return;
        const itemId = bookingItemId || passenger.id;
        if (!itemId) {
            console.warn('bookingItemId non disponible pour ce passager');
            return;
        }

        router.push({
            pathname: '/trip/luggage-list',
            params: {
                bookingItemId: itemId,
                passengerName: `${passenger.firstName} ${passenger.lastName}`,
            },
        });
    };

    const getStatusColor = (status?: string): string => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED':
                return '#2D7A4F';
            case 'CANCELLED':
            case 'CANCELED':
                return '#C44747';
            case 'PENDING':
                return '#B86E00';
            default:
                return '#9E9E9E';
        }
    };

    const getStatusLabel = (status?: string): string => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED':
                return 'Confirmé';
            case 'CANCELLED':
            case 'CANCELED':
                return 'Annulé';
            case 'PENDING':
                return 'En attente';
            default:
                return status || 'Inconnu';
        }
    };

    const isCancelled =
        passenger.status?.toUpperCase() === 'CANCELLED' ||
        passenger.status?.toUpperCase() === 'CANCELED';

    return (
        <View style={[styles.card, { backgroundColor, borderColor }]}>
            <View style={styles.topRow}>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
                            {passenger.firstName} {passenger.lastName}
                        </Text>
                        {isCancelled && (
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(passenger.status) }]}>
                                <Text style={styles.statusText}>
                                    {getStatusLabel(passenger.status)}
                                </Text>
                            </View>
                        )}
                    </View>
                    {passenger.email ? (
                        <Text style={[styles.detail, { color: secondaryTextColor }]} numberOfLines={1}>
                            {passenger.email}
                        </Text>
                    ) : null}
                    {passenger.phone?.digits ? (
                        <Text style={[styles.detail, { color: secondaryTextColor }]}>
                            {passenger.phone.countryCode} {passenger.phone.digits}
                        </Text>
                    ) : null}
                </View>

                <SeatBadge
                    seatNumber={passenger.seatNumber}
                    primaryBlue={primaryBlue}
                    secondaryTextColor={secondaryTextColor}
                    borderColor={borderColor}
                />
            </View>

            <AppButton
                title="Voir les bagages"
                onPress={handleBaggagePress}
                variant="secondary"
                disabled={baggageDisabled}
                icon={
                    <MaterialCommunityIcons
                        name="bag-suitcase"
                        size={18}
                        color={baggageDisabled ? secondaryTextColor : primaryBlue}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
        gap: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    name: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        flexShrink: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    detail: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 2,
    },
});
