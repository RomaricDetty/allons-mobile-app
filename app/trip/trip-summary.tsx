// @ts-nocheck
import { getFeesAndTaxesQuote } from '@/api/booking';
import { capitalizeBusType, formatFullDate, formatPrice } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SearchParams, Trip } from '@/types';
import { getAuthToken } from '@/utils/storage';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
 * Composant pour afficher une carte de voyage
 */
interface TripCardProps {
    trip: Trip;
    label: string;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
    tintColor: string;
    separatorColor: string;
}

const TripCard = React.memo<TripCardProps>(({
    trip,
    label,
    cardBackgroundColor,
    borderColor,
    textColor,
    secondaryTextColor,
    tintColor,
    separatorColor,
}) => {
    return (
        <View style={[styles.tripCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <View style={styles.tripCardHeader}>
                <Text style={[styles.tripCardLabel, { color: textColor }]}>{label}</Text>
                <Text style={[styles.tripCardCompany, { color: textColor }]}>{trip.company}</Text>
            </View>

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

                <View style={styles.arrivalSection}>
                    <Text style={[styles.time, { textAlign: 'right', color: textColor }]}>{trip.arrivalTime}</Text>
                    <Text style={[styles.city, { textAlign: 'right', color: textColor }]}>{trip.arrivalCity}</Text>
                    <Text style={[styles.station, { textAlign: 'right', color: secondaryTextColor }]}>{trip.arrivalStation}</Text>
                </View>
            </View>

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
                        <View key={`${trip.id}-option-${index}`} style={styles.amenityItem}>
                            <Icon name="check-circle" size={16} color="#4CAF50" />
                            <Text style={[styles.amenityText, { color: textColor }]}>{option}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
});

TripCard.displayName = 'TripCard';

/**
 * Composant pour afficher une carte de passager
 */
interface PassengerCardProps {
    index: number;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
}

const PassengerCard = React.memo<PassengerCardProps>(({
    index,
    cardBackgroundColor,
    borderColor,
    textColor,
    secondaryTextColor,
}) => {
    return (
        <View key={index} style={[styles.passengerCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <Text style={[styles.passengerCardTitle, { color: textColor }]}>Passager {index}</Text>
            <Text style={[styles.passengerCardText, { color: secondaryTextColor }]}>
                Les informations seront complétées à l'étape suivante
            </Text>
        </View>
    );
});

PassengerCard.displayName = 'PassengerCard';

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
    
    // Mémorisation des couleurs spécifiques pour l'écran
    const colors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        progressBarBackgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        progressDotBackgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        separatorColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryButtonBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
    }), [colorScheme]);

    // Récupération des données passées en paramètre
    const { trip, returnTrip, searchParams } = (route.params as { 
        trip?: Trip, 
        returnTrip?: Trip,
        searchParams?: SearchParams 
    }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;
    const isRoundTrip = !!returnTrip;
    const [feesTotal, setFeesTotal] = useState(0);
    const [taxesTotal, setTaxesTotal] = useState(0);
    const [apiTotalAmount, setApiTotalAmount] = useState(0);

    /**
     * Construit le tableau passagers requis par l'API frais/taxes.
     */
    const buildFeesPassengersPayload = useCallback(() => {
        const payload: Array<{ price: number; leg: 'OUTBOUND' | 'RETURN' }> = [];
        for (let i = 0; i < numberOfPersons; i += 1) {
            payload.push({ price: trip.price, leg: 'OUTBOUND' });
            if (isRoundTrip && returnTrip) {
                payload.push({ price: returnTrip.price, leg: 'RETURN' });
            }
        }
        return payload;
    }, [numberOfPersons, trip?.price, isRoundTrip, returnTrip?.price]);

    // Mémorisation des calculs de prix
    const priceCalculations = useMemo(() => {
        if (!trip) return { totalPrice: 0, taxes: 0, amountDue: 0 };
        
        const outboundPrice = trip.price * numberOfPersons;
        const returnPrice = returnTrip ? returnTrip.price * numberOfPersons : 0;
        const totalPrice = outboundPrice + returnPrice;
        const taxes = taxesTotal;
        const amountDue = apiTotalAmount || totalPrice + taxesTotal + feesTotal;
        
        return { totalPrice, taxes, amountDue };
    }, [trip, returnTrip, numberOfPersons, taxesTotal, feesTotal, apiTotalAmount]);

    /**
     * Récupère le devis des frais/taxes depuis l'API.
     */
    const fetchFeesAndTaxes = useCallback(async () => {
        if (!trip?.id || !trip?.companyId) return;
        try {
            const token = await getAuthToken();
            const response = await getFeesAndTaxesQuote(
                {
                    companyId: trip.companyId,
                    channel: 'MOBILE_APP',
                    paymentMethod: 'MOBILE_MONEY',
                    paymentChannel: 'MOBILE_APP',
                    passengers: buildFeesPassengersPayload(),
                    outboundDepartureId: trip.id,
                    // departureTripId: trip.departureTripId ?? null,
                    // ...(isRoundTrip && returnTrip?.departureTripId ? { returnDepartureTripId: returnTrip.departureTripId } : {}),
                    ...(isRoundTrip && returnTrip?.id ? { returnDepartureId: returnTrip.id } : {}),
                },
                token || undefined
            );
            setFeesTotal(Number(response.data?.feesTotal || 0));
            setTaxesTotal(Number(response.data?.taxesTotal || 0));
            setApiTotalAmount(Number(response.data?.totalAmount || 0));
        } catch (error) {
            console.error('Erreur fees-and-taxes (trip-summary):', error);
        }
    }, [trip?.id, trip?.companyId, returnTrip?.id, isRoundTrip, buildFeesPassengersPayload]);

    useEffect(() => {
        fetchFeesAndTaxes();
    }, [fetchFeesAndTaxes]);

    // Mémorisation des cartes de passagers
    const passengerCards = useMemo(() => {
        return Array.from({ length: numberOfPersons }, (_, i) => (
            <PassengerCard
                key={i + 1}
                index={i + 1}
                cardBackgroundColor={colors.cardBackgroundColor}
                borderColor={colors.borderColor}
                textColor={textColor}
                secondaryTextColor={colors.secondaryTextColor}
            />
        ));
    }, [numberOfPersons, colors.cardBackgroundColor, colors.borderColor, textColor, colors.secondaryTextColor]);

    // Mémorisation du texte du voyageur
    const passengerText = useMemo(() => 
        numberOfPersons > 1 ? 'voyageurs' : 'voyageur',
        [numberOfPersons]
    );

    // Mémorisation des callbacks
    const handleNavigateToHome = useCallback(() => {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: '(tabs)' }] }));
    }, [navigation]);

    const handleNavigateToNextStep = useCallback(() => {
        if (!trip) return;
        navigation.navigate('trip/passengers-info', { 
            trip, 
            returnTrip: returnTrip || undefined,
            searchParams,
            feesAndTaxes: {
                feesTotal,
                taxesTotal,
                totalAmount: priceCalculations.amountDue,
            },
        });
    }, [navigation, trip, returnTrip, searchParams, feesTotal, taxesTotal, priceCalculations.amountDue]);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Mémorisation des villes de la route
    const routeCities = useMemo(() => {
        if (!trip) return [];
        const cities = [trip.departureCity, trip.arrivalCity];
        if (isRoundTrip && returnTrip) {
            cities.push(returnTrip.arrivalCity);
        }
        return cities;
    }, [trip, returnTrip, isRoundTrip]);

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: colors.scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackgroundColor }]}>
            {/* Header */}
            <View style={[
                styles.header, 
                { 
                    paddingTop: insets.top,
                    backgroundColor: colors.headerBackgroundColor,
                    borderBottomColor: colors.headerBorderColor
                }
            ]}>
                <Pressable
                    onPress={handleGoBack}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>

                <View style={styles.routeBadge}>
                    <Text style={[styles.routeBadgeText, { color: tintColor }]}>
                        {routeCities.map((city, index) => (
                            <React.Fragment key={`${city}-${index}`}>
                                {city}
                                {index < routeCities.length - 1 && (
                                    <> <Icon name="chevron-right" size={15} color={tintColor} /> </>
                                )}
                            </React.Fragment>
                        ))}
                    </Text>
                </View>

                <Text style={[styles.stepIndicator, { color: colors.secondaryTextColor }]}>Étape 1 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressContainer, { backgroundColor: colors.headerBackgroundColor }]}>
                <View style={[styles.progressBar, { backgroundColor: colors.progressBarBackgroundColor }]}>
                    <View style={[styles.progressFill, { width: '17%', backgroundColor: tintColor }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.secondaryTextColor }]}>17%</Text>
            </View>

            {/* Indicateurs de progression */}
            <View style={[styles.progressIndicators, { backgroundColor: colors.headerBackgroundColor }]}>
                <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
                <View style={[styles.progressDot, { backgroundColor: colors.progressDotBackgroundColor }]} />
                <View style={[styles.progressDot, { backgroundColor: colors.progressDotBackgroundColor }]} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={[styles.mainTitle, { color: textColor }]}>Résumé du voyage</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryTextColor }]}>
                        Vérifiez les détails de votre voyage avant de continuer
                    </Text>
                </View>

                {/* Carte principale du voyage aller */}
                <TripCard
                    trip={trip}
                    label="Voyage Aller"
                    cardBackgroundColor={colors.cardBackgroundColor}
                    borderColor={colors.borderColor}
                    textColor={textColor}
                    secondaryTextColor={colors.secondaryTextColor}
                    tintColor={tintColor}
                    separatorColor={colors.separatorColor}
                />

                {/* Carte du voyage retour (si aller-retour) */}
                {isRoundTrip && returnTrip && (
                    <View style={{ marginTop: 20 }}>
                        <TripCard
                            trip={returnTrip}
                            label="Voyage Retour"
                            cardBackgroundColor={colors.cardBackgroundColor}
                            borderColor={colors.borderColor}
                            textColor={textColor}
                            secondaryTextColor={colors.secondaryTextColor}
                            tintColor={tintColor}
                            separatorColor={colors.separatorColor}
                        />
                    </View>
                )}

                {/* Section Informations voyageurs */}
                <View style={styles.passengersSection}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Informations voyageurs</Text>
                    {passengerCards}
                </View>

                {/* Section Répartition des prix */}
                <View style={[styles.priceSection, { backgroundColor: colors.cardBackgroundColor, borderColor: colors.borderColor }]}>
                    <Text style={[styles.priceSectionTitle, { color: textColor }]}>Répartition des prix</Text>

                    <View style={styles.priceDetails}>
                        {isRoundTrip && returnTrip ? (
                            <>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: textColor }]}>
                                        Aller ({numberOfPersons} {passengerText})
                                    </Text>
                                    <Text style={[styles.priceValue, { color: textColor }]}>
                                        {formatPrice(trip.price * numberOfPersons)}
                                    </Text>
                                </View>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: textColor }]}>
                                        Retour ({numberOfPersons} {passengerText})
                                    </Text>
                                    <Text style={[styles.priceValue, { color: textColor }]}>
                                        {formatPrice(returnTrip.price * numberOfPersons)}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, { color: textColor }]}>
                                    {numberOfPersons} {passengerText}
                                </Text>
                                <Text style={[styles.priceValue, { color: textColor }]}>
                                    {formatPrice(priceCalculations.totalPrice)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: textColor }]}>Frais</Text>
                            <Text style={[styles.priceValue, { color: textColor }]}>
                                {formatPrice(feesTotal)}
                            </Text>
                        </View>
                        
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: textColor }]}>Taxes</Text>
                            <Text style={[styles.priceValue, { color: textColor }]}>
                                {formatPrice(priceCalculations.taxes)}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.priceSeparator, { backgroundColor: colors.separatorColor }]} />

                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Montant dû</Text>
                        <Text style={[styles.totalValue, { color: tintColor }]}>
                            {formatPrice(priceCalculations.amountDue)}
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
                                backgroundColor: colors.secondaryButtonBackgroundColor,
                                borderColor: colors.borderColor
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