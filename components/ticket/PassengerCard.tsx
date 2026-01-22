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
    phone: string;
    seatNumber: number;
    id?: string; // ID du booking item (bookingItemId)
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

    return (
        <>
            <View style={[styles.passengerCard, { backgroundColor, borderColor, flexDirection: 'column', alignItems: 'flex-start', gap: 15}]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.passengerInfo}>
                        <Text style={[styles.passengerName, { color: textColor }]}>
                            {passenger.firstName} {passenger.lastName}
                        </Text>
                        <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                            {passenger.email}
                        </Text>
                        <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                            {passenger.phone}
                        </Text>
                    </View>
                    <View style={styles.seatInfo}>
                        <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>Siège</Text>
                        <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                            {passenger.seatNumber}
                        </Text>
                    </View>
                </View>
                <Pressable
                    onPress={handleBaggagePress}
                    style={styles.baggageButton}
                >
                    <Text style={[styles.baggageButtonText, { color: primaryBlue }]}>
                        Bagages
                    </Text>
                    <MaterialCommunityIcons name="bag-suitcase" size={20} color={primaryBlue} />
                </Pressable>
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
    passengerName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
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
});

