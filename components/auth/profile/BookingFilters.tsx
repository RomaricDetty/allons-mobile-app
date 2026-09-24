// @ts-nocheck
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
 * Filtres réservations : recherche + statut
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
            ? STATUS_OPTIONS.find((opt) => opt.value === selectedStatus)?.label
            : 'Tous les statuts';
    }, [selectedStatus]);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.searchField,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border,
                    },
                ]}
            >
                <View style={styles.iconBlock}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.activeTabColor} />
                </View>
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Ville, référence ou compagnie"
                    placeholderTextColor={colors.placeholder}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
            </View>

            <Pressable
                style={[
                    styles.statusFilter,
                    {
                        backgroundColor: colors.cardBackground,
                        borderColor: selectedStatus ? colors.activeTabColor : colors.border,
                    },
                ]}
                onPress={onStatusPress}
                android_ripple={{ color: 'rgba(23, 118, 186, 0.08)' }}
            >
                <View style={styles.iconBlock}>
                    <MaterialCommunityIcons
                        name="filter-variant"
                        size={20}
                        color={selectedStatus ? colors.activeTabColor : colors.icon}
                    />
                </View>
                <Text
                    style={[
                        styles.statusFilterText,
                        { color: selectedStatus ? colors.text : colors.placeholder },
                    ]}
                    numberOfLines={1}
                >
                    {selectedStatusLabel}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.secondaryText} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
        gap: 10,
    },
    searchField: {
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 48,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBlock: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        paddingVertical: 10,
    },
    statusFilter: {
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 48,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusFilterText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
});
