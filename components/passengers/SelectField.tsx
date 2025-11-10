// @ts-nocheck
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SelectFieldProps {
    label: string;
    value: string;
    placeholder: string;
    required?: boolean;
    selectionType: 'passengerType' | 'relation';
    options: Array<{value: string, label: string}>;
    onSelect: (value: string) => void;
    onOpenBottomSheet: (
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{value: string, label: string}>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => void;
}

/**
 * Composant pour un sélecteur (dropdown)
 */
export const SelectField = ({
    label,
    value,
    placeholder,
    required = false,
    selectionType,
    options,
    onSelect,
    onOpenBottomSheet
}: SelectFieldProps) => {
    const handlePress = () => {
        onOpenBottomSheet(selectionType, label, options, value, onSelect);
    };

    const selectedOption = options.find(option => option.value === value);
    return (
        <View style={styles.formField}>
            <Text style={styles.formLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <Pressable style={styles.selectInput} onPress={handlePress}>
                <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
            </Pressable>
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
    selectInput: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    selectPlaceholder: {
        color: '#A6A6AA',
    },
});

