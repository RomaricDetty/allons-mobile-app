import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Interface pour les données d'un passager
 */
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
    id?: string; // ID du booking item (bookingItemId)
    status?: string; // Statut du passager (CONFIRMED, CANCELLED, etc.)
}

/**
 * Interface pour les props du composant PassengerCard
 */
interface PassengerCardProps {
    passenger: Passenger;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    backgroundColor: string;
    borderColor: string;
    bookingItemId?: string; // ID du booking item pour récupérer les bagages
    departureId?: string; // ID du départ pour récupérer les feedbacks
}

/**
 * Composant pour afficher les informations d'un passager
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
}) => {
    /**
     * Navigue vers l'écran de liste des bagages du passager
     */
    const handleBaggagePress = () => {
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

    /**
     * Retourne la couleur du badge de statut selon le statut du passager
     */
    const getStatusColor = (status?: string): string => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED':
                return '#4CAF50'; // Vert
            case 'CANCELLED':
                return '#F44336'; // Rouge
            case 'PENDING':
                return '#FF9800'; // Orange
            default:
                return '#9E9E9E'; // Gris
        }
    };

    /**
     * Formate le libellé du statut
     */
    const getStatusLabel = (status?: string): string => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED':
                return 'Confirmé';
            case 'CANCELLED':
                return 'Annulé';
            case 'PENDING':
                return 'En attente';
            default:
                return status || 'Inconnu';
        }
    };

    /**
     * Navigue vers l'écran de feedback du passager
     */
    const handleFeedbackPress = () => {
        router.push({
            pathname: '/trip/feedback-passenger',
            params: { bookingItemId: bookingItemId, departureId: departureId },
        });
    };

    return (
        <>
            <View style={[styles.passengerCard, { backgroundColor, borderColor, flexDirection: 'column', alignItems: 'flex-start', gap: 15 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <View style={styles.passengerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.passengerName, { color: textColor }]}>
                                {passenger.firstName} {passenger.lastName}
                            </Text>
                            {passenger.status && (passenger.status.toUpperCase() === 'CANCELLED' || passenger.status.toUpperCase() === 'CANCELED') && (
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(passenger.status) }]}>
                                    <Text style={styles.statusText}>
                                        {getStatusLabel(passenger.status)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {passenger.email && (
                            <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                {passenger.email}
                            </Text>
                        )}
                        {passenger.phone && (
                            <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                {passenger.phone?.countryCode} {passenger.phone?.digits}
                            </Text>
                        )}
                    </View>
                    <View style={styles.seatInfo}>
                        <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>Siège</Text>
                        <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                            {passenger.seatNumber}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 18 }}>
                    <Pressable
                        onPress={handleBaggagePress}
                        style={styles.baggageButton}
                    >
                        <MaterialCommunityIcons name="bag-suitcase" size={20} color={primaryBlue} />
                        <Text style={[styles.baggageButtonText, { color: primaryBlue }]}>
                            Voir les bagages
                        </Text>
                    </Pressable>
                </View>
            </View>

        </>
    );
};

const styles = StyleSheet.create({
    passengerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
    },
    passengerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    passengerName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    passengerDetail: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 2,
    },
    seatInfo: {
        alignItems: 'flex-end',
    },
    seatLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    seatNumber: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    baggageButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 8,
        // padding: 12,
        backgroundColor: 'rgba(23, 118, 186, 0.1)',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        // width: '100%',
        // height: '100%',
    },
    baggageButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    baggageButtonIcon: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    feedbackButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#1776BA',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        gap: 8,
    },
    feedbackButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#FFFFFF',
    },
    feedbackButtonIcon: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#FFFFFF',
    },
});

