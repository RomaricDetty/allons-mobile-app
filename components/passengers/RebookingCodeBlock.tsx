import { RebookingCodeResponse } from '@/api/rebooking';
import { formatFullDate, formatPrice } from '@/constants/functions';
import {
    FORM_FIELD_HEIGHT,
    FORM_FIELD_RADIUS,
    getFormFieldColors,
} from '@/constants/formField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

/** Styles communs pour les blocs de succès rebooking (fond vert clair, bordure verte) */
const SUCCESS_BLOCK_BG = 'rgba(76, 175, 80, 0.08)';
const SUCCESS_BLOCK_BORDER = 'rgba(76, 175, 80, 0.4)';
const SUCCESS_TEXT = '#2E7D32';

interface RebookingCodeBlockProps {
    rebookingCode: string;
    onRebookingCodeChange: (value: string) => void;
    onVerifyCode: () => void;
    isVerifying?: boolean;
    isCodeValid?: boolean | null;
    /** Données du token après vérification (pour afficher "Token valide" + crédit + expiration) */
    rebookingTokenData?: RebookingCodeResponse | null;
}

/**
 * Bloc pour le code de rebooking (optionnel)
 */
export const RebookingCodeBlock = ({
    rebookingCode,
    onRebookingCodeChange,
    onVerifyCode,
    isVerifying = false,
    isCodeValid = null,
    rebookingTokenData = null
}: RebookingCodeBlockProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques
    const colors = getFormFieldColors(colorScheme);
    const infoBgColor = colorScheme === 'dark' ? 'rgba(23, 118, 186, 0.15)' : '#E8F4FD';
    const infoTextColor = colorScheme === 'dark' ? '#5BA3D9' : '#1776BA';
    const buttonColor = '#1776BA';
    const successColor = '#4CAF50';
    const errorColor = colors.danger;

    return (
        <View style={styles.container}>
            <SectionHeader number={3} title="Code de rebooking (optionnel)" />

            <View style={[styles.infoContainer, { backgroundColor: infoBgColor }]}>
                <Text style={[styles.infoText, { color: infoTextColor }]}>
                    Avez-vous un code de rebooking d'une réservation annulée ? Entrez-le ici pour appliquer le crédit.
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.background,
                                color: textColor,
                                borderWidth: isCodeValid === false ? 1 : 0,
                                borderColor: isCodeValid === false ? errorColor : 'transparent',
                            },
                        ]}
                        value={rebookingCode}
                        onChangeText={onRebookingCodeChange}
                        placeholder="Entrez votre code"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="characters"
                        editable={!isVerifying}
                    />

                    <Pressable
                        style={[
                            styles.verifyButton,
                            { backgroundColor: isCodeValid === true ? successColor : buttonColor },
                            (!rebookingCode || isVerifying) && styles.verifyButtonDisabled
                        ]}
                        onPress={onVerifyCode}
                        disabled={!rebookingCode || isVerifying}
                        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                    >
                        {isVerifying ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.verifyButtonText}>
                                {isCodeValid === true ? 'Valide' : 'Vérifier'}
                            </Text>
                        )}
                    </Pressable>
                </View>

                {isCodeValid === false && (
                    <Text style={[styles.errorText, { color: errorColor }]}>
                        Code invalide. Veuillez vérifier et réessayer.
                    </Text>
                )}

                {isCodeValid === true && !rebookingTokenData && (
                    <Text style={[styles.successText, { color: successColor }]}>
                        Code appliqué avec succès !
                    </Text>
                )}

                {isCodeValid === true && rebookingTokenData && (
                    <View style={styles.tokenValidCard}>
                        <MaterialCommunityIcons name="check-circle" size={22} color={SUCCESS_TEXT} />
                        <View style={styles.tokenValidContent}>
                            <Text style={styles.tokenValidTitle}>Token valide</Text>
                            <Text style={styles.tokenValidLine}>
                                Crédit disponible: {formatPrice(rebookingTokenData.creditAmount)}
                            </Text>
                            <Text style={styles.tokenValidLine}>
                                Expire le: {formatFullDate(rebookingTokenData.expiresAt)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    infoContainer: {
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    infoText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 16,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'stretch',
    },
    input: {
        flex: 1,
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        height: FORM_FIELD_HEIGHT,
    },
    verifyButton: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 110,
        height: FORM_FIELD_HEIGHT,
    },
    verifyButtonDisabled: {
        opacity: 0.5,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 8,
    },
    successText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        marginTop: 8,
    },
    tokenValidCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        backgroundColor: SUCCESS_BLOCK_BG,
        borderWidth: 1,
        borderColor: SUCCESS_BLOCK_BORDER,
    },
    tokenValidContent: { flex: 1 },
    tokenValidTitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        color: SUCCESS_TEXT,
        marginBottom: 6,
    },
    tokenValidLine: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        color: SUCCESS_TEXT,
        marginBottom: 2,
    },
});

/** Bloc affiché quand le crédit rebooking couvre entièrement le montant (aucun paiement requis) */
export const NoPaymentRequiredBlock = () => (
    <View style={noPaymentStyles.card}>
        <MaterialCommunityIcons name="check-circle" size={24} color={SUCCESS_TEXT} />
        <View style={noPaymentStyles.content}>
            <Text style={noPaymentStyles.title}>Aucun paiement requis</Text>
            <Text style={noPaymentStyles.message}>
                Votre crédit de rebooking couvre entièrement le montant de la réservation. Vous pouvez continuer sans paiement.
            </Text>
        </View>
    </View>
);

const noPaymentStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: SUCCESS_BLOCK_BG,
        borderWidth: 1,
        borderColor: SUCCESS_BLOCK_BORDER,
    },
    content: { flex: 1 },
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: SUCCESS_TEXT,
        marginBottom: 6,
    },
    message: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: SUCCESS_TEXT,
        lineHeight: 20,
    },
});
