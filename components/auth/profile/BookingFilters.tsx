// @ts-nocheck
import {
    FORM_FIELD_HEIGHT,
    FORM_FIELD_RADIUS,
    getFormFieldColors,
} from '@/constants/formField';
import { STATUS_LEGEND, STATUS_OPTIONS } from '@/constants/profile';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const COMPACT_H = 52;
const MEASURE_FALLBACK = 186;
const LEGEND_MAX_H = 200;

const SPRING = {
    damping: 22,
    stiffness: 190,
    mass: 0.8,
};

interface BookingFiltersProps {
    searchQuery: string;
    selectedStatus: string;
    onSearchChange: (query: string) => void;
    onStatusPress: () => void;
    collapsed?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
}

/**
 * Filtres réservations — hors liste.
 * Animation : les 2 blocs restent en flux (pas d’absolute), hauteurs spring.
 * Légende : scroll interne (maxHeight) pour ne jamais bloquer l’écran.
 */
export const BookingFilters: React.FC<BookingFiltersProps> = ({
    searchQuery,
    selectedStatus,
    onSearchChange,
    onStatusPress,
    collapsed = false,
    onExpand,
    onCollapse,
}) => {
    const colors = useAppColors();
    const colorScheme = useColorScheme() ?? 'light';
    const fieldColors = getFormFieldColors(colorScheme);
    const [legendOpen, setLegendOpen] = useState(false);

    /** 0 = collapsed, 1 = expanded */
    const open = useSharedValue(collapsed ? 0 : 1);
    const expandedH = useSharedValue(MEASURE_FALLBACK);

    useEffect(() => {
        open.value = withSpring(collapsed ? 0 : 1, SPRING);
        if (collapsed) setLegendOpen(false);
    }, [collapsed, open]);

    const selectedStatusLabel = useMemo(
        () =>
            selectedStatus
                ? STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label
                : 'Tous les statuts',
        [selectedStatus],
    );

    const hasActiveFilters = Boolean(searchQuery.trim() || selectedStatus);
    const compactSearchLabel = searchQuery.trim() || 'Rechercher';
    const compactStatusLabel = selectedStatus
        ? STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label || 'Filtré'
        : 'Filtres';

    const expandedWrapStyle = useAnimatedStyle(() => {
        const h = interpolate(
            open.value,
            [0, 1],
            [0, expandedH.value],
            Extrapolation.CLAMP,
        );
        return {
            height: h,
            opacity: interpolate(open.value, [0, 0.4, 1], [0, 0.35, 1], Extrapolation.CLAMP),
            marginBottom: interpolate(open.value, [0, 1], [0, 0], Extrapolation.CLAMP),
            overflow: 'hidden',
        };
    });

    const compactWrapStyle = useAnimatedStyle(() => {
        const h = interpolate(open.value, [0, 1], [COMPACT_H, 0], Extrapolation.CLAMP);
        return {
            height: h,
            opacity: interpolate(open.value, [0, 0.55, 1], [1, 0.2, 0], Extrapolation.CLAMP),
            overflow: 'hidden',
        };
    });

    return (
        <View
            style={[
                styles.outer,
                {
                    backgroundColor: colors.scrollBackground,
                },
            ]}
        >
            {/* Panneau étendu — hauteur animée, contenu mesuré en absolute */}
            <Animated.View style={expandedWrapStyle} pointerEvents={collapsed ? 'none' : 'auto'}>
                <View
                    style={styles.measureLayer}
                    onLayout={(e) => {
                        const h = Math.ceil(e.nativeEvent.layout.height);
                        if (h > 0 && Math.abs(h - expandedH.value) > 1) {
                            expandedH.value = h;
                        }
                    }}
                >
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>
                                Recherche & filtres
                            </Text>
                            {!!onCollapse && (
                                <Pressable
                                    onPress={onCollapse}
                                    hitSlop={10}
                                    accessibilityLabel="Réduire les filtres"
                                >
                                    <MaterialCommunityIcons
                                        name="chevron-up"
                                        size={22}
                                        color={colors.secondaryText}
                                    />
                                </Pressable>
                            )}
                        </View>

                        <View
                            style={[
                                styles.searchField,
                                { backgroundColor: fieldColors.background },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="magnify"
                                size={20}
                                color={colors.activeTabColor}
                            />
                            <TextInput
                                style={[styles.searchInput, { color: fieldColors.text }]}
                                placeholder="Ville, référence ou compagnie"
                                placeholderTextColor={fieldColors.placeholder}
                                value={searchQuery}
                                onChangeText={onSearchChange}
                                returnKeyType="search"
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <Pressable
                            style={[
                                styles.statusFilter,
                                { backgroundColor: fieldColors.background },
                            ]}
                            onPress={onStatusPress}
                            android_ripple={{ color: 'rgba(23, 118, 186, 0.08)' }}
                        >
                            <MaterialCommunityIcons
                                name="filter-variant"
                                size={20}
                                color={selectedStatus ? colors.activeTabColor : colors.icon}
                            />
                            <Text
                                style={[
                                    styles.statusFilterText,
                                    {
                                        color: selectedStatus
                                            ? fieldColors.text
                                            : fieldColors.placeholder,
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {selectedStatusLabel}
                            </Text>
                            <MaterialCommunityIcons
                                name="chevron-down"
                                size={20}
                                color={colors.secondaryText}
                            />
                        </Pressable>

                        <Pressable
                            style={styles.legendToggle}
                            onPress={() => setLegendOpen((v) => !v)}
                            hitSlop={8}
                        >
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={16}
                                color={colors.activeTabColor}
                            />
                            <Text
                                style={[styles.legendToggleText, { color: colors.activeTabColor }]}
                            >
                                {legendOpen
                                    ? 'Masquer la légende des statuts'
                                    : 'Que signifient les statuts ?'}
                            </Text>
                        </Pressable>

                        {legendOpen && (
                            <ScrollView
                                style={[
                                    styles.legendBox,
                                    { backgroundColor: fieldColors.background },
                                ]}
                                contentContainerStyle={styles.legendContent}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
                                bounces={false}
                            >
                                {STATUS_LEGEND.map((item) => (
                                    <View key={item.label} style={styles.legendRow}>
                                        <Text
                                            style={[styles.legendLabel, { color: fieldColors.text }]}
                                        >
                                            {item.label}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.legendDesc,
                                                { color: colors.secondaryText },
                                            ]}
                                        >
                                            {item.description}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Animated.View>

            {/* Barre compacte */}
            <Animated.View style={compactWrapStyle} pointerEvents={collapsed ? 'auto' : 'none'}>
                <Pressable
                    style={[
                        styles.compactBar,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        },
                    ]}
                    onPress={onExpand}
                    accessibilityRole="button"
                    accessibilityLabel="Ouvrir recherche et filtres"
                    android_ripple={{ color: 'rgba(23, 118, 186, 0.08)' }}
                >
                    <View
                        style={[styles.compactChip, { backgroundColor: fieldColors.background }]}
                    >
                        <MaterialCommunityIcons
                            name="magnify"
                            size={18}
                            color={colors.activeTabColor}
                        />
                        <Text
                            style={[
                                styles.compactChipText,
                                {
                                    color: searchQuery.trim()
                                        ? fieldColors.text
                                        : fieldColors.placeholder,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {compactSearchLabel}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.compactChip,
                            styles.compactChipNarrow,
                            { backgroundColor: fieldColors.background },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="filter-variant"
                            size={18}
                            color={selectedStatus ? colors.activeTabColor : colors.icon}
                        />
                        <Text
                            style={[
                                styles.compactChipText,
                                {
                                    color: selectedStatus
                                        ? fieldColors.text
                                        : fieldColors.placeholder,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {compactStatusLabel}
                        </Text>
                        {hasActiveFilters && (
                            <View
                                style={[
                                    styles.activeDot,
                                    { backgroundColor: colors.activeTabColor },
                                ]}
                            />
                        )}
                    </View>

                    <View style={[styles.expandBtn, { backgroundColor: colors.activeTabColor }]}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#FFFFFF" />
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    outer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    measureLayer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
    },
    card: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 1,
        padding: 14,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    searchField: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        paddingVertical: 0,
        height: FORM_FIELD_HEIGHT,
    },
    statusFilter: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusFilterText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    legendToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
    },
    legendToggleText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    legendBox: {
        borderRadius: FORM_FIELD_RADIUS,
        maxHeight: LEGEND_MAX_H,
    },
    legendContent: {
        padding: 12,
        gap: 10,
    },
    legendRow: {
        gap: 2,
    },
    legendLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    legendDesc: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 16,
    },
    compactBar: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 1,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: COMPACT_H,
    },
    compactChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 36,
        overflow: 'hidden',
    },
    compactChipNarrow: {
        flex: 0.85,
    },
    compactChipText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    activeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    expandBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
