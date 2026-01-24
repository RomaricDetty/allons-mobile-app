import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Passenger {
    seatNumber: number | null;
    seatNumberReturn: number | null;
}

interface SelectedSeatsDisplayProps {
    passengers: Passenger[];
    textColor: string;
    secondaryTextColor: string;
}

/**
 * Affichage récapitulatif des sièges sélectionnés
 */
export const SelectedSeatsDisplay = memo<SelectedSeatsDisplayProps>(({
    passengers,
    textColor,
    secondaryTextColor
}) => {
    const hasSelectedSeats = useMemo(() => {
        return passengers.some(p => p.seatNumber) || passengers.some(p => p.seatNumberReturn);
    }, [passengers]);

    if (!hasSelectedSeats) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: textColor }]}>
                Sièges sélectionnés :
            </Text>
            {passengers.map((passenger, index) => {
                const hasOutboundSeat = passenger.seatNumber !== null;
                const hasReturnSeat = passenger.seatNumberReturn !== null;

                if (hasOutboundSeat || hasReturnSeat) {
                    return (
                        <View key={index} style={styles.item}>
                            <Text style={[styles.text, { color: secondaryTextColor }]}>
                                Passager {index + 1}:
                                {hasOutboundSeat && ` Voyage aller • Siège ${passenger.seatNumber}`}
                                {hasOutboundSeat && hasReturnSeat && ' |'}
                                {hasReturnSeat && ` Voyage retour • Siège ${passenger.seatNumberReturn}`}
                            </Text>
                        </View>
                    );
                }
                return null;
            })}
        </View>
    );
});

SelectedSeatsDisplay.displayName = 'SelectedSeatsDisplay';

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        paddingTop: 16,
        // borderTopWidth: 1,
        // borderTopColor: '#E0E0E0',
    },
    title: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    item: {
        marginBottom: 4,
    },
    text: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
});
