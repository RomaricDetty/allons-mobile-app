// @ts-nocheck
import { capitalizeBusType, formatFullDate, formatPrice } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const progressBarBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const progressDotBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const separatorColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryButtonBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

    // Récupération des données passées en paramètre
    const { trip, returnTrip, searchParams } = (route.params as { 
        trip?: Trip, 
        returnTrip?: Trip,
        searchParams?: SearchParams 
    }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;
    const isRoundTrip = !!returnTrip;

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    /**
     * Calcule le prix total pour tous les voyageurs
     * Inclut le prix du voyage retour si c'est un aller-retour
     */
    const totalPrice = useMemo(() => {
        const outboundPrice = trip.price * numberOfPersons;
        const returnPrice = returnTrip ? returnTrip.price * numberOfPersons : 0;
        return outboundPrice + returnPrice;
    }, [trip.price, returnTrip?.price, numberOfPersons]);

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
                <View key={i} style={[styles.passengerCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <Text style={[styles.passengerCardTitle, { color: textColor }]}>Passager {i}</Text>
                    <Text style={[styles.passengerCardText, { color: secondaryTextColor }]}>
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
        navigation.navigate('trip/passengers-info', { 
            trip, 
            returnTrip: returnTrip || undefined,
            searchParams 
        });
    }

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header */}
            <View style={[
                styles.header, 
                { 
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>

                <View style={[styles.routeBadge, {width: '200'}]}>
                    <Text style={[styles.routeBadgeText, { color: tintColor }]}>
                        {trip.departureCity} <Icon name="chevron-right" size={15} color={tintColor} /> {trip.arrivalCity}
                        {isRoundTrip && returnTrip && (
                            <> <Icon name="chevron-right" size={15} color={tintColor} /> {returnTrip.arrivalCity}</>
                        )} 
                    </Text>
                </View>

                <Text style={[styles.stepIndicator, { color: secondaryTextColor}]}>Étape 1 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressContainer, { backgroundColor: headerBackgroundColor }]}>
                <View style={[styles.progressBar, { backgroundColor: progressBarBackgroundColor }]}>
                    <View style={[styles.progressFill, { width: '17%', backgroundColor: tintColor }]} />
                </View>
                <Text style={[styles.progressText, { color: secondaryTextColor }]}>17%</Text>
            </View>

            {/* Indicateurs de progression */}
            <View style={[styles.progressIndicators, { backgroundColor: headerBackgroundColor }]}>
                <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
                <View style={[styles.progressDot, { backgroundColor: progressDotBackgroundColor }]} />
                <View style={[styles.progressDot, { backgroundColor: progressDotBackgroundColor }]} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={[styles.mainTitle, { color: textColor }]}>Résumé du voyage</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        Vérifiez les détails de votre voyage avant de continuer
                    </Text>
                </View>

                {/* Carte principale du voyage aller */}
                <View style={[styles.tripCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.tripCardHeader}>
                        <Text style={[styles.tripCardLabel, { color: textColor }]}>Voyage Aller</Text>
                        <Text style={[styles.tripCardCompany, { color: textColor }]}>{trip.company}</Text>
                    </View>

                    {/* Section Départ/Arrivée */}
                    <View style={styles.tripDetails}>
                        <View style={styles.departureSection}>
                            <Text style={[styles.time, { textAlign: 'left', color: textColor }]}>{trip.departureTime}</Text>
                            <Text style={[styles.city, { textAlign: 'left', color: textColor }]}>{trip.departureCity}</Text>
                            <Text style={[styles.station, { textAlign: 'left', color: secondaryTextColor }]}>{trip.departureStation}</Text>
                        </View>

                        <View style={[styles.timelineContainer, { marginTop: 10 }]}>
                            <Text style={[styles.duration, { color: secondaryTextColor }]}>{trip.duration}</Text>
                            <View style={[styles.timelineLine, { backgroundColor: separatorColor }]} />
                            <View style={[styles.timelineDot, { backgroundColor: tintColor }]} />
                            <Text style={[styles.date, { color: secondaryTextColor }]}>
                                {formatFullDate(trip.departureDateTime)}
                            </Text>
                        </View>

                        <View style={[styles.arrivalSection]}>
                            <Text style={[styles.time, { textAlign: 'right', color: textColor }]}>{trip.arrivalTime}</Text>
                            <Text style={[styles.city, { textAlign: 'right', color: textColor }]}>{trip.arrivalCity}</Text>
                            <Text style={[styles.station, { textAlign: 'right', color: secondaryTextColor }]}>{trip.arrivalStation}</Text>
                        </View>
                    </View>

                    {/* Véhicule et Équipements */}
                    <View style={[styles.vehicleSection, { borderTopColor: borderColor }]}>
                        <View style={styles.vehicleInfo}>
                            <Text style={[styles.vehicleLabel, { color: secondaryTextColor }]}>Véhicule : </Text>
                            <Text style={[styles.vehicleNumber, { color: textColor }]}>{trip.licencePlate}</Text>
                            <View style={styles.businessBadge}>
                                <Text style={styles.businessBadgeText}>{capitalizeBusType(trip.busType)}</Text>
                            </View>
                        </View>
                        <View style={styles.amenitiesContainer}>
                            {trip.options.map((option, index) => (
                                <View key={index} style={[styles.amenityItem]}>
                                    <Icon name="check-circle" size={16} color="#4CAF50" />
                                    <Text style={[styles.amenityText, { color: textColor }]}>{option}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Carte du voyage retour (si aller-retour) */}
                {isRoundTrip && returnTrip && (
                    <View style={[styles.tripCard, { backgroundColor: cardBackgroundColor, borderColor, marginTop: 20 }]}>
                        <View style={styles.tripCardHeader}>
                            <Text style={[styles.tripCardLabel, { color: textColor }]}>Voyage Retour</Text>
                            <Text style={[styles.tripCardCompany, { color: textColor }]}>{returnTrip.company}</Text>
                        </View>

                        {/* Section Départ/Arrivée */}
                        <View style={styles.tripDetails}>
                            <View style={styles.departureSection}>
                                <Text style={[styles.time, { textAlign: 'left', color: textColor }]}>{returnTrip.departureTime}</Text>
                                <Text style={[styles.city, { textAlign: 'left', color: textColor }]}>{returnTrip.departureCity}</Text>
                                <Text style={[styles.station, { textAlign: 'left', color: secondaryTextColor }]}>{returnTrip.departureStation}</Text>
                            </View>

                            <View style={[styles.timelineContainer, { marginTop: 10 }]}>
                                <Text style={[styles.duration, { color: secondaryTextColor }]}>{returnTrip.duration}</Text>
                                <View style={[styles.timelineLine, { backgroundColor: separatorColor }]} />
                                <View style={[styles.timelineDot, { backgroundColor: tintColor }]} />
                                <Text style={[styles.date, { color: secondaryTextColor }]}>
                                    {formatFullDate(returnTrip.departureDateTime)}
                                </Text>
                            </View>

                            <View style={[styles.arrivalSection]}>
                                <Text style={[styles.time, { textAlign: 'right', color: textColor }]}>{returnTrip.arrivalTime}</Text>
                                <Text style={[styles.city, { textAlign: 'right', color: textColor }]}>{returnTrip.arrivalCity}</Text>
                                <Text style={[styles.station, { textAlign: 'right', color: secondaryTextColor }]}>{returnTrip.arrivalStation}</Text>
                            </View>
                        </View>

                        {/* Véhicule et Équipements */}
                        <View style={[styles.vehicleSection, { borderTopColor: borderColor }]}>
                            <View style={styles.vehicleInfo}>
                                <Text style={[styles.vehicleLabel, { color: secondaryTextColor }]}>Véhicule : </Text>
                                <Text style={[styles.vehicleNumber, { color: textColor }]}>{returnTrip.licencePlate}</Text>
                                <View style={styles.businessBadge}>
                                    <Text style={styles.businessBadgeText}>{capitalizeBusType(returnTrip.busType)}</Text>
                                </View>
                            </View>
                            <View style={styles.amenitiesContainer}>
                                {returnTrip.options.map((option, index) => (
                                    <View key={index} style={[styles.amenityItem]}>
                                        <Icon name="check-circle" size={16} color="#4CAF50" />
                                        <Text style={[styles.amenityText, { color: textColor }]}>{option}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Section Informations voyageurs */}
                <View style={styles.passengersSection}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Informations voyageurs</Text>
                    {renderPassengerCards()}
                </View>

                {/* Section Répartition des prix */}
                <View style={[styles.priceSection, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <Text style={[styles.priceSectionTitle, { color: textColor }]}>Répartition des prix</Text>

                    <View style={styles.priceDetails}>
                        {isRoundTrip && returnTrip ? (
                            <>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: textColor }]}>
                                        Aller ({numberOfPersons} {numberOfPersons > 1 ? 'voyageurs' : 'voyageur'})
                                    </Text>
                                    <Text style={[styles.priceValue, { color: textColor }]}>
                                        {formatPrice(trip.price * numberOfPersons)}
                                    </Text>
                                </View>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: textColor }]}>
                                        Retour ({numberOfPersons} {numberOfPersons > 1 ? 'voyageurs' : 'voyageur'})
                                    </Text>
                                    <Text style={[styles.priceValue, { color: textColor }]}>
                                        {formatPrice(returnTrip.price * numberOfPersons)}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, { color: textColor }]}>
                                    {numberOfPersons} {numberOfPersons > 1 ? 'voyageurs' : 'voyageur'}
                                </Text>
                                <Text style={[styles.priceValue, { color: textColor }]}>
                                    {formatPrice(totalPrice)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: textColor }]}>Taxes</Text>
                            <Text style={[styles.priceValue, { color: textColor }]}>
                                {formatPrice(taxes)}
                            </Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: textColor }]}>Frais</Text>
                            <Text style={[styles.priceValue, { color: textColor }]}>
                                {formatPrice(fees)}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.priceSeparator, { backgroundColor: separatorColor }]} />

                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Montant dû</Text>
                        <Text style={[styles.totalValue, { color: tintColor }]}>
                            {formatPrice(amountDue)}
                        </Text>
                    </View>

                    {/* Boutons d'action */}
                    <Pressable style={styles.primaryButton} onPress={handleNavigateToNextStep}>
                        <Text style={styles.primaryButtonText}>
                            Continuer
                        </Text>
                    </Pressable>

                    <Pressable 
                        style={[
                            styles.secondaryButton,
                            { 
                                backgroundColor: secondaryButtonBackgroundColor,
                                borderColor 
                            }
                        ]}
                        onPress={handleNavigateToHome}
                    >
                        <Text style={[styles.secondaryButtonText, { color: textColor }]}>
                            Annuler la réservation
                        </Text>
                    </Pressable>

                    {/* Information box */}
                    {/* <View style={styles.infoBox}>
                        <Icon name="lock" size={20} color={tintColor} />
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
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
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
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
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    tripCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
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
    },
    tripCardCompany: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
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
        fontSize: 23,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
        width: 100,
    },
    city: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 2,
    },
    station: {
        fontSize: 12,
        width: 100,
        fontFamily: 'Ubuntu_Regular',
    },
    timelineContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    duration: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    timelineLine: {
        width: 2,
        height: 40,
        marginBottom: 4,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    vehicleSection: {
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    vehicleLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    vehicleNumber: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
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
    },
    amenityText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    businessBadge: {
        backgroundColor: 'rgba(23, 118, 186, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    businessBadgeText: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Medium',
        color: '#1776BA',
    },
    passengersSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
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
        marginBottom: 8,
    },
    passengerCardText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    priceSection: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    priceSectionTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
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
    },
    priceValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    priceSeparator: {
        height: 1,
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
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
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
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 16,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
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