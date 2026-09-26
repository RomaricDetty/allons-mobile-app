import { useAppColors } from '@/hooks/use-app-colors';
import {
    FORM_FIELD_RADIUS,
    FORM_FIELD_TEXTAREA_MIN_HEIGHT,
} from '@/constants/formField';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface CancellationReasonInputProps {
    value: string;
    onChangeText: (text: string) => void;
}

/**
 * Champ de saisie pour la raison d'annulation
 */
export const CancellationReasonInput: React.FC<CancellationReasonInputProps> = ({
    value,
    onChangeText,
}) => {
    const colors = useAppColors();

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Raison de l'annulation</Text>
            <TextInput
                style={[
                    styles.textArea,
                    {
                        backgroundColor: colors.inputBackground,
                        color: colors.text,
                    },
                ]}
                placeholder="Veuillez indiquer la raison de l'annulation..."
                placeholderTextColor={colors.placeholder}
                value={value}
                onChangeText={onChangeText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />
            <Text style={[styles.helperText, { color: colors.secondaryText }]}>
                Ce champ est obligatoire
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        borderRadius: FORM_FIELD_RADIUS,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    textArea: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        minHeight: FORM_FIELD_TEXTAREA_MIN_HEIGHT,
    },
    helperText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 8,
    },
});
