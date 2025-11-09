// @ts-nocheck
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Type pour les données d'un itinéraire
 */
export type ItineraryData = {
    id: number;
    route: string;
    image: any;
    compagnie: string;
    tarif: string;
    duree: string | null;
    placesDisponibles: number | null;
};

type ItineraryCardProps = {
    item: ItineraryData;
    onPress?: (id: number) => void;
};

/**
 * Composant de carte d'itinéraire
 * Affiche une carte avec image, localisation, tarif et informations pratiques
 */
export function ItineraryCard({ item, onPress }: ItineraryCardProps) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 40 - 15) / 2;
    
    const destination = item.route.split('→')[1]?.trim() || item.route;
    const origin = item.route.split('→')[0]?.trim() || '';

    return (
        <Pressable
            style={[styles.card, { width: cardWidth }]}
            onPress={() => onPress?.(item.id)}>
            <ImageBackground
                source={item.image}
                style={styles.image}
                resizeMode="cover">
                <View style={styles.overlay} />
                
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{item.tarif}</Text>
                </View>
                
                <View style={styles.bottomContent}>
                    <View style={styles.locationContainer}>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationOrigin}>{origin}</Text>
                            <Text style={styles.locationDestination}>{destination}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.infoRow}>
                        {item.duree && (
                            <View style={styles.infoBadge}>
                                <MaterialCommunityIcons 
                                    name="clock-outline" 
                                    size={12} 
                                    color="#FFFFFF" 
                                />
                                <Text style={styles.infoText}>{item.duree}</Text>
                            </View>
                        )}
                        
                        {item.placesDisponibles !== null && (
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
