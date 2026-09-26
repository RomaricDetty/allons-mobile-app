import { SectionCardHeader } from '@/components/ui/SectionCardHeader';
import { formatFullDateWithTime } from '@/constants/functions';
import { formatPaymentMethodDisplay } from '@/constants/paymentMethods';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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

interface PaymentDetailsSectionProps {
    payment: PaymentData;
    isRoundTrip: boolean;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    formatPriceWithCurrency: (amount: string | number) => string;
    formatPaymentMethod?: (method: string) => string;
    rebookingCode: string;
    creditRemaining: number;
    remainingTokenCode: string;
}

/**
 * Bloc paiement — en-tête et lignes alignés sur le billet.
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
    rebookingCode,
    creditRemaining,
    remainingTokenCode,
}) => {
    return (
        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <SectionCardHeader
                title="Détails du paiement"
                textColor={textColor}
                icon={<Icon name="credit-card-outline" size={22} color={primaryBlue} />}
            />

            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    {isRoundTrip ? 'Prix voyage aller' : 'Prix du ticket'}
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatPriceWithCurrency(payment.prices.outboundTotalPrice)}
                </Text>
            </View>
            {payment.prices.numberOfPassengers > 1 && (
                <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                    ({formatPriceWithCurrency(payment.prices.outboundPricePerPerson)} ×{' '}
                    {payment.prices.numberOfPassengers} passager
                    {payment.prices.numberOfPassengers > 1 ? 's' : ''})
                </Text>
            )}

            {isRoundTrip && (
                <>
                    <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                            Prix voyage retour
                        </Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>
                            {formatPriceWithCurrency(payment.prices.returnTotalPrice)}
                        </Text>
                    </View>
                    {payment.prices.numberOfPassengers > 1 && (
                        <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                            ({formatPriceWithCurrency(payment.prices.returnPricePerPerson)} ×{' '}
                            {payment.prices.numberOfPassengers} passager
                            {payment.prices.numberOfPassengers > 1 ? 's' : ''})
                        </Text>
                    )}
                </>
            )}

            <View style={[styles.totalRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.totalLabel, { color: textColor }]}>Total payé</Text>
                <Text style={[styles.totalValue, { color: primaryBlue }]}>
                    {formatPriceWithCurrency(payment.totalAmount)}
                </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Méthode de paiement
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatPaymentMethod
                        ? formatPaymentMethod(payment.provider) || '—'
                        : formatPaymentMethodDisplay(payment.provider)}
                </Text>
            </View>
            <View
                style={[
                    styles.detailRow,
                    !rebookingCode && creditRemaining <= 0 && !remainingTokenCode
                        ? styles.detailRowLast
                        : null,
                    { borderBottomColor: borderColor },
                ]}
            >
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Date de réservation
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
                    {formatFullDateWithTime(payment.createdAt)}
                </Text>
            </View>
            {rebookingCode ? (
                <View
                    style={[
                        styles.detailRow,
                        creditRemaining <= 0 && !remainingTokenCode ? styles.detailRowLast : null,
                        { borderBottomColor: borderColor },
                    ]}
                >
                    <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                        Code de rebooking
                    </Text>
                    <Text style={[styles.detailValue, { color: textColor }]}>{rebookingCode}</Text>
                </View>
            ) : null}
            {creditRemaining > 0 ? (
                <View
                    style={[
                        styles.detailRow,
                        !remainingTokenCode ? styles.detailRowLast : null,
                        { borderBottomColor: borderColor },
                    ]}
                >
                    <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                        Crédit restant
                    </Text>
                    <Text style={[styles.detailValue, { color: textColor }]}>{creditRemaining}</Text>
                </View>
            ) : null}
            {remainingTokenCode ? (
                <View style={[styles.detailRow, styles.detailRowLast]}>
                    <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                        Code de token restant
                    </Text>
                    <Text style={[styles.detailValue, { color: textColor }]}>
                        {remainingTokenCode}
                    </Text>
                </View>
            ) : null}
        </View>
    );
});

PaymentDetailsSection.displayName = 'PaymentDetailsSection';

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    detailRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    detailLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        flexShrink: 0,
        maxWidth: '48%',
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
    priceSubtext: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'right',
        marginTop: -4,
        marginBottom: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    totalLabel: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
});
