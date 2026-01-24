import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Passenger {
    seatNumber: number | null;
    seatNumberReturn: number | null;
}

interface SeatSelectionButtonProps {
    leg: 'OUTBOUND' | 'RETURN';
    passengers: Passenger[];
    onPress: (leg: 'OUTBOUND' | 'RETURN') => void;
    cardBackgroundColor: string;
    borderColor: string;
    tintColor: string;
    textColor: string;
    secondaryTextColor: string;
    iconColor: string;
    style?: any;
}

/**
 * Bouton pour ouvrir la sélection de sièges (aller ou retour)
 */
export const SeatSelectionButton = memo<SeatSelectionButtonProps>(({
    leg,
    passengers,
    onPress,
    cardBackgroundColor,
    borderColor,
    tintColor,
    textColor,
    secondaryTextColor,
    iconColor,
    style
}) => {
    const seatCount = useMemo(() => {
        return leg === 'OUTBOUND'
            ? passengers.filter(p => p.seatNumber).length
            : passengers.filter(p => p.seatNumberReturn).length;
    }, [passengers, leg]);

    const legLabel = leg === 'OUTBOUND' ? 'aller' : 'retour';
    const seatText = seatCount > 0
        ? `${seatCount} siège(s) sélectionné(s)`
        : 'Aucun siège sélectionné';

    return (
        <Pressable
            style={[styles.button, { backgroundColor: cardBackgroundColor, borderColor }, style]}
            onPress={() => onPress(leg)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
            <View style={styles.content}>
                <Icon name="seat" size={20} color={tintColor} />
                <View style={styles.textContainer}>
                    <Text style={[styles.text, { color: textColor }]}>
                        Sièges {legLabel}
                    </Text>
                    <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                        {seatText}
                    </Text>
                </View>
                <Icon name="chevron-right" size={20} color={iconColor} />
            </View>
        </Pressable>
    );
});

SeatSelectionButton.displayName = 'SeatSelectionButton';

const styles = StyleSheet.create({
    button: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textContainer: {
        flex: 1,
    },
    text: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 2,
    },
    subtext: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
});
