// @ts-nocheck
import { authGetUserInfo } from '@/api/auth_register';
import { getPopularTrips } from '@/api/trip';
import { DepartureCard } from '@/components/departure-card';
import { ItineraryCard } from '@/components/itinerary-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { User } from '@/interfaces';
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
    View,
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
 * Carte de prochain voyage mémorisée
 */
const NextTripCard = memo(() => (
    <View style={[styles.nextTripCard, { backgroundColor: PRIMARY_COLOR }]}>
        {/* Section gauche - Départ */}
        <View style={styles.tripSection}>
            <View style={styles.tripHeader}>
                <MaterialCommunityIcons name="bus" size={16} color="#FFFFFF" />
                <Text style={styles.tripTime}>18:20</Text>
            </View>
            <Text style={styles.tripAirportCode}>BOU</Text>
            <Text style={styles.tripCity}>Bouaké</Text>
        </View>

        {/* Section centrale - Durée */}
        <View style={styles.tripCenter}>
            <View style={styles.tripArcContainer}>
                <View style={styles.tripArc} />
            </View>
            <Text style={styles.tripDuration}>7h20min</Text>
        </View>

        {/* Section droite - Arrivée */}
        <View style={[styles.tripSection, styles.tripSectionRight]}>
            <View style={styles.tripHeader}>
                <MaterialCommunityIcons name="bus-stop" size={16} color="#FFFFFF" />
                <Text style={styles.tripTime}>01:00</Text>
            </View>
            <Text style={styles.tripAirportCode}>ABJ</Text>
            <Text style={styles.tripCity}>Abidjan</Text>
        </View>
    </View>
));

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
    const [user, setUser] = useState<User | null>(null);
    const colorScheme = useColorScheme() ?? 'light';
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // ⚠️ IMPORTANT: Appeler tous les hooks AVANT tout useMemo/useCallback
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

            if (token && userId) {
                const response = await authGetUserInfo(userId, token);
                if (response.status === 200) {
                    setUser(response.data);
                }
            }
        } catch (error) {
            console.error('Erreur récupération user info:', error);
        }
    }, []);

    /**
     * Récupère les trajets populaires
     */
    const fetchPopularTrips = useCallback(async () => {
        try {
            const response = await getPopularTrips();
            setPopularTrips(response.data || []);
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
            await Promise.all([fetchUserInfo(), fetchPopularTrips()]);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchUserInfo, fetchPopularTrips]);

    /**
     * Rafraîchit les données
     */
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchUserInfo(), fetchPopularTrips()]);
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
    const handlePromoCardPress = useCallback(
        (id: number) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            console.log('Promo card pressed:', id);
        },
        []
    );

    /**
     * Bouton "Voir plus"
     */
    const handleSeeMorePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        console.log('See more pressed');
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
     * Key extractor pour FlatList
     */
    const keyExtractor = useCallback((item: PopularTrip) => String(item.id), []);

    /**
     * Séparateur entre items
     */
    const ItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

    /**
     * =================================================================
     * RENDER
     * =================================================================
     */

    if (loading) {
        return <LoadingView />;
    }

    return (
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
            {popularTrips.length > 0 && (
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
            )}

            {/* Promotions */}
            {PROMOTIONS.length > 0 && (
                <View style={styles.itinerarySection}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Nos itinéraires en promotion</Text>
                    <View style={styles.cardsContainer}>
                        {PROMOTIONS.map((item) => (
                            <ItineraryCard key={item.id} item={item} width={width} height={height} onPress={handlePromoCardPress} />
                        ))}
                    </View>
                </View>
            )}

            {/* Prochain voyage */}
            {user && (
                <View style={styles.nextTripContainer}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Prochain voyage</Text>
                    <NextTripCard />
                </View>
            )}
        </ScrollView>
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
        paddingBottom: 40,
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
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    nextTripCard: {
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    tripSection: {
        flex: 1,
        alignItems: 'flex-start',
    },
    tripSectionRight: {
        alignItems: 'flex-end',
    },
    tripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    tripTime: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#FFFFFF',
    },
    tripAirportCode: {
        fontSize: 32,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    tripCity: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#FFFFFF',
        opacity: 0.8,
    },
    tripCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        position: 'relative',
        minWidth: 90,
        height: 55,
    },
    tripArcContainer: {
        width: 120,
        height: 90,
        position: 'absolute',
        top: 0,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    tripArc: {
        width: 120,
        height: 90,
        borderRadius: 90,
        borderWidth: 2.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        position: 'absolute',
        left: 0,
    },
    tripDuration: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
        marginTop: 25,
        zIndex: 1,
    },
});