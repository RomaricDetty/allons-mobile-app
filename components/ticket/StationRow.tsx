import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Interface pour les props du composant StationRow
 */
interface StationRowProps {
    label: string;
    stationName: string;
    dotColor: string;
    textColor: string;
    secondaryTextColor: string;
    borderColor: string;
    isLast?: boolean;
}

/**
 * Composant pour afficher une ligne de gare (départ ou arrivée)
 */
export const StationRow: React.FC<StationRowProps> = ({
    label,
    stationName,
    dotColor,
    textColor,
    secondaryTextColor,
    borderColor,
    isLast = false,
}) => {
    return (
        <>
            <View style={styles.stationRow}>
                <View style={[styles.stationDot, { backgroundColor: dotColor }]} />
                <View style={styles.stationInfo}>
                    <Text style={[styles.stationLabel, { color: textColor }]}>{label}</Text>
                    <Text style={[styles.stationName, { color: secondaryTextColor }]}>
                        {stationName}
                    </Text>
                </View>
            </View>
            {!isLast && <View style={[styles.stationLine, { backgroundColor: borderColor }]} />}
        </>
    );
};

const styles = StyleSheet.create({
    stationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    stationInfo: {
        flex: 1,
    },
    stationLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    stationName: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    stationLine: {
        width: 2,
        height: 20,
        marginLeft: 5,
        marginBottom: 8,
    },
});

