// @ts-nocheck
import { authGetUserInfo } from '@/api/auth_register';
import { getNextTrip, getPopularTrips } from '@/api/trip';
import { BottomSheet } from '@/components/bottom-sheet';
import { DepartureCard } from '@/components/departure-card';
import { ItineraryCard } from '@/components/itinerary-card';
import { formatBookingDate } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Booking, User } from '@/interfaces';
import { PopularTrip } from '@/types';
import { getAuthToken, getUserId } from '@/utils/storage';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * =================================================================
 * CONSTANTES
 * =================================================================
 */

// Données de promotion statiques
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

// Configuration du FlatList pour optimisation
const FLATLIST_CONFIG = {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 5,
    windowSize: 5,
    initialNumToRender: 3,
    updateCellsBatchingPeriod: 50,
};

// Couleur primaire
const PRIMARY_COLOR = '#1776BA';

/**
 * =================================================================
 * COMPOSANTS MÉMORISÉS
 * =================================================================
 */

/**
 * Composant de salutation mémorisé
 */
const GreetingSection = memo(({ user, textColor }: { user: User; textColor: string }) => {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        return hour < 18 ? 'Bonjour' : 'Bonsoir';
    }, []);

    const firstName = useMemo(() => user.firstName.split(' ')[0], [user.firstName]);

    return (
        <View style={styles.nameContainer}>
            <Text style={[styles.nameText, { color: textColor }]}>
                {greeting} {firstName},
            </Text>
        </View>
    );
});

GreetingSection.displayName = 'GreetingSection';

/**
 * Composant de titre mémorisé
 */
const TitleSection = memo(({ textColor }: { textColor: string }) => (
    <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: textColor }]}>Où voulez-vous</Text>
        <Text style={[styles.title, { color: textColor }]}>aller ?</Text>
    </View>
));

TitleSection.displayName = 'TitleSection';

/**
 * Barre de recherche mémorisée
 */
const SearchBar = memo(
    ({
        onPress,
        backgroundColor,
        textColor,
        iconColor,
    }: {
        onPress: () => void;
        backgroundColor: string;
        textColor: string;
        iconColor: string;
    }) => (
        <View style={styles.searchSectionContainer}>
            <View style={styles.subContainer}>
                <Pressable
                    onPress={onPress}
                    style={[styles.searchContainer, { backgroundColor }]}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                    <View style={styles.searchContent}>
                        <MaterialCommunityIcons size={20} name="bus" color={iconColor} />
                        <Text style={[styles.searchText, { color: textColor }]}>
                            Rechercher un départ
                        </Text>
                    </View>
                </Pressable>
            </View>
        </View>
    )
);

SearchBar.displayName = 'SearchBar';

/**
 * En-tête de section avec bouton "Plus"
 */
const SectionHeader = memo(
    ({ title, onSeeMore, showSeeMore = false }: { title: string; onSeeMore?: () => void; showSeeMore?: boolean }) => (
        <View style={styles.carouselTitleContainer}>
            <Text style={styles.carouselTitle}>{title}</Text>
            {showSeeMore && onSeeMore && (
                <Pressable style={styles.seeMoreButton} onPress={onSeeMore}>
                    <Text style={styles.seeMoreText}>Plus</Text>
                </Pressable>
            )}
        </View>
    )
);

SectionHeader.displayName = 'SectionHeader';

/**
 * Extrait le nom de ville (API peut retourner city ou cityName)
 */
function getCityName(station: { city?: string; cityName?: string } | undefined): string {
    return (station as any)?.city ?? (station as any)?.cityName ?? '—';
}

/**
 * Carte de prochain voyage, même design que DepartureCard
 */
const NextTripCard = memo(({ booking, cardWidth, onPress, loading = false }: { booking: Booking; cardWidth: number; onPress?: () => void; loading?: boolean }) => {
    const fromCity = getCityName(booking?.trip?.stationFrom);
    const toCity = getCityName(booking?.trip?.stationTo);
    const route = `${fromCity} → ${toCity}`;
    const price = `${parseFloat(booking.totalAmount).toLocaleString('fr-FR')} ${booking.currency}`;
    return (
        loading ? (
            <View style={[styles.nextTripCardContainer, { width: cardWidth, backgroundColor: 'transparent' }]}>
                <ActivityIndicator size="small" color={'#fff'} />
            </View>
        ) : (
            <Pressable style={[styles.nextTripCardContainer, { width: cardWidth }]} onPress={onPress}>
                <View style={styles.nextTripImageContainer}>
                    <MaterialCommunityIcons name="bus" size={60} color="#1776BA" />
                </View>
                <View style={styles.nextTripContentContainer}>
                    <Text style={styles.nextTripPriceText}>{price}</Text>
                    <Text style={styles.nextTripRouteText} numberOfLines={2}>
                        {route}
                    </Text>
                </View>
            </Pressable>
        )
    );
});

NextTripCard.displayName = 'NextTripCard';

/**
 * Composant de chargement mémorisé
 */
const LoadingView = memo(() => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Chargement...</Text>
    </View>
));

LoadingView.displayName = 'LoadingView';

/**
 * =================================================================
 * COMPOSANT PRINCIPAL
 * =================================================================
 */

export default function HomeScreen() {
    const { width, height } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [popularTrips, setPopularTrips] = useState<PopularTrip[]>([]);
    const [nextTrip, setNextTrip] = useState<Booking | null>(null);
    const [nextTripsSheetVisible, setNextTripsSheetVisible] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const colorScheme = useColorScheme() ?? 'light';
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // pour respecter les Rules of Hooks
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    // Couleurs du thème mémorisées APRÈS les hooks
    const themeColors = useMemo(
        () => ({
            background: backgroundColor,
            text: textColor,
            searchBg: colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7',
            searchText: colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA',
            searchIcon: colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA',
        }),
        [backgroundColor, textColor, colorScheme]
    );

    /**
     * =================================================================
     * FONCTIONS DE RÉCUPÉRATION DE DONNÉES
     * =================================================================
     */

    /**
     * Récupère les informations de l'utilisateur
     */
    const fetchUserInfo = useCallback(async () => {
        try {
            const [token, userId] = await Promise.all([getAuthToken(), getUserId()]);
            console.log('token', token);
            console.log('userId', userId);
            if (token && userId && token !== null && userId !== null) {
                const response = await authGetUserInfo(userId, token);
                if (response.status === 200) {
                    setUser(response.data);
                }

                return true
            }

            setUser(null);
        } catch (error) {
            console.error('Erreur récupération user info:', error);
        }
    }, []);

    /**
     * Récupère le prochain voyage
     */
    const fetchNextTripInfo = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token || token.trim() === '') {
                return false;
            }
            const response = await getNextTrip(token);
            const raw = response.data;
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            const first = list ?? null;
            console.log('first ==> ', first);
            setNextTrip(first);
            return true;
        } catch (error) {
            console.error('Erreur récupération prochain voyage:', error);
            return false;
        }
    }, []);
    /**
     * Récupère les trajets populaires
     */
    const fetchPopularTrips = useCallback(async () => {
        try {
            const response = await getPopularTrips();
            const raw = response.data;
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            setPopularTrips(list);
        } catch (error) {
            console.error('Erreur récupération trajets populaires:', error);
            setPopularTrips([]);
        }
    }, []);

    /**
     * Charge toutes les données initiales
     */
    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([fetchUserInfo(), fetchPopularTrips(), fetchNextTripInfo()]);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchUserInfo, fetchPopularTrips, fetchNextTripInfo]);

    /**
     * Rafraîchit les données
     */
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchUserInfo(), fetchPopularTrips(), fetchNextTripInfo()]);
        } catch (error) {
            console.error('Erreur rafraîchissement:', error);
        } finally {
            setRefreshing(false);
        }
    }, [fetchUserInfo, fetchPopularTrips]);

    // Chargement initial
    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    /**
     * =================================================================
     * HANDLERS
     * =================================================================
     */

    /**
     * Navigation vers la recherche
     */
    const handleSearchPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('trip/search');
    }, [navigation]);

    /**
     * Clic sur un trajet populaire
     */
    const handlePopularTripPress = useCallback(
        (item: PopularTrip) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('trip/search', { popularTrip: item });
        },
        [navigation]
    );

    /**
     * Clic sur une promotion
     */
    /** Clic sur une carte "top itinéraire" : navigation vers la recherche avec le trajet pré-rempli */
    const handlePromoCardPress = useCallback(
        (item: PopularTrip) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('trip/search', { popularTrip: item });
        },
        [navigation]
    );

    /**
     * Clic sur la carte prochain voyage : ouvre les détails du ticket
     */
    /** Clic sur la carte prochain voyage : navigation vers ticket-details (l’API est appelée sur l’écran) */
    const handleNextTripPress = useCallback(
        (booking: Booking) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('trip/ticket-details' as never, { bookingId: booking.id } as never);
        },
        [navigation]
    );

    /**
     * Bouton "Voir plus"
     */
    const handleSeeMorePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        console.log('See more pressed');
    }, []);

    /** Ouvre le bottom sheet "Voyage de la semaine" avec la liste des nextTrips */
    const handleSeeMoreNextTripsPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setNextTripsSheetVisible(true);
    }, []);

    /**
     * =================================================================
     * RENDER FUNCTIONS POUR FLATLISTS
     * =================================================================
     */

    /**
     * Render item pour les trajets populaires
     */
    const renderPopularTrip = useCallback(
        ({ item }: { item: PopularTrip }) => (
            <DepartureCard item={item} width={width} height={height} onPress={handlePopularTripPress} />
        ),
        [width, height, handlePopularTripPress]
    );

    /**
     * Render item pour le prochain voyage
     */
    const nextTripCardWidth = (width - 100) / 2.2;

    const renderNextTrip = useCallback(
        ({ item }: { item: Booking }) => (
            <NextTripCard
                booking={item}
                cardWidth={nextTripCardWidth}
                onPress={() => handleNextTripPress(item)}
            />
        ),
        [width, handleNextTripPress]
    );

    /**
     * Key extractor pour FlatList
     */
    const keyExtractor = useCallback((item: PopularTrip) => String(item.id), []);

    /**
     * Séparateur entre items
     */
    const ItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

    /** Liste des prochains voyages pour le bottom sheet (tableau) */
    const nextTripsList = useMemo(
        () => (Array.isArray(nextTrip) ? nextTrip : nextTrip ? [nextTrip] : []),
        [nextTrip]
    );

    /** Ligne cliquable dans le bottom sheet "Voyage de la semaine" */
    const renderNextTripSheetItem = useCallback(
        (booking: Booking, onSelect: () => void) => (
            <Pressable
                style={[styles.nextTripSheetRow, { borderBottomColor: themeColors.searchBg }]}
                onPress={() => {
                    handleNextTripPress(booking);
                    onSelect();
                }}>
                <View style={styles.nextTripSheetRowContent}>
                    <Text style={[styles.nextTripSheetRoute, { color: themeColors.text }]} numberOfLines={1}>
                        {`${getCityName(booking?.trip?.stationFrom)} → ${getCityName(booking?.trip?.stationTo)}`}
                    </Text>
                    <Text style={[styles.nextTripSheetMeta, { color: themeColors.searchText }]}>
                        {formatBookingDate(booking.departureDateTime)} · {booking.companyName}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={themeColors.searchText} />
            </Pressable>
        ),
        [themeColors, handleNextTripPress]
    );

    /**
     * =================================================================
     * RENDER
     * =================================================================
     */

    if (loading) {
        return <LoadingView />;
    }

    return (
        <>
        <ScrollView
            style={[styles.scrollView, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} colors={[PRIMARY_COLOR]} />
            }
        >
            {/* Salutation */}
            {user && <GreetingSection user={user} textColor={themeColors.text} />}

            {/* Titre */}
            <TitleSection textColor={themeColors.text} />

            {/* Barre de recherche */}
            <SearchBar
                onPress={handleSearchPress}
                backgroundColor={themeColors.searchBg}
                textColor={themeColors.searchText}
                iconColor={themeColors.searchIcon}
            />

            {/* Trajets populaires */}
            {/* {popularTrips.length > 0 && (
                <View style={styles.itinerarySection}>
                    <View style={styles.carouselWrapper}>
                        <SectionHeader title="Nos top itinéraires" onSeeMore={handleSeeMorePress} showSeeMore={true} />
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={popularTrips}
                            keyExtractor={keyExtractor}
                            renderItem={renderPopularTrip}
                            ItemSeparatorComponent={ItemSeparator}
                            contentContainerStyle={styles.carouselContent}
                            {...FLATLIST_CONFIG}
                        />
                    </View>
                </View>
            )} */}

            {/* Top itinéraires */}
            {popularTrips.length > 0 && (
                <View style={styles.itinerarySection}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Nos top itinéraires</Text>
                    <View style={styles.cardsContainer}>
                        {popularTrips.map((item) => (
                            <ItineraryCard key={item.id} item={item} width={width} height={height} onPress={handlePromoCardPress} />
                        ))}
                    </View>
                </View>
            )}

            {/* Voyage de la semaine */}
            {user && (
                <View style={styles.nextTripContainer}>
                    {/* <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Voyage de la semaine</Text> */}
                    {/* <NextTripCard /> */}
                    {nextTrip && nextTrip.length > 0 && (
                        <View style={styles.itinerarySection}>
                            <View style={styles.carouselWrapper}>
                                <SectionHeader
                                    title="Voyage de la semaine"
                                    onSeeMore={handleSeeMoreNextTripsPress}
                                    showSeeMore={true}
                                />
                                {/* nextTrip && nextTrip.length > 3 ? true : false */}
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={nextTrip}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderNextTrip}
                                    ItemSeparatorComponent={ItemSeparator}
                                    contentContainerStyle={styles.carouselContent}
                                    {...FLATLIST_CONFIG}
                                />
                            </View>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>

            <BottomSheet<Booking>
                visible={nextTripsSheetVisible}
                onClose={() => setNextTripsSheetVisible(false)}
                title="Voyage de la semaine"
                data={nextTripsList}
                keyExtractor={(item) => item.id}
                renderItem={renderNextTripSheetItem}
                emptyText="Aucun voyage à venir"
            />
        </>
    );
}

/**
 * =================================================================
 * STYLES
 * =================================================================
 */

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    nameContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    nameText: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'left',
    },
    titleContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    title: {
        fontSize: 28,
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
        marginTop: 10,
    },
    searchContainer: {
        borderRadius: 15,
        height: 55,
        width: '100%',
        overflow: 'hidden',
    },
    searchContent: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        height: 55,
        paddingHorizontal: 20,
    },
    searchText: {
        fontSize: 15,
        marginLeft: 10,
        fontFamily: 'Ubuntu_Regular',
    },
    seeMoreText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: PRIMARY_COLOR,
    },
    seeMoreButton: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
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
        backgroundColor: PRIMARY_COLOR,
    },
    carouselContent: {
        paddingHorizontal: 20,
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
    },
    itemSeparator: {
        width: 10,
    },
    nextTripContainer: {
        width: '100%',
        paddingBottom: 30,
    },
    nextTripCardContainer: {
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#bfcfe8',
    },
    nextTripImageContainer: {
        width: '100%',
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#dfe7f4',
    },
    nextTripContentContainer: {
        padding: 10,
        backgroundColor: '#FFFFFF',
    },
    nextTripPriceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#11181C',
        marginBottom: 6,
    },
    nextTripRouteText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#11181C',
        lineHeight: 18,
    },
    nextTripSheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
    },
    nextTripSheetRowContent: {
        flex: 1,
    },
    nextTripSheetRoute: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    nextTripSheetMeta: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
});