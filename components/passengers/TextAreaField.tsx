import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    required?: boolean;
    numberOfLines?: number;
}

/**
 * Composant pour un champ de texte multi-ligne (textarea)
 */
export const TextAreaField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    numberOfLines = 4
}: TextAreaFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';

    // Couleurs spécifiques pour le champ
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    return (
        <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: textColor }]}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[
                    styles.textAreaInput,
                    {
                        backgroundColor: inputBackgroundColor,
                        borderColor: inputBorderColor,
                        color: textColor
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                multiline={true}
                numberOfLines={numberOfLines}
                textAlignVertical="top"
            />
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
    textAreaInput: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 0,
        minHeight: 100,
    },
});
