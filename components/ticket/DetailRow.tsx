import React from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';

interface DetailRowProps {
    label: string;
    value: string;
    textColor: string;
    secondaryTextColor: string;
    isTotal?: boolean;
    valueWidth?: DimensionValue;
    totalValueColor?: string;
}

/**
 * Ligne label / valeur pour les détails du billet
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
        <View style={[styles.detailRow, isTotal && styles.totalRow]}>
            <Text
                style={[
                    isTotal ? styles.totalLabel : styles.detailLabel,
                    { color: isTotal ? textColor : secondaryTextColor },
                ]}
            >
                {label}
            </Text>
            <Text
                style={[
                    isTotal ? styles.totalValue : styles.detailValue,
                    {
                        color: isTotal ? (totalValueColor || textColor) : textColor,
                        textAlign: 'right',
                    },
                    valueWidth != null ? { width: valueWidth, maxWidth: '58%' } : { flex: 1 },
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
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    totalRow: {
        marginTop: 4,
        marginBottom: 14,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        flexShrink: 0,
        maxWidth: '42%',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
    totalLabel: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        flexShrink: 0,
        maxWidth: '42%',
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
});
