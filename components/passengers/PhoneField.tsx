import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PhoneFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    required?: boolean;
    countryCode?: string;
    onCountryCodePress?: () => void;
}

/**
 * Composant pour un champ téléphone avec code pays sélectionnable
 */
export const PhoneField = ({
    label,
    value,
    onChangeText,
    required = false,
    countryCode = '+225',
    onCountryCodePress
}: PhoneFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour le champ téléphone
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    return (
        <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: textColor }]}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.phoneContainer}>
                <Pressable 
                    style={[
                        styles.countryCode,
                        {
                            backgroundColor: inputBackgroundColor,
                            borderColor: inputBorderColor
                        }
                    ]}
                    onPress={onCountryCodePress}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                    <Text style={[styles.countryCodeText, { color: textColor }]}>{countryCode}</Text>
                    {onCountryCodePress && (
                        <Icon name="chevron-down" size={16} color={tintColor} style={styles.chevronIcon} />
                    )}
                </Pressable>
                <TextInput
                    style={[
                        styles.phoneInput,
                        {
                            backgroundColor: inputBackgroundColor,
                            borderColor: inputBorderColor,
                            color: textColor
                        }
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="XX XX XX XX"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 4,
    },
    countryCodeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    chevronIcon: {
        marginLeft: 2,
    },
    phoneInput: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
    },
});




