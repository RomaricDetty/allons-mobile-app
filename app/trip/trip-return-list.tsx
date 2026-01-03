import { BottomSheet } from '@/components/bottom-sheet';
import { capitalizeBusType } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Departures, SearchParams, Trip } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore - Pas de types disponibles pour react-native-vector-icons
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Type pour les paramètres de route
 */
type TripReturnListRouteParams = {
    returnDepartures?: Departures;
    outboundTrip?: Trip;
    searchParams?: SearchParams;
};

/**
 * Type pour les options de tri
 */
type SortOption = {
    id: string;
    label: string;
};

/**
 * Options de tri disponibles
 */
const SORT_OPTIONS: SortOption[] = [
    { id: 'Prix croissant', label: 'Prix croissant' },
    { id: 'Prix décroissant', label: 'Prix décroissant' },
    { id: 'Départ tôt', label: 'Départ tôt' },
    { id: 'Départ tard', label: 'Départ tard' },
];

/**
 * Écran de liste des trajets retour disponibles
 * Affiche les trajets retour trouvés avec possibilité de filtres et de tri
 * Après sélection d'un voyage aller dans trip-list
 */
const TripReturnList = () => {
    const route = useRoute<RouteProp<{ params: TripReturnListRouteParams }>>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Mémorisation des couleurs spécifiques pour l'écran
    const themeColors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        sortOptionBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7',
    }), [colorScheme]);

    // Récupération des données passées en paramètre
    const { returnDepartures, outboundTrip, searchParams } = route.params || {};
    const trips = returnDepartures?.items || [];
    const totalTrips = returnDepartures?.total || 0;

    // États pour les dropdowns et modals
    const [showSortModal, setShowSortModal] = useState(false);
    const [selectedSort, setSelectedSort] = useState<string>('Prix croissant');

    /**
     * Convertit une heure au format HH:MM en minutes pour faciliter la comparaison
     */
    const timeToMinutes = useCallback((time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }, []);

    /**
     * Trie la liste des trajets selon le critère sélectionné
     */
    const sortedTrips = useMemo(() => {
        const tripsCopy = [...trips];

        switch (selectedSort) {
            case 'Prix croissant':
                return tripsCopy.sort((a, b) => a.price - b.price);

            case 'Prix décroissant':
                return tripsCopy.sort((a, b) => b.price - a.price);

            case 'Départ tôt':
                return tripsCopy.sort((a, b) => {
                    const timeA = timeToMinutes(a.departureTime);
                    const timeB = timeToMinutes(b.departureTime);
                    return timeA - timeB;
                });

            case 'Départ tard':
                return tripsCopy.sort((a, b) => {
                    const timeA = timeToMinutes(a.departureTime);
                    const timeB = timeToMinutes(b.departureTime);
                    return timeB - timeA;
                });

            default:
                return tripsCopy;
        }
    }, [trips, selectedSort, timeToMinutes]);

    // Récupération des villes depuis le premier trajet (mémorisé)
    const routeCities = useMemo(() => {
        const firstTrip = sortedTrips[0] || trips[0];
        return {
            departureCity: firstTrip?.departureCity || '',
            arrivalCity: firstTrip?.arrivalCity || '',
        };
    }, [sortedTrips, trips]);

    /**
     * Gère la sélection d'un trajet retour
     * Navigue vers trip-summary avec les deux voyages (aller et retour)
     */
    const handleSelectReturnTrip = useCallback((returnTrip: Trip) => {
        if (!outboundTrip) {
            return;
        }
        // @ts-ignore - Navigation typée dynamiquement
        navigation.navigate('trip/trip-summary', { 
            trip: outboundTrip, 
            returnTrip: returnTrip,
            searchParams 
        });
    }, [navigation, outboundTrip, searchParams]);

    /**
     * Gère la sélection d'une option de tri
     */
    const handleSortSelect = useCallback((sortId: string) => {
        setSelectedSort(sortId);
        setShowSortModal(false);
    }, []);

    /**
     * Gère l'ouverture du modal de tri
     */
    const handleOpenSortModal = useCallback(() => {
        setShowSortModal(true);
    }, []);

    /**
     * Gère la fermeture du modal de tri
     */
    const handleCloseSortModal = useCallback(() => {
        setShowSortModal(false);
    }, []);

    /**
     * Gère le retour en arrière
     */
    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);


    return (
        <>
            <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor }]}>
                {/* Header avec bouton retour */}
                <View style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: themeColors.headerBackgroundColor,
                        borderBottomColor: themeColors.headerBorderColor
                    }
                ]}>
                    <Pressable
                        onPress={handleGoBack}
                        style={styles.backButton}
                    >
                        <Icon name="arrow-left" size={25} color={iconColor} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Route */}
                    <View style={styles.routeContainer}>
                        <Text style={[styles.routeCity, { color: textColor }]}>{routeCities.departureCity}</Text>
                        <Icon name="arrow-right" size={24} color={tintColor} />
                        <Text style={[styles.routeCity, { color: textColor }]}>{routeCities.arrivalCity}</Text>
                    </View>

                    {/* Titre */}
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: textColor }]}>Voyages retour disponibles</Text>
                    </View>

                    {/* Résumé et Tri */}
                    <View style={styles.summaryContainer}>
                        <Text style={[styles.summaryText, { color: themeColors.secondaryTextColor }]}>
                            {totalTrips} {totalTrips > 1 ? 'trajets disponibles' : 'trajet disponible'}
                        </Text>
                        <Pressable
                            style={styles.sortButton}
                            onPress={handleOpenSortModal}
                        >
                            <Text style={[styles.sortButtonText, { color: textColor }]}>{selectedSort}</Text>
                            <Icon name="chevron-down" size={16} color={iconColor} />
                        </Pressable>
                    </View>

                    {/* Liste des trajets */}
                    {sortedTrips.length > 0 ? (
                        <View style={styles.tripsList}>
                            {sortedTrips.map((item) => (
                                <TripCard
                                    key={item.id}
                                    item={item}
                                    cardBackgroundColor={themeColors.cardBackgroundColor}
                                    borderColor={themeColors.borderColor}
                                    textColor={textColor}
                                    secondaryTextColor={themeColors.secondaryTextColor}
                                    tintColor={tintColor}
                                    onSelectTrip={handleSelectReturnTrip}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="directions-bus" size={40} color={tintColor} />
                            <Text style={[styles.emptyText, { color: themeColors.secondaryTextColor }]}>Aucun trajet disponible</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
            {/* BottomSheet de tri */}
            <BottomSheet<SortOption>
                visible={showSortModal}
                onClose={handleCloseSortModal}
                title="Trier par"
                data={SORT_OPTIONS}
                loading={false}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    const isSelected = selectedSort === item.id;
                    return (
                        <Pressable
                            style={[
                                styles.sortOption,
                                { borderBottomColor: themeColors.sortOptionBorderColor }
                            ]}
                            onPress={() => {
                                handleSortSelect(item.id);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.sortOptionText,
                                { color: isSelected ? tintColor : textColor },
                                isSelected && styles.sortOptionTextSelected
                            ]}>
                                {item.label}
                            </Text>
                            {isSelected && (
                                <Icon name="check" size={20} color={tintColor} />
                            )}
                        </Pressable>
                    );
                }}
                emptyText="Aucune option disponible"
            />
        </>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    routeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 15,
        marginTop: 10,
    },
    routeCity: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
    },
    titleContainer: {
        marginBottom: 15,
        // marginTop: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    summaryText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sortButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    tripsList: {
        gap: 15,
    },
    tripCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    companyLogoContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1776BA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    companyLogoText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    companyDetails: {
        flex: 1,
    },
    companyName: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    licencePlate: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 2,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
    },
    currency: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    timeSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        marginTop: 10,
        gap: 12,
    },
    departureSection: {
        flex: 1,
    },
    arrivalSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    time: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    city: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 2,
    },
    station: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    timelineContainer: {
        alignItems: 'center',
        marginTop: 20,
        position: 'relative',
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    timelineLine: {
        width: 2,
        height: 30,
        marginBottom: 4,
    },
    duration: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 4,
    },
    optionsSection: {
        marginBottom: 16,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    optionText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    availabilityBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 8,
    },
    availabilityText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    busType: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    selectButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 10,
    },
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sortOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    sortOptionTextSelected: {
        fontFamily: 'Ubuntu_Bold',
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        justifyContent: 'space-between',
        marginTop: 20,
    },
});

/**
 * Interface pour les props du composant TripCard
 */
interface TripCardProps {
    item: Trip;
    cardBackgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
    tintColor: string;
    onSelectTrip: (trip: Trip) => void;
}

/**
 * Composant pour une carte de trajet (mémorisé pour éviter les re-renders inutiles)
 */
const TripCard = React.memo<TripCardProps>(({
    item,
    cardBackgroundColor,
    borderColor,
    textColor,
    secondaryTextColor,
    tintColor,
    onSelectTrip,
}) => {
    return (
        <View style={[styles.tripCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            {/* En-tête de la carte : Logo compagnie et Prix */}
            <View style={styles.cardHeader}>
                <View style={styles.companyInfo}>
                    <View style={styles.companyLogoContainer}>
                        <Text style={styles.companyLogoText}>
                            {item.companyAbbreviation}
                        </Text>
                    </View>
                    <View style={styles.companyDetails}>
                        <Text style={[styles.companyName, { color: textColor }]}>{item.company}</Text>
                        <Text style={[styles.licencePlate, { color: secondaryTextColor }]}>{item.licencePlate}</Text>
                    </View>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={[styles.price, { color: tintColor }]}>{item.price}</Text>
                    <Text style={[styles.currency, { color: secondaryTextColor }]}>{item.currency}</Text>
                </View>
            </View>

            {/* Section Départ */}
            <View style={styles.timeSection}>
                <View style={styles.departureSection}>
                    <Text style={[styles.sectionLabel, { color: secondaryTextColor }]}>DÉPART</Text>
                    <Text style={[styles.time, { color: textColor }]}>{item.departureTime}</Text>
                    <Text style={[styles.city, { color: textColor }]}>{item.departureCity}</Text>
                    <Text style={[styles.station, { color: secondaryTextColor }]}>{item.departureStation}</Text>
                </View>

                {/* Timeline */}
                <View style={styles.timelineContainer}>
                    <View style={[styles.timelineDot, { backgroundColor: tintColor }]} />
                    <View style={[styles.timelineLine, { backgroundColor: tintColor }]} />
                    <View style={[styles.timelineDot, { backgroundColor: tintColor }]} />
                    <Text style={[styles.duration, { color: secondaryTextColor }]}>{item.duration}</Text>
                </View>

                {/* Section Arrivée */}
                <View style={styles.arrivalSection}>
                    <Text style={[styles.sectionLabel, { color: secondaryTextColor }]}>ARRIVÉE</Text>
                    <Text style={[styles.time, { color: textColor }]}>{item.arrivalTime}</Text>
                    <Text style={[styles.city, { color: textColor }]}>{item.arrivalCity}</Text>
                    <Text style={[styles.station, { color: secondaryTextColor }]}>{item.arrivalStation}</Text>
                </View>
            </View>

            {/* Options et Disponibilité */}
            <View style={styles.optionsSection}>
                <View style={styles.optionsRow}>
                    {item.options.map((option, index) => (
                        <View key={`${item.id}-option-${index}`} style={styles.optionItem}>
                            <Icon name="check-circle" size={16} color="#4CAF50" />
                            <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.availabilityRow}>
                    <View style={styles.availabilityBadge}>
                        <Text style={styles.availabilityText}>
                            {item.availableSeats} places disponibles
                        </Text>
                    </View>
                    <Text style={[styles.busType, { color: tintColor }]}>{capitalizeBusType(item.busType)}</Text>
                </View>
            </View>

            {/* Bouton Réserver */}
            <Pressable
                style={styles.selectButton}
                onPress={() => onSelectTrip(item)}
            >
                <Text style={styles.selectButtonText}>Réserver</Text>
            </Pressable>
        </View>
    );
}, (prevProps, nextProps) => {
    // Comparaison personnalisée pour éviter les re-renders inutiles
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.cardBackgroundColor === nextProps.cardBackgroundColor &&
        prevProps.borderColor === nextProps.borderColor &&
        prevProps.textColor === nextProps.textColor &&
        prevProps.secondaryTextColor === nextProps.secondaryTextColor &&
        prevProps.tintColor === nextProps.tintColor
    );
});

TripCard.displayName = 'TripCard';

export default TripReturnList;

