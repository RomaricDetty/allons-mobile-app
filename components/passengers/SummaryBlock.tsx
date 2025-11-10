import { formatPrice } from '@/constants/functions';
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
    return (
        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Récapitulatif</Text>

            <View style={styles.summaryDetails}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Voyageurs</Text>
                    <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Taxes</Text>
                    <Text style={styles.summaryValue}>{formatPrice(taxes)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Frais</Text>
                    <Text style={styles.summaryValue}>{formatPrice(fees)}</Text>
                </View>
            </View>

            <View style={styles.summarySeparator} />

            <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>{formatPrice(totalAmount)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    summaryTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
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
        color: '#000',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    summarySeparator: {
        height: 1,
        backgroundColor: '#E0E0E0',
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
        color: '#000',
    },
    summaryTotalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
    },
});

