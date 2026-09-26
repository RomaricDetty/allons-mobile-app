import {
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    required?: boolean;
    numberOfLines?: number;
    maxLength?: number;
}

/**
 * Textarea — mêmes tokens que FormField
 */
export const TextAreaField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    numberOfLines = 4,
    maxLength,
}: TextAreaFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = getFormFieldColors(colorScheme);

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
                    formFieldBaseStyles.inputMultiline,
                    {
                        backgroundColor: colors.background,
                        color: colors.text,
                    },
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={numberOfLines}
                textAlignVertical="top"
                maxLength={maxLength}
            />
        </View>
    );
};
