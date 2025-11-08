// @ts-nocheck
import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

interface PaymentMethodCardProps {
    name: string;
    imageSource?: ImageSourcePropType;
    icon?: string;
    isSelected: boolean;
    onPress: () => void;
}

/**
 * Composant pour une méthode de paiement
 */
const PaymentMethodCard = ({
    name,
    imageSource,
    icon,
    isSelected,
    onPress
}: PaymentMethodCardProps) => {
    return (
        <Pressable
            style={[styles.paymentMethodCard, isSelected && styles.paymentMethodCardSelected]}
            onPress={onPress}
        >
            <Image
                source={imageSource}
                style={[styles.paymentMethodImage, isSelected && styles.paymentMethodImageSelected]}
                resizeMode="cover"
            />

        </Pressable>
    );
};

interface PaymentMethodBlockProps {
    selectedPaymentMethod: string | null;
    onSelectPaymentMethod: (method: string) => void;
}

/**
 * Bloc pour la méthode de paiement
 */
export const PaymentMethodBlock = ({
    selectedPaymentMethod,
    onSelectPaymentMethod
}: PaymentMethodBlockProps) => {
    return (
        <>
            <SectionHeader number={3} title="Méthode de paiement" />

            <View style={styles.paymentMethodsContainer}>
                <PaymentMethodCard
                    name="Carte de crédit"
                    imageSource={require('@/assets/images/payment/logo-payment-card.png')}
                    isSelected={selectedPaymentMethod === 'credit-card'}
                    onPress={() => onSelectPaymentMethod('credit-card')}
                />
                <PaymentMethodCard
                    name="Wave"
                    imageSource={require('@/assets/images/payment/logo-payment-wave.png')}
                    isSelected={selectedPaymentMethod === 'wave'}
                    onPress={() => onSelectPaymentMethod('wave')}
                />
                <PaymentMethodCard
                    name="Orange Money"
                    imageSource={require('@/assets/images/payment/logo-payment-om.png')}
                    isSelected={selectedPaymentMethod === 'orange-money'}
                    onPress={() => onSelectPaymentMethod('orange-money')}
                />
                <PaymentMethodCard
                    name="MTN Money"
                    imageSource={require('@/assets/images/payment/logo-payment-mtn.png')}
                    isSelected={selectedPaymentMethod === 'mtn-money'}
                    onPress={() => onSelectPaymentMethod('mtn-money')}
                />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    paymentMethodsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
        marginBottom: 8,
    },
    paymentMethodCard: {
        width: '30%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        overflow: 'hidden',
        padding: 8,
    },
    paymentMethodCardSelected: {
        borderColor: '#1776BA',
        borderWidth: 1.5,
        backgroundColor: '#F0F8FF',
    },
    paymentMethodText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    paymentMethodTextSelected: {
        color: '#1776BA',
    },
    paymentMethodImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        opacity: 0.7,
    },
    paymentMethodImageSelected: {
        opacity: 1,
    },
});

