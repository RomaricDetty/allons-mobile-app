import { formatPrice } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SummaryBlockProps {
    totalPrice: number;
    taxes: number;
    fees: number;
    totalAmount: number;
}

/**
 * Bloc pour le récapitulatif des prix
 */
export const SummaryBlock = ({
    totalPrice,
    taxes,
    fees,
    totalAmount
}: SummaryBlockProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour le bloc récapitulatif
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const separatorColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    // Utilise #1776BA si tintColor est blanc en dark mode
    const totalValueColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    return (
        <View style={[
            styles.summaryCard,
            {
                backgroundColor: cardBackgroundColor,
                borderColor
            }
        ]}>
            <Text style={[styles.summaryTitle, { color: textColor }]}>Récapitulatif</Text>

            <View style={styles.summaryDetails}>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: textColor }]}>Voyageurs</Text>
                    <Text style={[styles.summaryValue, { color: textColor }]}>{formatPrice(totalPrice)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: textColor }]}>Taxes</Text>
                    <Text style={[styles.summaryValue, { color: textColor }]}>{formatPrice(taxes)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: textColor }]}>Frais</Text>
                    <Text style={[styles.summaryValue, { color: textColor }]}>{formatPrice(fees)}</Text>
                </View>
            </View>

            <View style={[styles.summarySeparator, { backgroundColor: separatorColor }]} />

            <View style={styles.summaryTotalRow}>
                <Text style={[styles.summaryTotalLabel, { color: textColor }]}>Total</Text>
                <Text style={[styles.summaryTotalValue, { color: totalValueColor }]}>{formatPrice(totalAmount)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    summaryTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    summaryDetails: {
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    summarySeparator: {
        height: 1,
        marginVertical: 12,
    },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryTotalLabel: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    summaryTotalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
});

