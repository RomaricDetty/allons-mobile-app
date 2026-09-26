import {
    FORM_FIELD_HEIGHT,
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface AuthFormFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    required?: boolean;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    errors?: string;
    touchedFields?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

/**
 * Champ auth — même look que FormField
 */
export const AuthFormField = ({
    label,
    value,
    onChangeText,
    onBlur,
    placeholder,
    required = false,
    keyboardType = 'default',
    errors,
    touchedFields,
    autoCapitalize = 'none',
}: AuthFormFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = getFormFieldColors(colorScheme);
    const showError = Boolean(errors && touchedFields);

    return (
        <View style={formFieldBaseStyles.field}>
            {!!label && (
                <Text style={[formFieldBaseStyles.label, { color: colors.text }]}>
                    {label}{' '}
                    {required && <Text style={{ color: colors.danger }}>*</Text>}
                </Text>
            )}
            <TextInput
                style={[
                    formFieldBaseStyles.input,
                    {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderWidth: showError ? 1 : 0,
                        borderColor: showError ? colors.danger : 'transparent',
                        height: FORM_FIELD_HEIGHT,
                    },
                ]}
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                accessibilityLabel={required ? `${label}, obligatoire` : label}
            />
        </View>
    );
};
