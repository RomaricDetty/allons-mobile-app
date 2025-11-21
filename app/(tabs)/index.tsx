// @ts-nocheck
import { getPopularTrips } from '@/api/trip';
import { DepartureCard } from '@/components/departure-card';
import { ItineraryCard } from '@/components/itinerary-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PopularTrip } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
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
    const searchBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const searchTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const searchIconColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    const promotions: PopularTrip[] = [
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

    /**
     * Fonction pour rafraîchir la liste des trajets populaires
     * @returns void
     */
    const onRefresh = () => {
        setRefreshing(true);
        getPopularTripsFunction();
        setTimeout(() => setRefreshing(false), 2000);
    };

    /**
     * Fonction pour gérer la pression sur une carte d'itinéraire
     * @param id - L'ID de l'itinéraire
     * @returns void
     */
    const handlePromoCardPress = (id: number) => {
        console.log('Itinerary pressed:', id);
    };

    /**
     * Fonction pour gérer la pression sur un trajet populaire
     * @param item - L'itinéraire
     * @returns void
     */
    const handlePopularTripPress = (item: PopularTrip) => {
        // console.log('Popular trip pressed:', item);
        navigation.navigate('trip/search', { popularTrip: item as PopularTrip });
    };

    /**
     * Récupère les trajets populaires
     * @returns void
     */
    const getPopularTripsFunction = async () => {
        try {
            setLoading(true);
            const response = await getPopularTrips();
            setPopularTrips(response.data || []);
        } catch (error) {
            console.error('Erreur dans la récupération des trajets populaires : ', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getPopularTripsFunction();
    }, []);

    return (
        <>
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1776ba" />
                </View>
            ) : (
                <ScrollView
                    style={{ backgroundColor, paddingTop: insets.top }}
                    contentContainerStyle={{ paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }>

                    {/* Rechercher un départ */}
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: textColor }]}>
                            Où voulez-vous
                        </Text>
                        <Text style={[styles.title, { color: textColor }]}>
                            aller ?
                        </Text>
                    </View>
                    <View style={[styles.container, { paddingBottom: 30 }]}>
                        <View style={styles.subContainer}>
                            <Pressable
                                onPress={() => navigation.navigate('trip/search')}
                                style={[styles.searchContainer, { backgroundColor: searchBackgroundColor }]}>
                                <View style={styles.searchContent}>
                                    <MaterialCommunityIcons
                                        size={20}
                                        name="bus"
                                        color={searchIconColor}
                                    />
                                    <Text style={[styles.searchText, { color: searchTextColor }]}>
                                        Rechercher un départ
                                    </Text>
                                </View>
                            </Pressable>
                        </View>
                    </View>
                    {/* Rechercher un départ */}

                    {/* Nos top itinéraires */}
                    <View style={styles.itinerarySection}>
                        {popularTrips.length > 0 && (
                            <View style={[styles.carouselWrapper, { backgroundColor: '#1776BA' }]}>
                                <View style={[styles.carouselTitleContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' , marginBottom: 10}]}>
                                    <Text style={[styles.sectionTitle, { color: '#ffffff', marginBottom: 0 }]}>
                                        Nos top itinéraires
                                    </Text>
                                    <Pressable style={{ backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50 }} onPress={() => console.log('Okay')}>
                                        <Text style={[styles.seeMoreText, { color: '#1776BA' }]}>
                                            Plus
                                        </Text>
                                    </Pressable>
                                </View>
                                <View style={styles.sliderContainer}>
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={popularTrips}
                                        keyExtractor={(item) => item.id}
                                        contentContainerStyle={styles.carouselContent}
                                        renderItem={({ item }) => {
                                            return (
                                                <DepartureCard
                                                    item={item}
                                                    width={width}
                                                    height={height}
                                                    onPress={handlePopularTripPress}
                                                />
                                            );
                                        }}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                    {/* Nos top itinéraires */}

                    {/* Nos itinéraires en promotion */}
                    <View style={styles.itinerarySection}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            Nos itinéraires en promotion
                        </Text>

                        <View style={styles.cardsContainer}>
                            {promotions.map(item => (
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
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
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
        color: '#ffffff',
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
