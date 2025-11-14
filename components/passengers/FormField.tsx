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
    return (
        <View style={styles.formField}>
            <Text style={styles.formLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[styles.formInput, !editable && styles.formInputDisabled]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#A6A6AA"
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
        color: '#000',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    formInput: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    formInputDisabled: {
        backgroundColor: '#F5F5F5',
        color: '#666',
    },
});




