// @ts-nocheck
import { formatPrice } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { DepartureCardProps } from '@/types';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PRIMARY_COLOR = '#1776BA';

/**
 * Carte de départ (carousel / listes)
 */
export function DepartureCard({ item, width, onPress }: DepartureCardProps) {
    const colors = useAppColors();
    const route = `${item.stationFrom.cityName} → ${item.stationTo.cityName}`;
    const price = formatPrice(item.basePrice).replace(' F CFA', ' F');
    const cardWidth = (width - 100) / 2.2;

    return (
        <Pressable
            key={item.id}
            style={[
                styles.cardContainer,
                {
                    width: cardWidth,
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                },
            ]}
            onPress={() => onPress?.(item)}
        >
            <View style={[styles.imageContainer, { backgroundColor: colors.infoMuted }]}>
                <MaterialCommunityIcons name="bus" size={36} color={PRIMARY_COLOR} />
            </View>

            <View style={styles.contentContainer}>
                <Text style={[styles.priceText, { color: colors.text }]}>{price}</Text>
                <Text style={[styles.routeText, { color: colors.secondaryText }]} numberOfLines={2}>
                    {route}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imageContainer: {
        width: '100%',
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 12,
    },
    priceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    routeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
    },
});
