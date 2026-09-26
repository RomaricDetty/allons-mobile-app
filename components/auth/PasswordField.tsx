import {
    FORM_FIELD_HEIGHT,
    FORM_FIELD_RADIUS,
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface PasswordFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    required?: boolean;
    errors?: string;
    touchedFields?: boolean;
}

/**
 * Champ mot de passe — même look que FormField
 */
export const PasswordField = ({
    label,
    value,
    onChangeText,
    onBlur,
    placeholder,
    required = false,
    errors,
    touchedFields,
}: PasswordFieldProps) => {
    const [isVisible, setIsVisible] = useState(false);
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
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.background,
                        borderWidth: showError ? 1 : 0,
                        borderColor: showError ? colors.danger : 'transparent',
                    },
                ]}
            >
                <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    value={value}
                    onChangeText={onChangeText}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!isVisible}
                    accessibilityLabel={required ? `${label}, obligatoire` : label}
                />
                <Pressable
                    style={styles.eyeButton}
                    onPress={() => setIsVisible(!isVisible)}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons
                        name={isVisible ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.placeholder}
                    />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: FORM_FIELD_RADIUS,
        height: FORM_FIELD_HEIGHT,
    },
    formInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        height: FORM_FIELD_HEIGHT,
    },
    eyeButton: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
});
