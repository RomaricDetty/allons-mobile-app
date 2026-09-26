// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { COUNTRY_CODES } from '@/interfaces';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { FormField } from './FormField';
import { PhoneField } from './PhoneField';
import { SectionHeader } from './SectionHeader';

interface PaymentMethodCardProps {
    name: string;
    imageSource?: ImageSourcePropType;
    isSelected: boolean;
    onPress: () => void;
}

const PAYMENT_OPTIONS = [
    {
        id: 'wave',
        name: 'Wave',
        image: require('@/assets/images/payment/logo-payment-wave.png'),
    },
    {
        id: 'orange-money',
        name: 'Orange Money',
        image: require('@/assets/images/payment/logo-payment-om.png'),
    },
    {
        id: 'mtn-money',
        name: 'MTN Money',
        image: require('@/assets/images/payment/logo-payment-mtn.png'),
    },
    // Moov Money / Flooz : masqué — non supporté par la gateway actuelle
] as const;

/**
 * Carte logo méthode de paiement — taille égale, image contenue.
 */
const PaymentMethodCard = ({ name, imageSource, isSelected, onPress }: PaymentMethodCardProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const tintColor = useThemeColor({}, 'tint');

    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const selectedCardBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F0F8FF';
    const selectedCardBorderColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: isSelected }}
            style={[
                styles.paymentMethodCard,
                {
                    backgroundColor: isSelected ? selectedCardBackgroundColor : cardBackgroundColor,
                    borderColor: isSelected ? selectedCardBorderColor : cardBorderColor,
                    borderWidth: isSelected ? 1.5 : 1,
                },
            ]}
            onPress={onPress}
        >
            <Image
                source={imageSource}
                style={[styles.paymentMethodImage, isSelected && styles.paymentMethodImageSelected]}
                resizeMode="contain"
            />
        </Pressable>
    );
};

interface PaymentMethodBlockProps {
    selectedPaymentMethod: string | null;
    onSelectPaymentMethod: (method: string) => void;
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
    countryCode?: string;
    onCountryCodeChange?: (value: string) => void;
    onOpenBottomSheet?: (
        type: 'passengerType' | 'relation' | 'countryCode',
        title: string,
        options: Array<{ value: string; label: string }>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => void;
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
    onPaymentNumberChange,
    countryCode = '+225',
    onCountryCodeChange,
    onOpenBottomSheet,
}: PaymentMethodBlockProps) => {
    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
        const limited = cleaned.slice(0, 16);
        return limited.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleCardNumberChange = (text: string) => {
        if (onCardNumberChange) {
            onCardNumberChange(formatCardNumber(text));
        }
    };

    const formatExpirationDate = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        const limited = cleaned.slice(0, 4);
        if (limited.length >= 2) {
            return limited.slice(0, 2) + '/' + limited.slice(2);
        }
        return limited;
    };

    const handleExpirationDateChange = (text: string) => {
        if (onExpirationDateChange) {
            onExpirationDateChange(formatExpirationDate(text));
        }
    };

    const handleCvvChange = (text: string) => {
        if (onCardCvvChange) {
            onCardCvvChange(text.replace(/\D/g, '').slice(0, 3));
        }
    };

    const getPaymentNumberLabel = () => {
        switch (selectedPaymentMethod) {
            case 'wave':
                return 'Numéro Wave';
            case 'orange-money':
                return 'Numéro Orange Money';
            case 'mtn-money':
                return 'Numéro MTN Money';
            case 'moov-money':
                return 'Numéro Moov Money / Flooz';
            default:
                return 'Numéro';
        }
    };

    return (
        <>
            <SectionHeader number={4} title="Méthode de paiement" />

            <View style={styles.paymentMethodsContainer}>
                {PAYMENT_OPTIONS.map((option) => (
                    <PaymentMethodCard
                        key={option.id}
                        name={option.name}
                        imageSource={option.image}
                        isSelected={selectedPaymentMethod === option.id}
                        onPress={() => onSelectPaymentMethod(option.id)}
                    />
                ))}
            </View>

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
                    <PhoneField
                        label={getPaymentNumberLabel()}
                        value={paymentNumber}
                        onChangeText={onPaymentNumberChange}
                        required
                        countryCode={countryCode}
                        onCountryCodePress={
                            onOpenBottomSheet
                                ? () => {
                                      onOpenBottomSheet(
                                          'countryCode',
                                          'Sélectionner le code pays',
                                          COUNTRY_CODES.map((cc) => ({ value: cc.code, label: cc.label })),
                                          countryCode,
                                          (value) => onCountryCodeChange?.(value)
                                      );
                                  }
                                : undefined
                        }
                    />
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    paymentMethodsContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    paymentMethodCard: {
        // Colonnes égales : flexBasis 0 évite le débordement lié à la taille intrinsèque des PNG
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        aspectRatio: 1,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 4,
    },
    paymentMethodImage: {
        width: '100%',
        height: '100%',
        opacity: 0.85,
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
