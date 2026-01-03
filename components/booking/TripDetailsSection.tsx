import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatFullDate } from '@/constants/functions';

/**
 * Interface pour les données d'un trajet
 */
interface TripData {
    stationFrom: {
        city: string;
    };
    stationTo: {
        city: string;
    };
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    companyName: string;
    bus: {
        licencePlate: string;
    };
}

/**
 * Interface pour les props du composant
 */
interface TripDetailsSectionProps {
    trip: TripData;
    title: string;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
}

/**
 * Composant pour afficher les détails d'un trajet
 */
export const TripDetailsSection = memo<TripDetailsSectionProps>(({
    trip,
    title,
    cardBackgroundColor,
    borderColor,
    textColor,
    secondaryTextColor,
    primaryBlue,
}) => {
    return (
        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                <Icon name="map-outline" size={20} color={primaryBlue} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Itinéraire</Text>
                <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                    {trip.stationFrom.city} → {trip.stationTo.city}
                </Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date</Text>
                <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                    {formatFullDate(trip.departureDateTime)}
                </Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure de départ</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.departureTime}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure d'arrivée estimée</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.arrivalTime}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Durée</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.duration}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Compagnie</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.companyName}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Véhicule</Text>
                <Text style={[styles.detailValue, { color: textColor }]}> {trip.bus.licencePlate} </Text>
            </View>
        </View>
    );
});

TripDetailsSection.displayName = 'TripDetailsSection';

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
});


