import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
}

/**
 * Composant pour un champ de formulaire standard
 */
export const FormField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    keyboardType = 'default',
    editable = true
}: FormFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    
    // Couleurs spécifiques pour le champ
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const inputDisabledBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5';
    const inputDisabledTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';

    return (
        <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: textColor }]}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[
                    styles.formInput,
                    {
                        backgroundColor: inputBackgroundColor,
                        borderColor: inputBorderColor,
                        color: textColor
                    },
                    !editable && {
                        backgroundColor: inputDisabledBackgroundColor,
                        color: inputDisabledTextColor
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                keyboardType={keyboardType}
                editable={editable}
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
    formInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
    },
    formInputDisabled: {
        // Styles gérés dynamiquement
    },
});




