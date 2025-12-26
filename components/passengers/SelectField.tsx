// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    
    // Couleurs spécifiques pour le champ select
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    const handlePress = () => {
        onOpenBottomSheet(selectionType, label, options, value, onSelect);
    };

    const selectedOption = options.find(option => option.value === value);
    return (
        <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: textColor }]}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <Pressable 
                style={[
                    styles.selectInput,
                    {
                        backgroundColor: inputBackgroundColor,
                        borderColor: inputBorderColor
                    }
                ]} 
                onPress={handlePress}
            >
                <Text style={[
                    styles.selectText,
                    { color: value ? textColor : placeholderColor }
                ]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Icon name="chevron-down" size={20} color={iconColor} />
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
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    selectInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    selectPlaceholder: {
        // Couleur gérée dynamiquement
    },
});

