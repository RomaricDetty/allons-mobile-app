// @ts-nocheck
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Type pour les données d'un itinéraire (affichage)
 */
export type ItineraryData = {
    id: number | string;
    route?: string;
    image?: any;
    compagnie?: string;
    tarif?: string;
    duree?: string | null;
    placesDisponibles?: number | null;
    /** Format API popularTrips : on construit route / tarif / duree si absents */
    stationFrom?: { cityName?: string };
    stationTo?: { cityName?: string };
    basePrice?: number;
    durationMinutes?: number;
};

type ItineraryCardProps = {
    item: ItineraryData;
    width?: number;
    height?: number;
    onPress?: (item: ItineraryData) => void;
};

/** Image par défaut si l’item n’en fournit pas (ex. popularTrips API) */
const DEFAULT_IMAGE = require('@/assets/images/default.jpg');

/** Correspondance (origine|destination) normalisée → image. Clé = "origine|destination" en minuscules sans accents. */
const ROUTE_IMAGES: Record<string, ReturnType<typeof require>> = {
    'abidjan|yamoussoukro': require('@/assets/images/basilique.jpg'),
    'abidjan|bouaké': require('@/assets/images/bouake.jpg'),
    'abidjan|bouake': require('@/assets/images/bouake.jpg'),
    'divo|bouaké': require('@/assets/images/divo.jpg'),
    'divo|bouake': require('@/assets/images/divo.jpg'),
    'yamoussoukro|boundiali': require('@/assets/images/yakro.jpg'),
};

/**
 * Normalise un nom de ville pour la clé de correspondance (minuscules, sans accents).
 */
function normalizeCityKey(name: string): string {
    return String(name)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

/**
 * Retourne l'image associée au trajet origine → destination, ou l'image par défaut.
 */
function getImageForRoute(origin: string, destination: string): ReturnType<typeof require> {
    if (!origin || !destination) return DEFAULT_IMAGE;
    const key = `${normalizeCityKey(origin)}|${normalizeCityKey(destination)}`;
    return ROUTE_IMAGES[key] ?? DEFAULT_IMAGE;
}

/**
 * Composant de carte d'itinéraire.
 * Accepte le format affichage (route, image, tarif) ou le format API (stationFrom, stationTo, basePrice).
 */
export function ItineraryCard({ item, onPress }: ItineraryCardProps) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 40 - 15) / 2;

    const routeStr =
        item.route ??
        (item.stationFrom?.cityName && item.stationTo?.cityName
            ? `${item.stationFrom.cityName} → ${item.stationTo.cityName}`
            : '');
    const destination = routeStr ? (routeStr.split('→')[1]?.trim() || routeStr) : '—';
    const origin = routeStr ? (routeStr.split('→')[0]?.trim() || '') : '—';

    const imageSource = item.image ?? getImageForRoute(origin, destination);

    const tarif = item.tarif ?? (item.basePrice != null ? `${Number(item.basePrice).toLocaleString('fr-FR')} XOF` : '—');
    const duree =
        item.duree ??
        (item.durationMinutes != null
            ? `${Math.floor(item.durationMinutes / 60)}h${item.durationMinutes % 60 ? String(item.durationMinutes % 60).padStart(2, '0') : '00'}`
            : null);

    return (
        <Pressable
            style={[styles.card, { width: cardWidth }]}
            onPress={() => onPress?.(item)}>
            <ImageBackground
                source={imageSource}
                style={styles.image}
                resizeMode="cover">
                <View style={styles.overlay} />
                
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{tarif}</Text>
                </View>
                
                <View style={styles.bottomContent}>
                    <View style={styles.locationContainer}>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationOrigin}>{origin}</Text>
                            <Text style={styles.locationDestination}>{destination}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.infoRow}>
                        {duree && (
                            <View style={styles.infoBadge}>
                                <MaterialCommunityIcons 
                                    name="clock-outline" 
                                    size={12} 
                                    color="#FFFFFF" 
                                />
                                <Text style={styles.infoText}>{duree}</Text>
                            </View>
                        )}
                        
                        {item.placesDisponibles != null && item.placesDisponibles !== undefined && (
                            <View style={[
                                styles.infoBadge,
                                item.placesDisponibles < 5 && styles.infoBadgeUrgent
                            ]}>
                                <MaterialCommunityIcons 
                                    name="seat-passenger" 
                                    size={12} 
                                    color="#FFFFFF" 
                                />
                                <Text style={styles.infoText}>{item.placesDisponibles} places</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ImageBackground>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        aspectRatio: 0.85,
    },
    image: {
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    priceBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        margin: 12,
        marginBottom: 'auto',
    },
    priceText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
    },
    bottomContent: {
        paddingHorizontal: 10,
        paddingBottom: 15,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    locationTextContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationOrigin: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
    },
    locationDestination: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 2,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    infoBadgeUrgent: {
        backgroundColor: 'rgba(255, 87, 34, 0.8)',
    },
    infoText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
    },
});
