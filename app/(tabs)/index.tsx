// @ts-nocheck
import { getNextTrip, getPopularTrips } from '@/api/trip';
import { BottomSheet } from '@/components/bottom-sheet';
import { ItineraryCard } from '@/components/itinerary-card';
import { HomeSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { formatBookingDate, formatFullDate } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Booking } from '@/interfaces';
import { PopularTrip } from '@/types';
import { getAuthToken } from '@/utils/storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

const FLATLIST_CONFIG = {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 5,
    windowSize: 5,
    initialNumToRender: 3,
    updateCellsBatchingPeriod: 50,
};

const PRIMARY_COLOR = '#1776BA';

/**
 * =================================================================
 * COMPOSANTS MÉMORISÉS
 * =================================================================
 */

/**
 * Salutation animée : apparaît au login, disparaît au logout
 */
const GreetingSection = memo(({ firstName, textColor }: { firstName: string | null; textColor: string }) => {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        return hour < 18 ? 'Bonjour' : 'Bonsoir';
    }, []);

    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-10)).current;
    const [displayName, setDisplayName] = useState<string | null>(firstName);

    useEffect(() => {
        if (firstName) {
            setDisplayName(firstName.split(' ')[0]);
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 9,
                    tension: 80,
                    useNativeDriver: true,
                }),
            ]).start();
            return;
        }

        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setDisplayName(null);
            }
        });
    }, [firstName, opacity, translateY]);

    if (!displayName) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.nameContainer,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Text style={[styles.nameText, { color: textColor }]}>
                {greeting} {displayName},
            </Text>
        </Animated.View>
    );
});

GreetingSection.displayName = 'GreetingSection';

/**
 * Titre principal de l'accueil
 */
const TitleSection = memo(({ textColor }: { textColor: string }) => (
    <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: textColor }]}>Où voulez-vous</Text>
        <Text style={[styles.title, { color: textColor }]}>aller ?</Text>
    </View>
));

TitleSection.displayName = 'TitleSection';

/**
 * Barre de recherche
 */
const SearchBar = memo(
    ({
        onPress,
        backgroundColor,
        borderColor,
        textColor,
        iconColor,
    }: {
        onPress: () => void;
        backgroundColor: string;
        borderColor: string;
        textColor: string;
        iconColor: string;
    }) => (
        <View style={styles.searchSectionContainer}>
            <Pressable
                onPress={onPress}
                style={[styles.searchContainer, { backgroundColor, borderColor }]}
                android_ripple={{ color: 'rgba(23, 118, 186, 0.12)' }}
            >
                <View style={styles.searchIconBlock}>
                    <MaterialCommunityIcons size={22} name="magnify" color={iconColor} />
                </View>
                <Text style={[styles.searchText, { color: textColor }]}>Rechercher un départ</Text>
                <MaterialCommunityIcons size={20} name="bus" color={iconColor} />
            </Pressable>
        </View>
    ),
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
                <Pressable style={styles.seeMoreButton} onPress={onSeeMore} hitSlop={8}>
                    <Text style={styles.seeMoreText}>Plus</Text>
                </Pressable>
            )}
        </View>
    ),
);

SectionHeader.displayName = 'SectionHeader';

/**
 * Extrait le nom de ville (API peut retourner city ou cityName)
 */
function getCityName(station: { city?: string; cityName?: string } | undefined): string {
    return (station as any)?.city ?? (station as any)?.cityName ?? '—';
}

/**
 * Carte de prochain voyage
 */
const NextTripCard = memo(
    ({
        booking,
        cardWidth,
        onPress,
        loading = false,
        cardBackground,
        borderColor,
        textColor,
        secondaryText,
        iconMutedBg,
    }: {
        booking: Booking;
        cardWidth: number;
        onPress?: () => void;
        loading?: boolean;
        cardBackground: string;
        borderColor: string;
        textColor: string;
        secondaryText: string;
        iconMutedBg: string;
    }) => {
        const fromCity = getCityName(booking?.trip?.stationFrom);
        const toCity = getCityName(booking?.trip?.stationTo);
        const route = `${fromCity} → ${toCity}`;
        const dateTrip = formatFullDate(booking.departureDateTime);
        const timeTrip = booking.departureTime;

        if (loading) {
            return (
                <View
                    style={[
                        styles.nextTripCardContainer,
                        { width: cardWidth, backgroundColor: 'transparent', borderWidth: 0 },
                    ]}
                >
                    <ActivityIndicator size="small" color="#fff" />
                </View>
            );
        }

        return (
            <Pressable
                style={[
                    styles.nextTripCardContainer,
                    { width: cardWidth, backgroundColor: cardBackground, borderColor },
                ]}
                onPress={onPress}
            >
                <View style={[styles.nextTripImageContainer, { backgroundColor: iconMutedBg }]}>
                    <MaterialCommunityIcons name="bus" size={36} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.nextTripContentContainer}>
                    <Text style={[styles.nextTripMetaText, { color: secondaryText }]} numberOfLines={1}>
                        {dateTrip} · {timeTrip}
                    </Text>
                    <Text style={[styles.nextTripRouteText, { color: textColor }]} numberOfLines={2}>
                        {route}
                    </Text>
                </View>
            </Pressable>
        );
    },
);

NextTripCard.displayName = 'NextTripCard';

/**
 * État de chargement initial — skeleton révélateur
 */
const LoadingView = memo(({ backgroundColor }: { backgroundColor: string }) => (
    <View style={[styles.loadingContainer, { backgroundColor }]}>
        <HomeSkeleton />
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
    const { user, refreshUser } = useAuth();
    const colors = useAppColors();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [popularTrips, setPopularTrips] = useState<PopularTrip[]>([]);
    const [nextTrip, setNextTrip] = useState<Booking[]>([]);
    const [nextTripsSheetVisible, setNextTripsSheetVisible] = useState(false);
    const [refreshTintColor, setRefreshTintColor] = useState(PRIMARY_COLOR);
    const colorScheme = useColorScheme() ?? 'light';
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const greetingFirstName = useMemo(() => {
        const name = user?.firstName?.trim();
        return name ? name : null;
    }, [user?.firstName]);

    const themeColors = useMemo(
        () => ({
            background: colors.background,
            text: colors.text,
            secondaryText: colors.secondaryText,
            border: colors.border,
            cardBackground: colors.cardBackground,
            searchBg: colors.inputBackground,
            searchText: colors.placeholder,
            searchIcon: colors.activeTabColor,
            infoMuted: colors.infoMuted,
            refreshTint: colorScheme === 'dark' ? '#FFFFFF' : PRIMARY_COLOR,
        }),
        [colors, colorScheme],
    );

    const fetchNextTripInfo = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token || token.trim() === '') {
                setNextTrip([]);
                return false;
            }
            const response = await getNextTrip(token);
            const raw = response.data;
            const extracted = Array.isArray(raw) ? raw : raw?.data;
            const list: Booking[] = Array.isArray(extracted)
                ? extracted
                : extracted != null
                  ? [extracted as Booking]
                  : [];
            setNextTrip(list);
            return true;
        } catch (error) {
            console.error('Erreur récupération prochain voyage:', error);
            return false;
        }
    }, []);

    const fetchPopularTrips = useCallback(async () => {
        try {
            const response = await getPopularTrips();
            const raw = response.data;
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            // Un seul trajet par couple origine → destination
            const seen = new Set<string>();
            const deduped = [];
            for (const item of list) {
                const from =
                    item?.fromCity ||
                    item?.departureCity ||
                    item?.originCity ||
                    item?.stationFrom?.city ||
                    '';
                const to =
                    item?.toCity ||
                    item?.arrivalCity ||
                    item?.destinationCity ||
                    item?.stationTo?.city ||
                    '';
                const key = `${String(from).trim().toLowerCase()}|${String(to).trim().toLowerCase()}`;
                if (!from && !to) {
                    deduped.push(item);
                    continue;
                }
                if (seen.has(key)) continue;
                seen.add(key);
                deduped.push(item);
            }
            setPopularTrips(deduped);
        } catch (error) {
            console.error('Erreur récupération trajets populaires:', error);
            setPopularTrips([]);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([refreshUser(), fetchPopularTrips(), fetchNextTripInfo()]);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    }, [refreshUser, fetchPopularTrips, fetchNextTripInfo]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshUser(), fetchPopularTrips(), fetchNextTripInfo()]);
        } catch (error) {
            console.error('Erreur rafraîchissement:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshUser, fetchPopularTrips, fetchNextTripInfo]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useFocusEffect(
        useCallback(() => {
            refreshUser();
            fetchNextTripInfo();
        }, [refreshUser, fetchNextTripInfo]),
    );

    useEffect(() => {
        if (!user) {
            setNextTrip([]);
        }
    }, [user]);

    useEffect(() => {
        const tint = colorScheme === 'dark' ? '#FFFFFF' : PRIMARY_COLOR;
        const t = setTimeout(() => setRefreshTintColor(tint), 100);
        return () => clearTimeout(t);
    }, [colorScheme]);

    const handleSearchPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('trip/search');
    }, [navigation]);

    const handlePromoCardPress = useCallback(
        (item: PopularTrip) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('trip/search', { popularTrip: item });
        },
        [navigation],
    );

    const handleNextTripPress = useCallback(
        (booking: Booking) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('trip/ticket-details' as never, {
                bookingId: booking.id,
                departureCity: booking.trip?.stationFrom?.city ?? '',
                arrivalCity: booking.trip?.stationTo?.city ?? '',
            } as never);
        },
        [navigation],
    );

    const handleSeeMoreNextTripsPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setNextTripsSheetVisible(true);
    }, []);

    const nextTripCardWidth = (width - 100) / 2.2;

    const renderNextTrip = useCallback(
        ({ item }: { item: Booking }) => (
            <NextTripCard
                booking={item}
                cardWidth={nextTripCardWidth}
                onPress={() => handleNextTripPress(item)}
                cardBackground={themeColors.cardBackground}
                borderColor={themeColors.border}
                textColor={themeColors.text}
                secondaryText={themeColors.secondaryText}
                iconMutedBg={themeColors.infoMuted}
            />
        ),
        [nextTripCardWidth, handleNextTripPress, themeColors],
    );

    const keyExtractor = useCallback((item: PopularTrip | Booking) => String(item.id), []);
    const ItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);
    const nextTripsList = useMemo(() => nextTrip, [nextTrip]);

    const renderNextTripSheetItem = useCallback(
        (booking: Booking, onSelect: () => void) => (
            <Pressable
                style={[styles.nextTripSheetRow, { borderBottomColor: themeColors.border }]}
                onPress={() => {
                    handleNextTripPress(booking);
                    onSelect();
                }}
            >
                <View style={styles.nextTripSheetIcon}>
                    <MaterialCommunityIcons name="bus" size={20} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.nextTripSheetRowContent}>
                    <Text style={[styles.nextTripSheetRoute, { color: themeColors.text }]} numberOfLines={1}>
                        {`${getCityName(booking?.trip?.stationFrom)} → ${getCityName(booking?.trip?.stationTo)}`}
                    </Text>
                    <Text style={[styles.nextTripSheetMeta, { color: themeColors.secondaryText }]}>
                        {formatBookingDate(booking.departureDateTime)} · {booking.companyName}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={themeColors.secondaryText} />
            </Pressable>
        ),
        [themeColors, handleNextTripPress],
    );

    const handleLocationBusPress = useCallback(() => {
        if (!user) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('profile' as never);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('profile/bus-rental-request' as never);
    }, [navigation, user]);

    if (loading) {
        return <LoadingView backgroundColor={themeColors.background} />;
    }

    return (
        <>
            <ScrollView
                style={[styles.scrollView, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={refreshTintColor}
                        colors={[refreshTintColor]}
                    />
                }
            >
                {!refreshing && (
                    <>
                        <GreetingSection firstName={greetingFirstName} textColor={themeColors.text} />
                        <TitleSection textColor={themeColors.text} />

                        <SearchBar
                            onPress={handleSearchPress}
                            backgroundColor={themeColors.searchBg}
                            borderColor={themeColors.border}
                            textColor={themeColors.searchText}
                            iconColor={themeColors.searchIcon}
                        />

                        {popularTrips.length > 0 && (
                            <View style={styles.itinerarySection}>
                                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                                    Nos top itinéraires
                                </Text>
                                <View style={styles.cardsContainer}>
                                    {popularTrips.map((item) => (
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
                        )}

                        {user && nextTrip.length > 0 && (
                            <View style={styles.nextTripContainer}>
                                <View style={styles.itinerarySection}>
                                    <View style={styles.carouselWrapper}>
                                        <SectionHeader
                                            title={
                                                nextTrip.length > 1
                                                    ? 'Voyages de la semaine'
                                                    : 'Voyage de la semaine'
                                            }
                                            onSeeMore={handleSeeMoreNextTripsPress}
                                            showSeeMore={nextTrip.length > 3}
                                        />
                                        <FlatList
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            data={nextTrip.slice(0, 3)}
                                            keyExtractor={keyExtractor}
                                            renderItem={renderNextTrip}
                                            ItemSeparatorComponent={ItemSeparator}
                                            contentContainerStyle={styles.carouselContent}
                                            {...FLATLIST_CONFIG}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        <Pressable
                            style={({ pressed }) => [styles.locationBusCard, { opacity: pressed ? 0.92 : 1 }]}
                            onPress={handleLocationBusPress}
                            android_ripple={{ color: 'rgba(23, 118, 186, 0.08)' }}
                        >
                            <View
                                style={[
                                    styles.locationBusContent,
                                    {
                                        backgroundColor: themeColors.cardBackground,
                                        borderColor: themeColors.border,
                                    },
                                ]}
                            >
                                <View style={styles.locationBusIconWrap}>
                                    <MaterialCommunityIcons name="bus-multiple" size={24} color={PRIMARY_COLOR} />
                                </View>
                                <View style={styles.locationBusTextWrap}>
                                    <Text style={[styles.locationBusTitle, { color: themeColors.text }]}>
                                        Location de bus
                                    </Text>
                                    <Text style={[styles.locationBusSubtitle, { color: themeColors.secondaryText }]}>
                                        Réservez un bus pour votre groupe ou un événement
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={22} color={PRIMARY_COLOR} />
                            </View>
                        </Pressable>
                    </>
                )}
            </ScrollView>

            <BottomSheet<Booking>
                visible={nextTripsSheetVisible}
                onClose={() => setNextTripsSheetVisible(false)}
                title="Voyages de la semaine"
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
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 110,
    },
    nameContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    nameText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'left',
    },
    titleContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'left',
        lineHeight: 34,
    },
    searchSectionContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 28,
    },
    searchContainer: {
        borderRadius: 12,
        minHeight: 52,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 8,
    },
    searchIconBlock: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Ubuntu_Regular',
    },
    seeMoreText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    seeMoreButton: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    itinerarySection: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 14,
        textAlign: 'left',
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    carouselWrapper: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 4,
        backgroundColor: PRIMARY_COLOR,
    },
    carouselContent: {
        paddingHorizontal: 16,
    },
    carouselTitleContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        paddingBottom: 8,
    },
    nextTripCardContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    nextTripImageContainer: {
        width: '100%',
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextTripContentContainer: {
        padding: 12,
    },
    nextTripMetaText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    nextTripRouteText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
        lineHeight: 18,
    },
    nextTripSheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    nextTripSheetIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextTripSheetRowContent: {
        flex: 1,
    },
    nextTripSheetRoute: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    nextTripSheetMeta: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    locationBusCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    locationBusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: 12,
        gap: 12,
    },
    locationBusIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationBusTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    locationBusTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    locationBusSubtitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
    },
});
