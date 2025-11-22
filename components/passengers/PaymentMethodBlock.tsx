// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { SectionHeader } from './SectionHeader';
import { FormField } from './FormField';

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
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour les cartes de paiement
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const selectedCardBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F0F8FF';
    const selectedCardBorderColor = tintColor === '#fff' ? '#1776BA' : tintColor; // Utilise #1776BA si tintColor est blanc en dark mode

    return (
        <Pressable
            style={[
                styles.paymentMethodCard,
                {
                    backgroundColor: isSelected ? selectedCardBackgroundColor : cardBackgroundColor,
                    borderColor: isSelected ? selectedCardBorderColor : cardBorderColor,
                    borderWidth: isSelected ? 1.5 : 1
                }
            ]}
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
    // États pour les informations de paiement
    cardName?: string;
    onCardNameChange?: (value: string) => void;
    cardNumber?: string;
    onCardNumberChange?: (value: string) => void;
    expirationDate?: string;
    onExpirationDateChange?: (value: string) => void;
    cardCvv?: string;
    onCardCvvChange?: (value: string) => void;
    paymentNumber?: string;
    onPaymentNumberChange?: (value: string) => void;
}

/**
 * Bloc pour la méthode de paiement
 */
export const PaymentMethodBlock = ({
    selectedPaymentMethod,
    onSelectPaymentMethod,
    cardName = '',
    onCardNameChange,
    cardNumber = '',
    onCardNumberChange,
    expirationDate = '',
    onExpirationDateChange,
    cardCvv = '',
    onCardCvvChange,
    paymentNumber = '',
    onPaymentNumberChange
}: PaymentMethodBlockProps) => {
    /**
     * Formate le numéro de carte pour afficher des espaces tous les 4 chiffres
     */
    const formatCardNumber = (text: string) => {
        // Supprime tous les espaces et caractères non numériques
        const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
        // Limite à 16 chiffres
        const limited = cleaned.slice(0, 16);
        // Ajoute des espaces tous les 4 chiffres
        return limited.replace(/(.{4})/g, '$1 ').trim();
    };

    /**
     * Gère le changement du numéro de carte
     */
    const handleCardNumberChange = (text: string) => {
        if (onCardNumberChange) {
            const formatted = formatCardNumber(text);
            onCardNumberChange(formatted);
        }
    };

    /**
     * Formate la date d'expiration au format MM/YY
     */
    const formatExpirationDate = (text: string) => {
        // Supprime tous les caractères non numériques
        const cleaned = text.replace(/\D/g, '');
        // Limite à 4 chiffres
        const limited = cleaned.slice(0, 4);
        // Ajoute le slash après 2 chiffres
        if (limited.length >= 2) {
            return limited.slice(0, 2) + '/' + limited.slice(2);
        }
        return limited;
    };

    /**
     * Gère le changement de la date d'expiration
     */
    const handleExpirationDateChange = (text: string) => {
        if (onExpirationDateChange) {
            const formatted = formatExpirationDate(text);
            onExpirationDateChange(formatted);
        }
    };

    /**
     * Gère le changement du CVV (limite à 3 chiffres)
     */
    const handleCvvChange = (text: string) => {
        if (onCardCvvChange) {
            const cleaned = text.replace(/\D/g, '').slice(0, 3);
            onCardCvvChange(cleaned);
        }
    };

    /**
     * Détermine le label du champ numéro selon la méthode de paiement
     */
    const getPaymentNumberLabel = () => {
        switch (selectedPaymentMethod) {
            case 'wave':
                return 'Numéro Wave';
            case 'orange-money':
                return 'Numéro Orange Money';
            case 'mtn-money':
                return 'Numéro MTN Money';
            default:
                return 'Numéro';
        }
    };

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

            {/* Champs conditionnels selon la méthode de paiement */}
            {selectedPaymentMethod === 'credit-card' && (
                <View style={styles.paymentFieldsContainer}>
                    <FormField
                        label="Nom sur la carte"
                        value={cardName}
                        onChangeText={onCardNameChange}
                        placeholder="JEAN DUPONT"
                        required
                        autoCapitalize="characters"
                    />
                    <FormField
                        label="Numéro de carte"
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        required
                        keyboardType="numeric"
                    />
                    <View style={styles.cardRow}>
                        <View style={styles.cardRowItem}>
                            <FormField
                                label="Date d'expiration"
                                value={expirationDate}
                                onChangeText={handleExpirationDateChange}
                                placeholder="MM/YY"
                                required
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.cardRowItem}>
                            <FormField
                                label="CVV"
                                value={cardCvv}
                                onChangeText={handleCvvChange}
                                placeholder="123"
                                required
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>
            )}

            {selectedPaymentMethod && selectedPaymentMethod !== 'credit-card' && (
                <View style={styles.paymentFieldsContainer}>
                    <FormField
                        label={getPaymentNumberLabel()}
                        value={paymentNumber}
                        onChangeText={onPaymentNumberChange}
                        placeholder="Entrez votre numéro"
                        required
                        keyboardType="phone-pad"
                    />
                </View>
            )}
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
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 8,
    },
    paymentMethodText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginTop: 8,
        textAlign: 'center',
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
    paymentFieldsContainer: {
        marginTop: 16,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cardRowItem: {
        flex: 1,
    },
});

