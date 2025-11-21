// @ts-nocheck
import { formatPrice } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DepartureCardProps } from '@/types';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


/**
 * Composant de carte de départ
 * Affiche une carte verticale avec image, prix et nom du trajet
 */
export function DepartureCard({ item, width, height, onPress }: DepartureCardProps) {
    const route = `${item.stationFrom.cityName} → ${item.stationTo.cityName}`;
    const price = formatPrice(item.basePrice).replace(' F CFA', ' F');
    const colorScheme = useColorScheme() ?? 'dark';
    // Largeur de la carte basée sur la largeur de l'écran
    const cardWidth = (width - 100) / 2.2; // Environ 2.2 cartes visibles avec espacement
    const imageBackgroundColor = colorScheme === 'dark' ? '#1776BA' : '#2C2C2E';
    return (
        <Pressable
            key={item.id}
            style={[styles.cardContainer, { width: cardWidth }]}
            onPress={() => onPress?.(item)}
        >
            {/* Zone d'image avec fond gris clair */}
            <View style={[styles.imageContainer, { backgroundColor: '#dfe7f4' }]}>
                <MaterialCommunityIcons
                    name="bus"
                    size={60}
                    color={'#1776BA'}
                />
            </View>
            
            {/* Zone de contenu avec prix et nom */}
            <View style={styles.contentContainer}>
                {/* Prix en gras */}
                <Text style={styles.priceText}>{price}</Text>
                {/* Nom de la route */}
                <Text style={styles.routeText} numberOfLines={2}>
                    {route}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#bfcfe8',
    },
    imageContainer: {
        width: '100%',
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 10,
        backgroundColor: '#FFFFFF',
    },
    priceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#11181C',
        marginBottom: 6,
    },
    routeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#11181C',
        lineHeight: 18,
    },
});
