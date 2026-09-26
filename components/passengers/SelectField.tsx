// @ts-nocheck
import {
    FORM_FIELD_HEIGHT,
    formFieldBaseStyles,
    getFormFieldColors,
} from '@/constants/formField';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SelectFieldProps {
    label: string;
    value: string;
    placeholder: string;
    required?: boolean;
    selectionType: 'passengerType' | 'relation' | 'countryCode' | 'country';
    options: Array<{ value: string; label: string; name?: string }>;
    onSelect: (value: string) => void;
    onOpenBottomSheet: (
        type: 'passengerType' | 'relation' | 'countryCode' | 'country',
        title: string,
        options: Array<{ value: string; label: string; name?: string }>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => void;
}

/**
 * Sélecteur — même look que FormField
 */
export const SelectField = ({
    label,
    value,
    placeholder,
    required = false,
    selectionType,
    options,
    onSelect,
    onOpenBottomSheet,
}: SelectFieldProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = getFormFieldColors(colorScheme);
    const appColors = useAppColors();

    const handlePress = () => {
        onOpenBottomSheet(selectionType, label, options, value, onSelect);
    };

    const selectedOption = options.find((option) => option.value === value);
    const displayText = selectedOption
        ? selectedOption.label || selectedOption.name || selectedOption.value
        : placeholder;

    return (
        <View style={[formFieldBaseStyles.field, !label && { marginBottom: 0 }]}>
            {!!label && (
                <Text style={[formFieldBaseStyles.label, { color: colors.text }]}>
                    {label}{' '}
                    {required && <Text style={{ color: colors.danger }}>*</Text>}
                </Text>
            )}
            <Pressable
                style={[
                    formFieldBaseStyles.select,
                    {
                        backgroundColor: colors.background,
                        height: FORM_FIELD_HEIGHT,
                    },
                ]}
                onPress={handlePress}
            >
                <Text
                    style={{
                        fontSize: 14,
                        fontFamily: 'Ubuntu_Regular',
                        color: value ? colors.text : colors.placeholder,
                        flex: 1,
                    }}
                    numberOfLines={1}
                >
                    {displayText}
                </Text>
                <Icon name="chevron-down" size={20} color={appColors.icon} />
            </Pressable>
        </View>
    );
};
