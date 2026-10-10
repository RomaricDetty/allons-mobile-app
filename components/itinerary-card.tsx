// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
 * Carte d'itinéraire (expo-image + mémo pour perf scroll/home).
 */
export const ItineraryCard = memo(function ItineraryCard({ item, onPress }: ItineraryCardProps) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 40 - 15) / 2;
    const colorScheme = useColorScheme() ?? 'light';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    const { origin, destination, imageSource, tarif, duree } = useMemo(() => {
        const routeStr =
            item.route ??
            (item.stationFrom?.cityName && item.stationTo?.cityName
                ? `${item.stationFrom.cityName} → ${item.stationTo.cityName}`
                : '');
        const dest = routeStr ? routeStr.split('→')[1]?.trim() || routeStr : '—';
        const orig = routeStr ? routeStr.split('→')[0]?.trim() || '' : '—';
        return {
            origin: orig,
            destination: dest,
            imageSource: item.image ?? getImageForRoute(orig, dest),
            tarif:
                item.tarif ??
                (item.basePrice != null
                    ? `${Number(item.basePrice).toLocaleString('fr-FR')} XOF`
                    : '—'),
            duree:
                item.duree ??
                (item.durationMinutes != null
                    ? `${Math.floor(item.durationMinutes / 60)}h${
                          item.durationMinutes % 60
                              ? String(item.durationMinutes % 60).padStart(2, '0')
                              : '00'
                      }`
                    : null),
        };
    }, [item]);

    return (
        <Pressable
            style={[styles.card, { width: cardWidth, borderColor }]}
            onPress={() => onPress?.(item)}
        >
            <View style={styles.image}>
                <Image
                    source={imageSource}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={String(item.id)}
                    transition={120}
                />
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
                        {duree ? (
                            <View style={styles.infoBadge}>
                                <MaterialCommunityIcons name="clock" size={12} color="#FFFFFF" />
                                <Text style={styles.infoText}>{duree}</Text>
                            </View>
                        ) : null}

                        {item.placesDisponibles != null ? (
                            <View
                                style={[
                                    styles.infoBadge,
                                    item.placesDisponibles < 5 && styles.infoBadgeUrgent,
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="seat-passenger"
                                    size={12}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.infoText}>
                                    {item.placesDisponibles} places
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 4,
        borderWidth: 1,
        aspectRatio: 0.85,
    },
    image: {
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    priceBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        margin: 12,
        marginBottom: 'auto',
        zIndex: 1,
    },
    priceText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
    },
    bottomContent: {
        paddingHorizontal: 10,
        paddingBottom: 15,
        zIndex: 1,
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
