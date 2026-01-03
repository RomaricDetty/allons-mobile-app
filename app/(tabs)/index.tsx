// @ts-nocheck
import { getPopularTrips } from '@/api/trip';
import { DepartureCard } from '@/components/departure-card';
import { ItineraryCard } from '@/components/itinerary-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PopularTrip } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable, RefreshControl,
    ScrollView, StyleSheet, Text,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Données de promotion statiques - déplacées en dehors du composant pour éviter les re-créations
const PROMOTIONS: PopularTrip[] = [
    {
        id: 1,
        route: 'Abidjan → Yamoussoukro',
        image: require('@/assets/images/basilique.jpg'),
        compagnie: 'UTB',
        tarif: '2500 F',
        duree: '2H',
        placesDisponibles: 10,
    },
    {
        id: 2,
        route: 'Abidjan → Bouaké',
        image: require('@/assets/images/bouake.jpg'),
        compagnie: 'SBTA',
        tarif: '3000 F',
        duree: '3H',
        placesDisponibles: 20,
    },
    {
        id: 3,
        route: 'Divo → Bouaké',
        image: require('@/assets/images/divo.jpg'),
        compagnie: 'SBTA',
        tarif: '3500 F',
        duree: '2H',
        placesDisponibles: 15,
    },
    {
        id: 4,
        route: 'Yamoussoukro → Boundiali',
        image: require('@/assets/images/yakro.jpg'),
        compagnie: 'SBTA',
        tarif: '5500 F',
        duree: '4H',
        placesDisponibles: 30,
    },
];

export default function HomeScreen() {
    const { width, height } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [popularTrips, setPopularTrips] = useState<PopularTrip[]>([]);
    const colorScheme = useColorScheme() ?? 'dark';
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // Mémorisation des couleurs de recherche basées sur le colorScheme
    const searchColors = useMemo(() => ({
        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7',
        textColor: colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA',
        iconColor: colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA',
    }), [colorScheme]);

    // Mémorisation des styles dynamiques
    const dynamicStyles = useMemo(() => ({
        scrollView: { backgroundColor, paddingTop: insets.top },
        titleText: { color: textColor },
        searchContainer: { backgroundColor: searchColors.backgroundColor },
        searchText: { color: searchColors.textColor },
        sectionTitle: { color: textColor },
    }), [backgroundColor, insets.top, textColor, searchColors]);

    /**
     * Récupère les trajets populaires
     * @returns void
     */
    const getPopularTripsFunction = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPopularTrips();
            setPopularTrips(response.data || []);
        } catch (error) {
            console.error('Erreur dans la récupération des trajets populaires : ', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /**
     * Fonction pour rafraîchir la liste des trajets populaires
     * @returns void
     */
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        getPopularTripsFunction();
    }, [getPopularTripsFunction]);

    /**
     * Fonction pour gérer la pression sur une carte d'itinéraire
     * @param id - L'ID de l'itinéraire
     * @returns void
     */
    const handlePromoCardPress = useCallback((id: number) => {
        console.log('Itinerary pressed:', id);
    }, []);

    /**
     * Fonction pour gérer la pression sur un trajet populaire
     * @param item - L'itinéraire
     * @returns void
     */
    const handlePopularTripPress = useCallback((item: PopularTrip) => {
        navigation.navigate('trip/search', { popularTrip: item as PopularTrip });
    }, [navigation]);

    /**
     * Fonction pour gérer la navigation vers la recherche
     * @returns void
     */
    const handleSearchPress = useCallback(() => {
        navigation.navigate('trip/search');
    }, [navigation]);

    /**
     * Fonction pour gérer le bouton "Plus"
     * @returns void
     */
    const handleSeeMorePress = useCallback(() => {
        console.log('Okay');
    }, []);

    // Mémorisation de la fonction keyExtractor pour FlatList
    const keyExtractor = useCallback((item: PopularTrip) => String(item.id), []);

    // Mémorisation de la fonction renderItem pour FlatList
    const renderPopularTrip = useCallback(({ item }: { item: PopularTrip }) => {
        return (
            <DepartureCard
                item={item}
                width={width}
                height={height}
                onPress={handlePopularTripPress}
            />
        );
    }, [width, height, handlePopularTripPress]);

    useEffect(() => {
        getPopularTripsFunction();
    }, [getPopularTripsFunction]);

    // Mémorisation du composant de chargement
    const loadingView = useMemo(() => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1776ba" />
        </View>
    ), []);

    return (
        <>
            {loading ? (
                loadingView
            ) : (
                <ScrollView
                    style={dynamicStyles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }>

                    {/* Rechercher un départ */}
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, dynamicStyles.titleText]}>
                            Où voulez-vous
                        </Text>
                        <Text style={[styles.title, dynamicStyles.titleText]}>
                            aller ?
                        </Text>
                    </View>
                    <View style={styles.searchSectionContainer}>
                        <View style={styles.subContainer}>
                            <Pressable
                                onPress={handleSearchPress}
                                style={[styles.searchContainer, dynamicStyles.searchContainer]}>
                                <View style={styles.searchContent}>
                                    <MaterialCommunityIcons
                                        size={20}
                                        name="bus"
                                        color={searchColors.iconColor}
                                    />
                                    <Text style={[styles.searchText, dynamicStyles.searchText]}>
                                        Rechercher un départ
                                    </Text>
                                </View>
                            </Pressable>
                        </View>
                    </View>
                    {/* Rechercher un départ */}

                    {/* Nos top itinéraires */}
                    {popularTrips.length > 0 && (
                        <View style={styles.itinerarySection}>
                            <View style={styles.carouselWrapper}>
                                <View style={styles.carouselTitleContainer}>
                                    <Text style={styles.carouselTitle}>
                                        Nos top itinéraires
                                    </Text>
                                    <Pressable style={styles.seeMoreButton} onPress={handleSeeMorePress}>
                                        <Text style={styles.seeMoreText}>
                                            Plus
                                        </Text>
                                    </Pressable>
                                </View>
                                <View style={styles.sliderContainer}>
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={popularTrips}
                                        keyExtractor={keyExtractor}
                                        contentContainerStyle={styles.carouselContent}
                                        renderItem={renderPopularTrip}
                                        removeClippedSubviews={true}
                                        maxToRenderPerBatch={5}
                                        windowSize={5}
                                        initialNumToRender={3}
                                    />
                                </View>
                            </View>
                        </View>
                    )}
                    {/* Nos top itinéraires */}

                    {/* Nos itinéraires en promotion */}
                    <View style={styles.itinerarySection}>
                        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                            Nos itinéraires en promotion
                        </Text>

                        <View style={styles.cardsContainer}>
                            {PROMOTIONS.map(item => (
                                <ItineraryCard
                                    key={item.id}
                                    item={item}
                                    width={width}
                                    height={height}
                                    onPress={handlePromoCardPress}
                                />
                            ))}
                        </View>
                    </View>
                    {/* Nos itinéraires en promotion */}
                </ScrollView>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 0,
    },
    titleContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    title: {
        fontSize: 30,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'left',
    },
    searchSectionContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingBottom: 30,
    },
    subContainer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 10
    },
    searchContainer: {
        borderRadius: 15,
        height: 55,
        width: '100%',
    },
    searchContent: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        height: 55,
        paddingHorizontal: 20
    },
    searchText: {
        fontSize: 15,
        marginLeft: 10,
        fontFamily: "Ubuntu_Regular"
    },
    seeMoreText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#1776BA',
    },
    seeMoreButton: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 50,
    },
    itinerarySection: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 20,
        textAlign: 'left',
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    carouselWrapper: {
        width: '100%',
        borderRadius: 15,
        paddingVertical: 20,
        marginTop: 10,
        backgroundColor: '#1776BA',
    },
    sliderContainer: {
        width: '100%',
    },
    carouselContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    carouselTitleContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    carouselTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#ffffff',
        marginBottom: 0,
    },
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
