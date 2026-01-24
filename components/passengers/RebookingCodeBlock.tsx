import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

interface RebookingCodeBlockProps {
    rebookingCode: string;
    onRebookingCodeChange: (value: string) => void;
    onVerifyCode: () => void;
    isVerifying?: boolean;
    isCodeValid?: boolean | null;
}

/**
 * Bloc pour le code de rebooking (optionnel)
 */
export const RebookingCodeBlock = ({
    rebookingCode,
    onRebookingCodeChange,
    onVerifyCode,
    isVerifying = false,
    isCodeValid = null
}: RebookingCodeBlockProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques
    const infoBgColor = colorScheme === 'dark' ? 'rgba(23, 118, 186, 0.15)' : '#E8F4FD';
    const infoTextColor = colorScheme === 'dark' ? '#5BA3D9' : '#1776BA';
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#1776BA';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const buttonColor = '#1776BA';
    const successColor = '#4CAF50';
    const errorColor = '#FF3B30';

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
                                backgroundColor: inputBackgroundColor,
                                borderColor: isCodeValid === false ? errorColor : inputBorderColor,
                                color: textColor
                            }
                        ]}
                        value={rebookingCode}
                        onChangeText={onRebookingCodeChange}
                        placeholder="Entrez votre code"
                        placeholderTextColor={placeholderColor}
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
                                {isCodeValid === true ? 'Valide ✓' : 'Vérifier'}
                            </Text>
                        )}
                    </Pressable>
                </View>

                {isCodeValid === false && (
                    <Text style={[styles.errorText, { color: errorColor }]}>
                        Code invalide. Veuillez vérifier et réessayer.
                    </Text>
                )}

                {isCodeValid === true && (
                    <Text style={[styles.successText, { color: successColor }]}>
                        Code appliqué avec succès !
                    </Text>
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
        borderRadius: 12,
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
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 2,
    },
    verifyButton: {
        borderRadius: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 110,
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
});
