import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface PasswordFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    required?: boolean;
}

/**
 * Composant pour un champ de mot de passe avec affichage/masquage
 */
export const PasswordField = ({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
}: PasswordFieldProps) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <View style={styles.formField}>
            <Text style={styles.formLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.formInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#A6A6AA"
                    secureTextEntry={!isVisible}
                />
                <Pressable
                    style={styles.eyeButton}
                    onPress={() => setIsVisible(!isVisible)}
                >
                    <MaterialCommunityIcons
                        name={isVisible ? 'eye-off' : 'eye'}
                        size={20}
                        color="#A6A6AA"
                    />
                </Pressable>
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    formInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    eyeButton: {
        padding: 12,
    },
});


