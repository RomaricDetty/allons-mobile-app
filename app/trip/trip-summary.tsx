// @ts-nocheck
import { capitalizeBusType, formatFullDate, formatPrice } from '@/constants/functions';
import { SearchParams, Trip } from '@/types';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran de résumé du voyage (Étape 1 sur 3)
 * Affiche les détails du voyage sélectionné, les informations voyageurs et la répartition des prix
 */
const TripSummary = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // Récupération des données passées en paramètre
    const { trip, searchParams } = (route.params as { trip?: Trip, searchParams?: SearchParams }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;

    if (!trip) {
        return (
            <View style={styles.container}>
                <Text>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    /**
     * Calcule le prix total pour tous les voyageurs
     */
    const totalPrice = useMemo(() => {
        return trip.price * numberOfPersons;
    }, [trip.price, numberOfPersons]);

    /**
     * Calcule les frais (fixe à 500 FCFA pour l'instant)
     */
    const fees = 500;
    const taxes = 0;
    const amountDue = totalPrice + fees + taxes;

    /**
     * Génère les cartes de passagers
     */
    const renderPassengerCards = () => {
        const cards = [];
        for (let i = 1; i <= numberOfPersons; i++) {
            cards.push(
                <View key={i} style={styles.passengerCard}>
                    <Text style={styles.passengerCardTitle}>Passager {i}</Text>
                    <Text style={styles.passengerCardText}>
                        Les informations seront complétées à l'étape suivante
                    </Text>
                </View>
            );
        }
        return cards;
    };

    /**
     * Gère la navigation vers la page d'accueil
     * tout en supprimant toutes les pages précédentes
     */
    const handleNavigateToHome = () => {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: '(tabs)' }] }));
        // Autre façon de faire la navigation vers la page d'accueil en supprimant toutes les pages précédentes
        // router.dismissAll();
        // router.replace('/(tabs)');
    }

    /**
     * Gère la navigation vers l'étape suivante
     */
    const handleNavigateToNextStep = () => {
        navigation.navigate('trip/passengers-info', { trip, searchParams });
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color="#000" />
                </Pressable>

                <View style={styles.routeBadge}>
                    <Text style={styles.routeBadgeText}>
                        {trip.departureCity} <Icon name="chevron-right" size={15} color="#1776BA" /> {trip.arrivalCity}
                    </Text>
                </View>

                <Text style={styles.stepIndicator}>Étape 1 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '17%' }]} />
                </View>
                <Text style={styles.progressText}>17%</Text>
            </View>

            {/* Indicateurs de progression */}
            <View style={styles.progressIndicators}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={styles.mainTitle}>Résumé du voyage</Text>
                    <Text style={styles.subtitle}>
                        Vérifiez les détails de votre voyage avant de continuer
                    </Text>
                </View>

                {/* Carte principale du voyage */}
                <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                        <Text style={styles.tripCardLabel}>Voyage</Text>
                        <Text style={styles.tripCardCompany}>{trip.company}</Text>
                    </View>

                    {/* Section Départ/Arrivée */}
                    <View style={styles.tripDetails}>
                        <View style={styles.departureSection}>
                            <Text style={styles.time}>{trip.departureTime}</Text>
                            <Text style={styles.city}>{trip.departureCity}</Text>
                            <Text style={styles.station}>{trip.departureStation}</Text>
                        </View>

                        <View style={styles.timelineContainer}>
                            <Text style={styles.duration}>{trip.duration}</Text>
                            <View style={styles.timelineLine} />
                            <View style={styles.timelineDot} />
                            <Text style={styles.date}>
                                {formatFullDate(trip.departureDateTime)}
                            </Text>
                        </View>

                        <View style={styles.arrivalSection}>
                            <Text style={styles.time}>{trip.arrivalTime}</Text>
                            <Text style={styles.city}>{trip.arrivalCity}</Text>
                            <Text style={styles.station}>{trip.arrivalStation}</Text>
                        </View>
                    </View>

                    {/* Véhicule et Équipements */}
                    <View style={styles.vehicleSection}>
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleLabel}>Véhicule : </Text>
                            <Text style={styles.vehicleNumber}>{trip.licencePlate}</Text>
                            <View style={styles.businessBadge}>
                                <Text style={styles.businessBadgeText}>{capitalizeBusType(trip.busType)}</Text>
                            </View>
                        </View>
                        <View style={styles.amenitiesContainer}>
                            {trip.options.map((option, index) => (
                                <View key={index} style={styles.amenityItem}>
                                    <Icon name="check-circle" size={16} color="#4CAF50" />
                                    <Text style={styles.amenityText}>{option}</Text>

                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Section Informations voyageurs */}
                <View style={styles.passengersSection}>
                    <Text style={styles.sectionTitle}>Informations voyageurs</Text>
                    {renderPassengerCards()}
                </View>

                {/* Section Répartition des prix */}
                <View style={styles.priceSection}>
                    <Text style={styles.priceSectionTitle}>Répartition des prix</Text>

                    <View style={styles.priceDetails}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>
                                {numberOfPersons} {numberOfPersons > 1 ? 'voyageurs' : 'voyageur'}
                            </Text>
                            <Text style={styles.priceValue}>
                                {formatPrice(totalPrice)}
                            </Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Taxes</Text>
                            <Text style={styles.priceValue}>
                                {formatPrice(taxes)}
                            </Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Frais</Text>
                            <Text style={styles.priceValue}>
                                {formatPrice(fees)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.priceSeparator} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Montant dû</Text>
                        <Text style={styles.totalValue}>
                            {formatPrice(amountDue)}
                        </Text>
                    </View>

                    {/* Boutons d'action */}
                    <Pressable style={styles.primaryButton} onPress={handleNavigateToNextStep}>
                        <Text style={styles.primaryButtonText}>
                            Continuer
                        </Text>
                    </Pressable>

                    <Pressable style={styles.secondaryButton}
                        onPress={handleNavigateToHome}>
                        <Text style={styles.secondaryButtonText}>
                            Annuler la réservation
                        </Text>
                    </Pressable>

                    {/* Information box */}
                    {/* <View style={styles.infoBox}>
                        <Icon name="lock" size={20} color="#1776BA" />
                        <Text style={styles.infoBoxText}>
                            24H SANS RISQUE{'\n'}ANNULATIONS
                        </Text>
                    </View> */}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
    },
    routeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    routeBadgeText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
        color: '#1776BA'
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1776BA',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    progressDotActive: {
        backgroundColor: '#1776BA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    titleSection: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    tripCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    tripCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    tripCardLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    tripCardCompany: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    tripDetails: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 12,
    },
    departureSection: {
        flex: 1,
    },
    arrivalSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    time: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    city: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
        marginBottom: 2,
    },
    station: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    timelineContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    duration: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
        marginBottom: 4,
    },
    timelineLine: {
        width: 2,
        height: 40,
        backgroundColor: '#E0E0E0',
        marginBottom: 4,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1776BA',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    vehicleSection: {
        flexDirection: 'column',
        // justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F3F7',
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    vehicleLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    vehicleNumber: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    amenitiesContainer: {
        marginTop: 22,
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
        gap: 6,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 6,
        marginBottom: 6,
        // position: 'relative',
    },
    amenityText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    businessBadge: {
        backgroundColor: 'rgba(156, 39, 176, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    businessBadgeText: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Medium',
        color: '#9C27B0',
    },
    passengersSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 12,
    },
    passengerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    passengerCardTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 8,
    },
    passengerCardText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    priceSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    priceSectionTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 16,
    },
    priceDetails: {
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    priceValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    priceSeparator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    totalLabel: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
    },
    primaryButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    secondaryButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 16,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    infoBoxText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
        textTransform: 'uppercase',
    },
});

export default TripSummary;