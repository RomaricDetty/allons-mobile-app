import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface AuthFormFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    required?: boolean;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

/**
 * Composant pour un champ de formulaire d'authentification avec fond blanc
 */
export const AuthFormField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    keyboardType = 'default',
}: AuthFormFieldProps) => {
    return (
        <View style={styles.formField}>
            <Text style={styles.formLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={styles.formInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#A6A6AA"
                keyboardType={keyboardType}
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
        color: '#000',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    formInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
});


