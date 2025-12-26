// @ts-nocheck
import { getAvailableDepartures } from '@/api/departure';
import { BottomSheet } from '@/components/bottom-sheet';
import { capitalizeBusType } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Departures, SearchParams, Trip } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Convertit un nom d'aménité en nom d'icône MaterialCommunityIcons valide
 * @param amenityName - Le nom d'aménité provenant de l'API (en français)
 * @returns Le nom d'icône MaterialCommunityIcons correspondant, ou 'help-circle' par défaut
 */
const getAmenityIcon = (amenityName: string): string => {
    // Mapping basé sur les noms d'icônes MaterialCommunityIcons valides
    const iconMapping: Record<string, string> = {
        // WiFi et connectivité
        'wifi': 'wifi',
        'wi-fi': 'wifi',
        'internet': 'wifi',
        'réseau': 'network',
        'network': 'network',
        
        // Climatisation
        'climatisation': 'air-conditioner',
        'climatiseur': 'air-conditioner',
        'air-conditioner': 'air-conditioner',
        'air-conditioning': 'air-conditioner',
        'ac': 'air-conditioner',
        'climat': 'air-conditioner',
        
        // Prise électrique et USB
        'prises usb': 'usb-port',
        'prise usb': 'usb-port',
        'usb': 'usb-port',
        'port usb': 'usb-port',
        'prise électrique': 'power-socket-eu',
        'prises électriques': 'power-socket-eu',
        'power': 'power-socket-eu',
        'power-socket': 'power-socket-eu',
        'outlet': 'power-socket-eu',
        'plug': 'power-socket-eu',
        'electric': 'power-socket-eu',
        'électrique': 'power-socket-eu',
        
        // Toilettes
        'toilettes': 'toilet',
        'toilette': 'toilet',
        'toilet': 'toilet',
        'restroom': 'toilet',
        'wc': 'toilet',
        'bathroom': 'toilet',
        'sanitaires': 'toilet',
        
        // Divertissement
        'télévision': 'television',
        'television': 'television',
        'tv': 'television',
        'téléviseur': 'television',
        'écran': 'monitor',
        'screen': 'monitor',
        'monitor': 'monitor',
        'entertainment': 'television',
        'divertissement': 'television',
        
        // Confort et sièges
        'sièges inclinables': 'seat-recline-normal',
        'siège inclinable': 'seat-recline-normal',
        'reclining-seat': 'seat-recline-normal',
        'sièges': 'seat',
        'siège': 'seat',
        'seat': 'seat',
        'places': 'seat',
        'place': 'seat',
        'legroom': 'seat-legroom-extra',
        'espace jambes': 'seat-legroom-extra',
        'couverture': 'blanket',
        'blanket': 'blanket',
        'oreiller': 'pillow',
        'pillow': 'pillow',
        
        // Nourriture et boissons
        'nourriture': 'food',
        'food': 'food',
        'repas': 'food',
        'boisson': 'cup',
        'drink': 'cup',
        'boissons': 'cup',
        'snack': 'food-variant',
        'collation': 'food-variant',
        'restaurant': 'silverware-fork-knife',
        'restauration': 'silverware-fork-knife',
        
        // Bagages
        'bagages': 'luggage',
        'bagage': 'luggage',
        'luggage': 'luggage',
        'baggage': 'luggage',
        'stockage': 'package-variant',
        'storage': 'package-variant',
        
        // Autres
        'chargement': 'battery-charging',
        'charging': 'battery-charging',
        'charge': 'battery-charging',
        'téléphone': 'phone',
        'phone': 'phone',
        'musique': 'music',
        'music': 'music',
        'lampe de lecture': 'lightbulb-on',
        'reading-light': 'lightbulb-on',
        'rideau': 'curtains',
        'curtain': 'curtains',
        'curtains': 'curtains',
        'fenêtre': 'window-open',
        'window': 'window-open',
    };
    
    // Normaliser le nom (minuscules, supprimer les accents, remplacer les espaces et tirets)
    const normalized = amenityName
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[\s_-]+/g, '-');
    
    // Chercher d'abord avec le nom normalisé, puis avec le nom original en minuscules
    return iconMapping[normalized] || 
           iconMapping[amenityName.toLowerCase().trim()] || 
           normalized || 
           'help-circle';
};

/**
 * Écran de liste des trajets disponibles
 * Affiche les trajets trouvés avec possibilité de filtres et de tri
 */
const TripList = () => {
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
    const modalBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const modalBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';

    // Récupération des données passées en paramètre
    const { departures, searchParams } = (route.params as { departures?: Departures, searchParams?: SearchParams }) || {};
    const trips = departures?.items || [];
    const totalTrips = departures?.total || 0;
    const filters = departures?.filters;

    // États pour les dropdowns et modals
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [showDisplayModal, setShowDisplayModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [loadingReturnTrips, setLoadingReturnTrips] = useState(false);

    // États pour les filtres
    const [selectedSort, setSelectedSort] = useState('Prix croissant');
    const [minPrice, setMinPrice] = useState(() => filters?.priceRange?.min?.toString() || '0');
    const [maxPrice, setMaxPrice] = useState(() => filters?.priceRange?.max?.toString() || '50000');
    
    // États pour les filtres dynamiques depuis departures.filters
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<Set<string>>(new Set());
    const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
    const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
    const [selectedBusTypes, setSelectedBusTypes] = useState<Set<string>>(new Set());

    // Options de tri
    const sortOptions = [
        { id: 'Prix croissant', label: 'Prix croissant' },
        { id: 'Prix décroissant', label: 'Prix décroissant' },
        { id: 'Départ tôt', label: 'Départ tôt' },
        { id: 'Départ tard', label: 'Départ tard' },
    ];

    /**
     * Convertit une heure au format HH:MM en minutes pour faciliter la comparaison
     */
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    /**
     * Vérifie si une heure est dans un créneau horaire
     */
    const isTimeInSlot = (time: string, startTime: string, endTime: string): boolean => {
        const tripMinutes = timeToMinutes(time);
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        // Gérer le cas où le créneau passe minuit (ex: 18h-24h)
        if (endMinutes < startMinutes) {
            return tripMinutes >= startMinutes || tripMinutes <= endMinutes;
        }
        return tripMinutes >= startMinutes && tripMinutes <= endMinutes;
    };

    /**
     * Filtre et trie la liste des trajets selon les critères sélectionnés
     */
    const sortedTrips = useMemo(() => {
        const min = parseInt(minPrice) || 0;
        const max = parseInt(maxPrice) || 50000;

        // Filtrage par prix
        let filteredTrips = trips.filter(trip => {
            const price = trip.price;
            if (price < min || price > max) return false;

            // Filtrage par créneaux horaires
            if (selectedTimeSlots.size > 0 && filters?.timeSlots) {
                const matchesTimeSlot = filters.timeSlots.some((slot: any) => 
                    selectedTimeSlots.has(slot.id) && 
                    isTimeInSlot(trip.departureTime, slot.startTime, slot.endTime)
                );
                if (!matchesTimeSlot) return false;
            }

            // Filtrage par compagnies
            if (selectedCompanies.size > 0) {
                if (!selectedCompanies.has(trip.companyId)) return false;
            }

            // Filtrage par types de bus
            if (selectedBusTypes.size > 0) {
                if (!selectedBusTypes.has(trip.busType.toLowerCase())) return false;
            }

            // Filtrage par équipements (amenities)
            // Note: Cette logique dépend de la structure des données des trajets
            // Si les trajets ont une propriété amenities, on peut filtrer ici
            // Pour l'instant, on suppose que tous les trajets passent ce filtre
            // si aucun équipement n'est sélectionné ou si le trajet correspond

            return true;
        });

        // Tri selon le critère sélectionné
        const tripsCopy = [...filteredTrips];

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
    }, [trips, selectedSort, minPrice, maxPrice, selectedTimeSlots, selectedCompanies, selectedBusTypes, filters]);

    /**
     * Réinitialise tous les filtres à leurs valeurs par défaut
     */
    const resetAllFilters = () => {
        setMinPrice(filters?.priceRange?.min?.toString() || '0');
        setMaxPrice(filters?.priceRange?.max?.toString() || '50000');
        setSelectedTimeSlots(new Set());
        setSelectedCompanies(new Set());
        setSelectedAmenities(new Set());
        setSelectedBusTypes(new Set());
    };

    /**
     * Gère la sélection/désélection d'un créneau horaire
     */
    const toggleTimeSlot = (id: string) => {
        setSelectedTimeSlots(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    /**
     * Gère la sélection/désélection d'une compagnie
     */
    const toggleCompany = (id: string) => {
        setSelectedCompanies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    /**
     * Gère la sélection/désélection d'un équipement
     */
    const toggleAmenity = (id: string) => {
        setSelectedAmenities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    /**
     * Gère la sélection/désélection d'un type de bus
     */
    const toggleBusType = (id: string) => {
        setSelectedBusTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    /**
     * Incrémente la valeur du prix minimum
     */
    const incrementMinPrice = () => {
        const current = parseInt(minPrice) || 0;
        setMinPrice(String(current + 1));
    };

    /**
     * Décrémente la valeur du prix minimum
     */
    const decrementMinPrice = () => {
        const current = parseInt(minPrice) || 0;
        if (current > 0) {
            setMinPrice(String(current - 1));
        }
    };

    /**
     * Incrémente la valeur du prix maximum
     */
    const incrementMaxPrice = () => {
        const current = parseInt(maxPrice) || 50000;
        setMaxPrice(String(current + 1));
    };

    /**
     * Décrémente la valeur du prix maximum
     */
    const decrementMaxPrice = () => {
        const current = parseInt(maxPrice) || 50000;
        if (current > 0) {
            setMaxPrice(String(current - 1));
        }
    };

    // Récupération des villes depuis le premier trajet
    const departureCity = sortedTrips[0]?.departureCity || trips[0]?.departureCity || '';
    const arrivalCity = sortedTrips[0]?.arrivalCity || trips[0]?.arrivalCity || '';


    const formatDateToYYYYMMDD = (date: Date | null): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Gère la sélection d'un trajet
     * Pour un aller-retour, recherche les voyages retour disponibles
     * Pour un aller simple, navigue directement vers trip-summary
     */
    const handleSelectTrip = async (trip: Trip) => {
        // Si c'est un aller simple, naviguer directement vers trip-summary
        if (searchParams?.tripType !== 'ROUND_TRIP') {
            navigation.navigate('trip/trip-summary', { trip, searchParams });
            return;
        }

        // Si c'est un aller-retour, rechercher les voyages retour
        if (!searchParams?.departureCity || !searchParams?.arrivalCity || !searchParams?.returnDate) {
            Alert.alert('Attention !', 'Informations de recherche manquantes pour le retour');
            return;
        }

        // Inverser les villes pour le retour
        const returnCityFromId = searchParams.arrivalCity.id; // Ville d'arrivée devient départ
        const returnCityToId = searchParams.departureCity.id; // Ville de départ devient arrivée
        const returnDate = searchParams.returnDate;

        // Construire les queryParams pour le retour (dateFrom vide, dateTo avec la date de retour)
        const queryParams = `page=1&pageSize=10&cityFromId=${returnCityFromId}&cityToId=${returnCityToId}&dateFrom=&dateTo=${formatDateToYYYYMMDD(returnDate)}&companyId=&passengerCount=${searchParams.numberOfPersons}`;

        setLoadingReturnTrips(true);
        try {
            const response = await getAvailableDepartures(queryParams);
            setLoadingReturnTrips(false);

            if (response?.data?.items?.length > 0) {
                // Naviguer vers l'écran de sélection du voyage retour
                navigation.navigate('trip/trip-return-list', {
                    returnDepartures: response?.data,
                    outboundTrip: trip, // Le voyage aller sélectionné
                    searchParams: searchParams
                });
            } else {
                Alert.alert('Information !', 'Aucun voyage retour disponible pour la date sélectionnée.');
            }
        } catch (error: any) {
            setLoadingReturnTrips(false);
            console.error('Erreur dans la récupération des voyages retour : ', error);
            Alert.alert('Attention !', 'Une erreur est survenue lors de la recherche des voyages retour');
        }
    };

    /**
     * Composant pour une carte de trajet
     */
    const TripCard = ({ item }: { item: Trip }) => {
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
                            <View key={index} style={styles.optionItem}>
                                <Icon name="check-circle" size={16} color="#4CAF50" />
                                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            justifyContent: 'space-between',
                            marginTop: 20,
                        }
                    }>
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
                    style={[styles.selectButton, loadingReturnTrips && { opacity: 0.5 }]}
                    onPress={() => handleSelectTrip(item)}
                    disabled={loadingReturnTrips}
                >
                    {loadingReturnTrips ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.selectButtonText}>{searchParams?.tripType === 'ROUND_TRIP' ? 'Sélectionner' : 'Réserver'}</Text>
                    )}
                </Pressable>
            </View>
        );
    };

    console.log("Departures filters ===>, ", JSON.stringify(departures?.filters, null, 2));

    return (
        <>
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                {/* Header avec bouton retour */}
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

                    {/* Bouton Filtres */}
                    <Pressable
                        style={[styles.filterButton, { backgroundColor: cardBackgroundColor, borderColor }]}
                        onPress={() => setShowFiltersModal(true)}
                    >
                        <Icon name="filter-variant" size={20} color={textColor} />
                        <Text style={[styles.filterButtonText, { color: textColor }]}>Filtres</Text>
                    </Pressable>

                    {/* Dropdown Afficher */}
                    {/* <Pressable
                        style={[styles.displayButton, { backgroundColor: cardBackgroundColor, borderColor }]}
                        onPress={() => setShowDisplayModal(true)}
                    >
                        <Text style={[styles.displayButtonText, { color: textColor }]}>Afficher</Text>
                        <Icon name="chevron-down" size={20} color={textColor} />
                    </Pressable> */}
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Route */}
                    <View style={styles.routeContainer}>
                        <Text style={[styles.routeCity, { color: textColor }]}>{departureCity}</Text>
                        <Icon name="arrow-right" size={24} color={tintColor} />
                        <Text style={[styles.routeCity, { color: textColor }]}>{arrivalCity}</Text>
                    </View>

                    {/* Titre */}
                    {searchParams?.tripType === 'ROUND_TRIP' && (
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: textColor }]}>Voyages aller disponibles</Text>
                        </View>
                    )}

                    {/* Résumé et Tri */}
                    <View style={styles.summaryContainer}>
                        <Text style={[styles.summaryText, { color: secondaryTextColor }]}>
                            {sortedTrips.length} {sortedTrips.length > 1 ? 'trajets disponibles' : 'trajet disponible'}
                        </Text>
                        <Pressable
                            style={styles.sortButton}
                            onPress={() => setShowSortModal(true)}
                        >
                            <Text style={[styles.sortButtonText, { color: textColor }]}>{selectedSort}</Text>
                            <Icon name="chevron-down" size={16} color={iconColor} />
                        </Pressable>
                    </View>

                    {/* Liste des trajets */}
                    {sortedTrips.length > 0 ? (
                        <FlatList
                            data={sortedTrips}
                            renderItem={({ item }) => <TripCard item={item} />}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            contentContainerStyle={styles.tripsList}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="directions-bus" size={40} color={tintColor} />
                            <Text style={[styles.emptyText, { color: secondaryTextColor }]}>Aucun trajet disponible</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Modal Filtres (à implémenter) */}
                <Modal
                    visible={showFiltersModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowFiltersModal(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setShowFiltersModal(false)}
                    >
                        <View 
                            style={[styles.modalContent, { 
                                backgroundColor: modalBackgroundColor 
                            }]}
                            onStartShouldSetResponder={() => true}
                        >
                            {/* En-tête du modal */}
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: textColor }]}>Filtrer par</Text>
                                <Pressable onPress={resetAllFilters}>
                                    <Text style={[styles.resetButton, { color: tintColor }]}>Réinitialiser</Text>
                                </Pressable>
                            </View>

                            <ScrollView 
                                style={styles.modalScrollView}
                                contentContainerStyle={styles.modalScrollContent}
                                showsVerticalScrollIndicator={true}
                            >
                                {/* Section Prix du billet */}
                                <View style={styles.filterSection}>
                                    <Text style={[styles.filterCategory, { color: textColor }]}>Prix du billet</Text>
                                    
                                    {/* Champ Min */}
                                    <View style={styles.priceInputContainer}>
                                        <Text style={[styles.priceLabel, { color: textColor }]}>Min</Text>
                                        <View style={[styles.priceInputWrapper, { borderColor, backgroundColor: cardBackgroundColor }]}>
                                            <TextInput
                                                style={[styles.priceInput, { color: textColor }]}
                                                value={minPrice}
                                                onChangeText={setMinPrice}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={secondaryTextColor}
                                            />
                                            <View style={styles.stepperContainer}>
                                                <Pressable 
                                                    style={styles.stepperButton}
                                                    onPress={incrementMinPrice}
                                                >
                                                    <Icon name="chevron-up" size={16} color={textColor} />
                                                </Pressable>
                                                <Pressable 
                                                    style={styles.stepperButton}
                                                    onPress={decrementMinPrice}
                                                >
                                                    <Icon name="chevron-down" size={16} color={textColor} />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Champ Max */}
                                    <View style={styles.priceInputContainer}>
                                        <Text style={[styles.priceLabel, { color: textColor }]}>Max</Text>
                                        <View style={[styles.priceInputWrapper, { borderColor, backgroundColor: cardBackgroundColor }]}>
                                            <TextInput
                                                style={[styles.priceInput, { color: textColor }]}
                                                value={maxPrice}
                                                onChangeText={setMaxPrice}
                                                keyboardType="numeric"
                                                placeholder="50000"
                                                placeholderTextColor={secondaryTextColor}
                                            />
                                            <View style={styles.stepperContainer}>
                                                <Pressable 
                                                    style={styles.stepperButton}
                                                    onPress={incrementMaxPrice}
                                                >
                                                    <Icon name="chevron-up" size={16} color={textColor} />
                                                </Pressable>
                                                <Pressable 
                                                    style={styles.stepperButton}
                                                    onPress={decrementMaxPrice}
                                                >
                                                    <Icon name="chevron-down" size={16} color={textColor} />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                            {/* Section Créneaux horaires */}
                            {filters?.timeSlots && filters.timeSlots.length > 0 && (
                                <View style={styles.filterSection}>
                                    <Text style={[styles.filterCategory, { color: textColor }]}>Créneaux horaires</Text>
                                    {filters.timeSlots.map((slot: any) => {
                                        const isSelected = selectedTimeSlots.has(slot.id);
                                        return (
                                            <Pressable
                                                key={slot.id}
                                                style={[
                                                    styles.filterOption,
                                                    { 
                                                        borderColor: isSelected ? "#1776BA" : borderColor,
                                                        borderWidth: isSelected ? 1 : 0.5,
                                                        backgroundColor: cardBackgroundColor 
                                                    }
                                                ]}
                                                onPress={() => toggleTimeSlot(slot.id)}
                                            >
                                                <View style={styles.filterOptionContent}>
                                                    <Text style={[
                                                        styles.filterOptionText,
                                                        { color: isSelected ? "#1776BA" : textColor }
                                                    ]}>
                                                        {slot.label}
                                                    </Text>
                                                    {slot.count !== undefined && (
                                                        <Text style={[
                                                            styles.filterOptionCount,
                                                            { color: isSelected ? "#1776BA" : secondaryTextColor }
                                                        ]}>
                                                            ({slot.count})
                                                        </Text>
                                                    )}
                                                </View>
                                                {/* {isSelected && (
                                                    <Icon name="check-circle" size={20} color={tintColor} />
                                                )} */}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Section Compagnies */}
                            {filters?.companies && filters.companies.length > 0 && (
                                <View style={styles.filterSection}>
                                    <Text style={[styles.filterCategory, { color: textColor }]}>Compagnies</Text>
                                    {filters.companies.map((company: any) => {
                                        const isSelected = selectedCompanies.has(company.id);
                                        return (
                                            <Pressable
                                                key={company.id}
                                                style={[
                                                    styles.filterOption,
                                                    { 
                                                        borderColor: isSelected ? "#1776BA" : borderColor,
                                                        borderWidth: isSelected ? 1 : 0.5,
                                                        backgroundColor: cardBackgroundColor 
                                                    }
                                                ]}
                                                onPress={() => toggleCompany(company.id)}
                                            >
                                                <View style={styles.filterOptionContent}>
                                                    <Text style={[
                                                        styles.filterOptionText,
                                                        { color: isSelected ? "#1776BA" : textColor }
                                                    ]}>
                                                        {company.name}
                                                    </Text>
                                                    {company.count !== undefined && (
                                                        <Text style={[
                                                            styles.filterOptionCount,
                                                            { color: isSelected ? "#1776BA" : secondaryTextColor }
                                                        ]}>
                                                            ({company.count})
                                                        </Text>
                                                    )}
                                                </View>
                                                {/* {isSelected && (
                                                    <Icon name="check-circle" size={20} color={tintColor} />
                                                )} */}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Section Équipements */}
                            {filters?.amenities && filters.amenities.length > 0 && (
                                <View style={styles.filterSection}>
                                    <Text style={[styles.filterCategory, { color: textColor }]}>Équipements</Text>
                                    {filters.amenities.map((amenity: any) => {
                                        const isSelected = selectedAmenities.has(amenity.id);
                                        return (
                                            <Pressable
                                                key={amenity.id}
                                                style={[
                                                    styles.filterOption,
                                                    { 
                                                        borderColor: isSelected ? "#1776BA" : borderColor,
                                                        borderWidth: isSelected ? 1 : 0.5,
                                                        backgroundColor: cardBackgroundColor 
                                                    }
                                                ]}
                                                onPress={() => toggleAmenity(amenity.id)}
                                            >
                                                <View style={styles.filterOptionContent}>
                                                    {amenity.icon && (
                                                        <Icon name={getAmenityIcon(amenity.name.toLowerCase())} size={20} color={isSelected ? '#1776BA' : textColor} />
                                                    )}
                                                    <Text style={[
                                                        styles.filterOptionText,
                                                        { color: isSelected ? "#1776BA" : textColor }
                                                    ]}>
                                                        {amenity.name}
                                                    </Text>
                                                    {amenity.count !== undefined && (
                                                        <Text style={[
                                                            styles.filterOptionCount,
                                                            { color: isSelected ? "#1776BA" : secondaryTextColor }
                                                        ]}>
                                                            ({amenity.count})
                                                        </Text>
                                                    )}
                                                </View>
                                                {/* {isSelected && (
                                                    <Icon name="check-circle" size={20} color={tintColor} />
                                                )} */}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Section Types de bus */}
                            {filters?.busTypes && filters.busTypes.length > 0 && (
                                <View style={styles.filterSection}>
                                    <Text style={[styles.filterCategory, { color: textColor }]}>Types de bus</Text>
                                    {filters.busTypes.map((busType: any) => {
                                        const isSelected = selectedBusTypes.has(busType.id);
                                        return (
                                            <Pressable
                                                key={busType.id}
                                                style={[
                                                    styles.filterOption,
                                                    { 
                                                        borderColor: isSelected ? "#1776BA" : borderColor,
                                                        borderWidth: isSelected ? 1 : 0.5,
                                                        backgroundColor: cardBackgroundColor 
                                                    }
                                                ]}
                                                onPress={() => toggleBusType(busType.id)}
                                            >
                                                <View style={styles.filterOptionContent}>
                                                    <Text style={[
                                                        styles.filterOptionText,
                                                        { color: isSelected ? "#1776BA" : textColor }
                                                    ]}>
                                                        {busType.name}
                                                    </Text>
                                                    {busType.count !== undefined && (
                                                        <Text style={[
                                                            styles.filterOptionCount,
                                                            { color: isSelected ? "#1776BA" : secondaryTextColor }
                                                        ]}>
                                                            ({busType.count})
                                                        </Text>
                                                    )}
                                                </View>
                                                {/* {isSelected && (
                                                    <Icon name="check-circle" size={20} color={tintColor} />
                                                )} */}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}
                            </ScrollView>

                            {/* Bouton Fermer */}
                            <View style={[styles.modalCloseButtonContainer, { paddingBottom: insets.bottom + 10 }]}>
                                <Pressable
                                    style={[styles.modalCloseButton, { backgroundColor: "#1776BA" }]}
                                    onPress={() => setShowFiltersModal(false)}
                                >
                                    <Text style={[styles.modalCloseButtonText, { color: '#FFFFFF' }]}>Fermer</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                {/* Modal Afficher (à implémenter) */}
                {/* <Modal
                    visible={showDisplayModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDisplayModal(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setShowDisplayModal(false)}
                    >
                        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                            <Text style={styles.modalTitle}>Afficher</Text>
                            <Text style={styles.modalPlaceholder}>
                                Options d'affichage à implémenter
                            </Text>
                            <Pressable
                                style={styles.modalCloseButton}
                                onPress={() => setShowDisplayModal(false)}
                            >
                                <Text style={styles.modalCloseButtonText}>Fermer</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal> */}

            </View>
            {/* BottomSheet de tri */}
            <BottomSheet
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                title="Trier par"
                data={sortOptions}
                loading={false}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    const isSelected = selectedSort === item.id;
                    return (
                        <Pressable
                            style={[
                                styles.sortOption,
                                { borderBottomColor: colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7' }
                            ]}
                            onPress={() => {
                                setSelectedSort(item.id);
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
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
    },
    filterButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    displayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
    },
    displayButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        maxHeight: '90%',
        minHeight: 300,
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalScrollView: {
        maxHeight: 500,
    },
    modalScrollContent: {
        paddingBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
    },
    modalCloseButtonContainer: {
        paddingHorizontal: 20,
    },
    modalPlaceholder: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 20,
    },
    modalCloseButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
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

    titleContainer: {
        marginBottom: 15,
        // marginTop: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    resetButton: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    filterSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    filterCategory: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 16,
    },
    priceInputContainer: {
        marginBottom: 20,
    },
    priceLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 8,
    },
    priceInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    priceInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        paddingVertical: 12,
    },
    stepperContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperButton: {
        padding: 4,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 15,
        borderWidth: 1,
        marginBottom: 8,
    },
    filterOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    filterOptionIcon: {
        fontSize: 18,
    },
    filterOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
    filterOptionCount: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
});

export default TripList;