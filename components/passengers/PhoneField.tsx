import {
    FORM_FIELD_HEIGHT,
    FORM_FIELD_RADIUS,
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COUNTRY_CODES } from '@/interfaces';
import React, { useMemo } from 'react';
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
 * Téléphone + code pays (flag + indicatif) — fill uniforme, sans bordure
 */
export const PhoneField = ({
    label,
    value,
    onChangeText,
    required = false,
    countryCode = '+225',
    onCountryCodePress,
}: PhoneFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = getFormFieldColors(colorScheme);
    const appColors = useAppColors();

    const countryCodeLabel = useMemo(() => {
        return (
            COUNTRY_CODES.find((c) => c.code === countryCode)?.label ?? countryCode
        );
    }, [countryCode]);

    return (
        <View style={formFieldBaseStyles.field}>
            {!!label && (
                <Text style={[formFieldBaseStyles.label, { color: colors.text }]}>
                    {label}{' '}
                    {required && <Text style={{ color: colors.danger }}>*</Text>}
                </Text>
            )}
            <View style={styles.phoneContainer}>
                <Pressable
                    style={[
                        styles.countryCode,
                        { backgroundColor: colors.background },
                    ]}
                    onPress={onCountryCodePress}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                    <Text style={[styles.countryCodeText, { color: colors.text }]}>
                        {countryCodeLabel}
                    </Text>
                    {onCountryCodePress && (
                        <Icon
                            name="chevron-down"
                            size={16}
                            color={appColors.activeTabColor}
                        />
                    )}
                </Pressable>
                <TextInput
                    style={[
                        styles.phoneInput,
                        {
                            backgroundColor: colors.background,
                            color: colors.text,
                        },
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="XX XX XX XX"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: 12,
        height: FORM_FIELD_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
        gap: 4,
        maxWidth: '42%',
    },
    countryCodeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        flexShrink: 1,
    },
    phoneInput: {
        flex: 1,
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
    },
});
