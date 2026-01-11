import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatFullDateWithTime } from '@/constants/functions';

/**
 * Interface pour les données de paiement
 */
interface PaymentData {
    prices: {
        outboundPricePerPerson: number;
        returnPricePerPerson: number;
        outboundTotalPrice: number;
        returnTotalPrice: number;
        numberOfPassengers: number;
    };
    totalAmount: string | number;
    currency: string;
    provider: string;
    createdAt: string;
}

/**
 * Interface pour les props du composant
 */
interface PaymentDetailsSectionProps {
    payment: PaymentData;
    isRoundTrip: boolean;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    formatPriceWithCurrency: (amount: string | number) => string;
    formatPaymentMethod: (method: string) => string;
}

/**
 * Composant pour afficher les détails du paiement
 */
export const PaymentDetailsSection = memo<PaymentDetailsSectionProps>(({
    payment,
    isRoundTrip,
    cardBackgroundColor,
    borderColor,
    textColor,
    secondaryTextColor,
    primaryBlue,
    formatPriceWithCurrency,
    formatPaymentMethod,
}) => {
    return (
        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                <Icon name="wallet-outline" size={20} color={primaryBlue} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du paiement</Text>
            </View>
            
            {/* Prix du voyage aller */}
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    {isRoundTrip ? 'Prix voyage aller' : 'Prix du ticket'}
                </Text>
                <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                    {formatPriceWithCurrency(payment.prices.outboundTotalPrice)}
                </Text>
            </View>
            {payment.prices.numberOfPassengers > 1 && (
                <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                    ({formatPriceWithCurrency(payment.prices.outboundPricePerPerson)} × {payment.prices.numberOfPassengers} passager{payment.prices.numberOfPassengers > 1 ? 's' : ''})
                </Text>
            )}
            
            {/* Prix du voyage retour (si aller-retour) */}
            {isRoundTrip && (
                <>
                    <View style={[styles.detailRow, { marginTop: 12 }]}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Prix voyage retour</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatPriceWithCurrency(payment.prices.returnTotalPrice)}
                        </Text>
                    </View>
                    {payment.prices.numberOfPassengers > 1 && (
                        <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                            ({formatPriceWithCurrency(payment.prices.returnPricePerPerson)} × {payment.prices.numberOfPassengers} passager{payment.prices.numberOfPassengers > 1 ? 's' : ''})
                        </Text>
                    )}
                </>
            )}
            
            <View style={[styles.separator, { backgroundColor: borderColor, marginTop: 12 }]} />
            <View style={styles.detailRow}>
                <Text style={[styles.totalLabel, { color: textColor }]}>Total payé</Text>
                <Text style={[styles.totalValue, { color: primaryBlue }]}>
                    {formatPriceWithCurrency(payment.totalAmount)}
                </Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Méthode de paiement</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatPaymentMethod(payment.provider)}
                </Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date de réservation</Text>
                <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                    {formatFullDateWithTime(payment.createdAt)}
                </Text>
            </View>
        </View>
    );
});

PaymentDetailsSection.displayName = 'PaymentDetailsSection';

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
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
    priceSubtext: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        marginTop: -4,
        marginBottom: 4,
        marginLeft: 0,
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
    separator: {
        height: 1,
        marginVertical: 12,
    },
});





