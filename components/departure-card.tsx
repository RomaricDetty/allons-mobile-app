// @ts-nocheck
import { formatDuration, formatPrice } from '@/constants/functions';
import { DepartureCardProps } from '@/types';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


/**
 * Composant de carte de départ
 * Affiche une carte avec les informations d'un trajet populaire
 */
export function DepartureCard({ item, width, height, onPress }: DepartureCardProps) {
    const route = `${item.stationFrom.cityName} → ${item.stationTo.cityName}`;
    const duration = formatDuration(item.durationMinutes);

    return (
        <Pressable
            key={item.id}
            style={[
                styles.bannerContainer,
                {
                    width: width - 45,
                    height: height / 6
                }
            ]}
            onPress={() => onPress?.(item)}
        >
            {/* Icône en arrière-plan avec opacité réduite */}
            <View style={styles.bannerBackgroundIcon}>
                <MaterialCommunityIcons
                    name="bus"
                    size={120}
                    color="#FFFFFF"
                    style={styles.backgroundIconStyle}
                />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    {/* Titre de la carte */}
                    <Text style={styles.bannerTitle}>
                        {route}
                    </Text>
                    {/* Sous-titre de la carte */}
                    <Text style={styles.bannerSubtitle}>
                        {item.companyName}
                    </Text>
                    {/* Informations de la carte */}
                    <View style={styles.bannerInfo}>
                        <View style={styles.bannerInfoItem}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={14}
                                color="#FFFFFF"
                            />
                            <Text style={styles.bannerInfoText}>{duration}</Text>
                        </View>
                        <Text style={styles.bannerSeparator}>-</Text>
                        <View style={styles.bannerInfoItem}>
                            <Text style={styles.bannerInfoText}>
                                {formatPrice(item.basePrice)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        borderRadius: 15,
        backgroundColor: '#1776ba',
        marginRight: 5,
        overflow: 'hidden',
        position: 'relative',
    },
    bannerBackgroundIcon: {
        position: 'absolute',
        right: -40,
        top: '50%',
        transform: [{ translateY: -60 }],
        opacity: 0.10,
        zIndex: 0,
    },
    backgroundIconStyle: {
        opacity: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        zIndex: 1,
        position: 'relative',
    },
    textContainer: {
        gap: 5,
    },
    bannerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#ffffff',
    },
    bannerSubtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#ffffff',
    },
    bannerInfo: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    bannerInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    bannerInfoText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#ffffff',
    },
    bannerSeparator: {
        color: '#FFFFFF',
        fontFamily: 'Ubuntu_Medium',
        fontSize: 14,
    },
});
