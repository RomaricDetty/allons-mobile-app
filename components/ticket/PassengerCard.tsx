import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Interface pour les données d'un passager
 */
interface Passenger {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    seatNumber: number;
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
}) => {
    return (
        <View style={[styles.passengerCard, { backgroundColor, borderColor }]}>
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
});

