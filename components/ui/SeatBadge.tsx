import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SeatBadgeProps = {
    seatNumber: string | number;
    primaryBlue: string;
    secondaryTextColor: string;
    borderColor: string;
    /** Libellé optionnel (ex. "Retour") */
    label?: string;
};

/**
 * Badge siège uniforme (confirmation, billet, paiement).
 */
export const SeatBadge = memo<SeatBadgeProps>(({
    seatNumber,
    primaryBlue,
    secondaryTextColor,
    borderColor,
    label = 'Siège',
}) => (
    <View style={[styles.seatBlock, { borderColor }]}>
        <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>{label}</Text>
        <Text style={[styles.seatNumber, { color: primaryBlue }]}>{seatNumber}</Text>
    </View>
));

SeatBadge.displayName = 'SeatBadge';

const styles = StyleSheet.create({
    seatBlock: {
        width: 64,
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seatLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    seatNumber: {
        fontSize: 22,
        fontFamily: 'Ubuntu_Bold',
    },
});
