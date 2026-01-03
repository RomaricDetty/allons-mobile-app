import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Interface pour les props du composant DetailRow
 */
interface DetailRowProps {
    label: string;
    value: string;
    textColor: string;
    secondaryTextColor: string;
    isTotal?: boolean;
    valueWidth?: string;
    totalValueColor?: string;
}

/**
 * Composant pour afficher une ligne de détail (label + valeur)
 */
export const DetailRow: React.FC<DetailRowProps> = ({
    label,
    value,
    textColor,
    secondaryTextColor,
    isTotal = false,
    valueWidth,
    totalValueColor,
}) => {
    return (
        <View style={styles.detailRow}>
            <Text style={[isTotal ? styles.totalLabel : styles.detailLabel, { color: isTotal ? textColor : secondaryTextColor }]}>
                {label}
            </Text>
            <Text
                style={[
                    isTotal ? styles.totalValue : styles.detailValue,
                    { color: isTotal ? (totalValueColor || textColor) : textColor, textAlign: 'right' },
                    valueWidth && { width: valueWidth },
                ]}
            >
                {value}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
});

