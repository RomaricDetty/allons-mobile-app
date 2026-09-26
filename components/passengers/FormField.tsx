import {
    FORM_FIELD_HEIGHT,
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface FormFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    required?: boolean;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    editable?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    error?: boolean;
}

/**
 * Champ de formulaire standard AllOn
 */
export const FormField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    keyboardType = 'default',
    editable = true,
    autoCapitalize,
    error = false,
}: FormFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = getFormFieldColors(colorScheme);

    return (
        <View style={[formFieldBaseStyles.field, !label && { marginBottom: 0 }]}>
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
                        backgroundColor: editable ? colors.background : colors.disabledBackground,
                        color: editable ? colors.text : colors.disabledText,
                        borderWidth: error ? 1 : 0,
                        borderColor: error ? colors.danger : 'transparent',
                        height: FORM_FIELD_HEIGHT,
                    },
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                keyboardType={keyboardType}
                editable={editable}
                autoCapitalize={autoCapitalize}
                accessibilityLabel={required ? `${label}, obligatoire` : label}
            />
        </View>
    );
};
