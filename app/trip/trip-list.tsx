// @ts-nocheck
import { capitalizeBusType } from '@/constants/functions';
import { Departures, SearchParams, Trip } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran de liste des trajets disponibles
 * Affiche les trajets trouvés avec possibilité de filtres et de tri
 */
const TripList = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // Récupération des données passées en paramètre
    const { departures, searchParams } = (route.params as { departures?: Departures, searchParams?: SearchParams }) || {};
    const trips = departures?.items || [];
    const totalTrips = departures?.total || 0;

    // États pour les dropdowns et modals
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [showDisplayModal, setShowDisplayModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);

    // États pour les filtres
    const [selectedSort, setSelectedSort] = useState('Prix croissant');

    /**
     * Convertit une heure au format HH:MM en minutes pour faciliter la comparaison
     */
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

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
    }, [trips, selectedSort]);

    // Récupération des villes depuis le premier trajet
    const departureCity = sortedTrips[0]?.departureCity || trips[0]?.departureCity || '';
    const arrivalCity = sortedTrips[0]?.arrivalCity || trips[0]?.arrivalCity || '';


    /**
     * Gère la sélection d'un trajet
     */
    const handleSelectTrip = (trip: Trip) => {
        navigation.navigate('trip/trip-summary', { trip, searchParams });

    };

    /**
     * Composant pour une carte de trajet
     */
    const TripCard = ({ item }: { item: Trip }) => {
        return (
            <View style={styles.tripCard}>
                {/* En-tête de la carte : Logo compagnie et Prix */}
                <View style={styles.cardHeader}>
                    <View style={styles.companyInfo}>
                        <View style={styles.companyLogoContainer}>
                            <Text style={styles.companyLogoText}>
                                {item.companyAbbreviation}
                            </Text>
                        </View>
                        <View style={styles.companyDetails}>
                            <Text style={styles.companyName}>{item.company}</Text>
                            <Text style={styles.licencePlate}>{item.licencePlate}</Text>
                        </View>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{item.price}</Text>
                        <Text style={styles.currency}>{item.currency}</Text>
                    </View>
                </View>

                {/* Section Départ */}
                <View style={styles.timeSection}>
                    <View style={styles.departureSection}>
                        <Text style={styles.sectionLabel}>DÉPART</Text>
                        <Text style={styles.time}>{item.departureTime}</Text>
                        <Text style={styles.city}>{item.departureCity}</Text>
                        <Text style={styles.station}>{item.departureStation}</Text>
                    </View>

                    {/* Timeline */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineLine} />
                        <View style={styles.timelineDot} />
                        <Text style={styles.duration}>{item.duration}</Text>
                    </View>

                    {/* Section Arrivée */}
                    <View style={styles.arrivalSection}>
                        <Text style={styles.sectionLabel}>ARRIVÉE</Text>
                        <Text style={styles.time}>{item.arrivalTime}</Text>
                        <Text style={styles.city}>{item.arrivalCity}</Text>
                        <Text style={styles.station}>{item.arrivalStation}</Text>
                    </View>
                </View>

                {/* Options et Disponibilité */}
                <View style={styles.optionsSection}>
                    <View style={styles.optionsRow}>
                        {item.options.map((option, index) => (
                            <View key={index} style={styles.optionItem}>
                                <Icon name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.optionText}>{option}</Text>
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
                        <Text style={styles.busType}>{capitalizeBusType(item.busType)}</Text>
                    </View>
                </View>

                {/* Bouton Réserver */}
                <Pressable
                    style={styles.selectButton}
                    onPress={() => handleSelectTrip(item)}
                >
                    <Text style={styles.selectButtonText}>Réserver</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header avec bouton retour */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color="#000" />
                </Pressable>

                {/* Bouton Filtres */}
                {/* <Pressable
                    style={styles.filterButton}
                    onPress={() => setShowFiltersModal(true)}
                >
                    <Icon name="filter-variant" size={20} color="#000" />
                    <Text style={styles.filterButtonText}>Filtres</Text>
                </Pressable> */}

                {/* Dropdown Afficher */}
                {/* <Pressable
                    style={styles.displayButton}
                    onPress={() => setShowDisplayModal(true)}
                >
                    <Text style={styles.displayButtonText}>Afficher</Text>
                    <Icon name="chevron-down" size={20} color="#000" />
                </Pressable> */}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Route */}
                <View style={styles.routeContainer}>
                    <Text style={styles.routeCity}>{departureCity}</Text>
                    <Icon name="arrow-right" size={24} color="#1776BA" />
                    <Text style={styles.routeCity}>{arrivalCity}</Text>
                </View>

                {/* Résumé et Tri */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryText}>
                        {totalTrips} {totalTrips > 1 ? 'trajets disponibles' : 'trajet disponible'}
                    </Text>
                    <Pressable
                        style={styles.sortButton}
                        onPress={() => setShowSortModal(true)}
                    >
                        <Text style={styles.sortButtonText}>{selectedSort}</Text>
                        <Icon name="chevron-down" size={16} color="#000" />
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
                        <MaterialIcons name="directions-bus" size={40} color="#1776BA" />
                        <Text style={styles.emptyText}>Aucun trajet disponible</Text>
                    </View>
                )}
            </ScrollView>

            {/* Modal Filtres (à implémenter) */}
            {/* <Modal
                visible={showFiltersModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFiltersModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowFiltersModal(false)}
                >
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <Text style={styles.modalTitle}>Filtres</Text>
                        <Text style={styles.modalPlaceholder}>
                            Les filtres seront implémentés ici
                        </Text>
                        <Pressable
                            style={styles.modalCloseButton}
                            onPress={() => setShowFiltersModal(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Fermer</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal> */}

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

            {/* Modal Tri */}
            <Modal
                visible={showSortModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSortModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowSortModal(false)}
                >
                    <View
                        style={[
                            styles.modalContent,
                            {
                                paddingTop: 20,
                                paddingHorizontal: 20,
                                // marginBottom: -500,
                                paddingBottom: Math.max(insets.bottom, 0) + 20,
                            }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={styles.modalTitle}>Trier par</Text>
                        {['Prix croissant', 'Prix décroissant', 'Départ tôt', 'Départ tard'].map((option) => (
                            <Pressable
                                key={option}
                                style={styles.sortOption}
                                onPress={() => {
                                    setSelectedSort(option);
                                    setShowSortModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.sortOptionText,
                                    selectedSort === option && styles.sortOptionTextSelected
                                ]}>
                                    {option}
                                </Text>
                                {selectedSort === option && (
                                    <Icon name="check" size={20} color="#1776BA" />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
    },
    filterButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
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
        color: '#000',
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
        color: '#000',
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
        color: '#666',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sortButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    tripsList: {
        gap: 15,
    },
    tripCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
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
        color: '#000',
    },
    licencePlate: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
        marginTop: 2,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
    },
    currency: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    time: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    city: {
        fontSize: 14,
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
        marginTop: 20,
        position: 'relative',
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1776BA',
        marginBottom: 4,
    },
    timelineLine: {
        width: 2,
        height: 30,
        backgroundColor: '#1776BA',
        marginBottom: 4,
    },
    duration: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        color: '#000',
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
        color: '#1776BA',
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
        color: '#666',
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        // marginBottom: ,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 20,
    },
    modalPlaceholder: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        borderBottomColor: '#F3F3F7',
    },
    sortOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    sortOptionTextSelected: {
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
    },
});

export default TripList;