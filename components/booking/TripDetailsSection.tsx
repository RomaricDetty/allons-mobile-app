import { SectionCardHeader } from '@/components/ui/SectionCardHeader';
import { formatFullDate } from '@/constants/functions';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
 * Bloc trajet — en-tête et lignes alignés sur le billet.
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
            <SectionCardHeader
                title={title}
                textColor={textColor}
                icon={<Icon name="map-marker-path" size={22} color={primaryBlue} />}
            />
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Itinéraire</Text>
                <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
                    {trip.stationFrom.city} → {trip.stationTo.city}
                </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date</Text>
                <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
                    {formatFullDate(trip.departureDateTime)}
                </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Départ</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.departureTime}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Arrivée estimée</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.arrivalTime}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Durée</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{trip.duration}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Compagnie</Text>
                <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
                    {trip.companyName}
                </Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Véhicule</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                    {trip.bus.licencePlate}
                </Text>
            </View>
        </View>
    );
});

TripDetailsSection.displayName = 'TripDetailsSection';

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    detailRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    detailLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        flexShrink: 0,
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
});
