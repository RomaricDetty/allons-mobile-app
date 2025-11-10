import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface PhoneFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    required?: boolean;
}

/**
 * Composant pour un champ téléphone avec code pays
 */
export const PhoneField = ({
    label,
    value,
    onChangeText,
    required = false
}: PhoneFieldProps) => {
    return (
        <View style={styles.formField}>
            <Text style={styles.formLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.phoneContainer}>
                <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+225</Text>
                </View>
                <TextInput
                    style={styles.phoneInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="XX XX XX XX"
                    placeholderTextColor="#A6A6AA"
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
        color: '#000',
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
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    countryCodeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
    },
    phoneInput: {
        flex: 1,
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
});



