import { STATUS_OPTIONS } from '@/constants/profile';
import { useAppColors } from '@/hooks/use-app-colors';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface BookingFiltersProps {
    searchQuery: string;
    selectedStatus: string;
    onSearchChange: (query: string) => void;
    onStatusPress: () => void;
}

/**
 * Composant de filtres pour les réservations (recherche + statut)
 */
export const BookingFilters: React.FC<BookingFiltersProps> = ({
    searchQuery,
    selectedStatus,
    onSearchChange,
    onStatusPress,
}) => {
    const colors = useAppColors();

    const selectedStatusLabel = useMemo(() => {
        return selectedStatus
            ? STATUS_OPTIONS.find(opt => opt.value === selectedStatus)?.label
            : 'Tous les statuts';
    }, [selectedStatus]);

    return (
        <View style={[styles.container, { backgroundColor: colors.headerBackground }]}>
            <TextInput
                style={[
                    styles.searchInput,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border,
                        color: colors.text
                    }
                ]}
                placeholder="Rechercher par ville, référence ou compagnie"
                placeholderTextColor={colors.placeholder}
                value={searchQuery}
                onChangeText={onSearchChange}
            />
            <Pressable
                style={[
                    styles.statusFilter,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border
                    }
                ]}
                onPress={onStatusPress}
            >
                <Text style={[
                    styles.statusFilterText,
                    { color: selectedStatus ? colors.text : colors.placeholder }
                ]}>
                    {selectedStatusLabel}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.secondaryText} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    searchInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
    },
    statusFilter: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    statusFilterText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
});
