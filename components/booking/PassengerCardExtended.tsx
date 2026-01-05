import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Interface pour les données d'un passager
 */
interface Passenger {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    seatNumber?: number | null;
    seatNumberReturn?: number | null;
}

/**
 * Interface pour les props du composant
 */
interface PassengerCardExtendedProps {
    passenger: Passenger;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    backgroundColor: string;
    borderColor: string;
    seatNumber?: number | null;
}

/**
 * Composant pour afficher les informations d'un passager avec siège optionnel
 */
export const PassengerCardExtended = memo<PassengerCardExtendedProps>(({
    passenger,
    textColor,
    secondaryTextColor,
    primaryBlue,
    backgroundColor,
    borderColor,
    seatNumber,
}) => {
    const hasSeat = seatNumber !== null && seatNumber !== undefined;

    return (
        <View style={[styles.passengerCard, { backgroundColor, borderColor }]}>
            <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, { color: textColor }]}>
                    {passenger.firstName} {passenger.lastName}
                </Text>
                {passenger.email && (
                    <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                        {passenger.email}
                    </Text>
                )}
                {passenger.phone && (
                    <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                        {passenger.phone}
                    </Text>
                )}
            </View>
            {hasSeat && (
                <View style={styles.seatInfo}>
                    <View style={styles.seatInfoItem}>
                        <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>
                            Siège
                        </Text>
                        <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                            {seatNumber}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
});

PassengerCardExtended.displayName = 'PassengerCardExtended';

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
    seatInfoItem: {
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




