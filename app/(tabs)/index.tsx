// @ts-nocheck
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNavigation } from 'expo-router';
import { useState } from 'react';
import {
    ImageBackground,
    Platform, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, View,
    useWindowDimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function HomeScreen() {
    // Les states
    const { width, height } = useWindowDimensions();
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const colorScheme = useColorScheme() ?? 'dark';
    
    // Couleurs du thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = Colors[colorScheme].icon;
    
    // Couleurs spécifiques pour le champ de recherche
    const searchBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const searchTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const searchIconColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    // Données mock pour les itinéraires en promotion
    const promotions = [
        {
            id: 1,
            route: 'Abidjan → Yamoussoukro',
            image: require('@/assets/images/basilique.jpg'), // Remplacez par votre image
            compagnie: 'UTB',
            tarif: '2500 F',
            duree: '2H',
            placesDisponibles: 10,
        },
        {
            id: 2,
            route: 'Abidjan → Bouaké',
            image: require('@/assets/images/bouake.jpg'), // Remplacez par votre image
            compagnie: 'SBTA',
            tarif: '3000 F',
            duree: '3H',
            placesDisponibles: 20,
        },
        {
            id: 3,
            route: 'Divo → Bouaké',
            image: require('@/assets/images/divo.jpg'), // Remplacez par votre image
            compagnie: 'SBTA',
            tarif: '3500 F',
            duree: '2H',
            placesDisponibles: 15,
        },
    ];

    // Les fonctions
    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }

    /**
     * Rend une carte d'itinéraire en promotion
     * Design épuré avec informations clés pour une meilleure UX
     */
    const renderItineraryCard = (item: typeof promotions[0]) => {
        // Calcul de la largeur pour affichage 2 par ligne
        const cardWidth = (width - 40 - 15) / 2;
        
        // Extraction de la destination depuis la route
        const destination = item.route.split('→')[1]?.trim() || item.route;
        const origin = item.route.split('→')[0]?.trim() || '';
        
        return (
            <Pressable
                key={item.id}
                style={[
                    styles.itineraryCard,
                    { width: cardWidth }
                ]}
                onPress={() => console.log('Itinerary pressed:', item.id)}>
                <ImageBackground
                    source={item.image}
                    style={styles.cardImage}
                    resizeMode="cover">
                    {/* Gradient overlay en bas pour améliorer la lisibilité */}
                    <View style={styles.gradientOverlay} />
                    
                    {/* Badge tarif en haut à gauche */}
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>{item.tarif}</Text>
                    </View>
                    
                    
                    {/* Informations principales en bas */}
                    <View style={styles.cardBottomContent}>
                        {/* Localisation */}
                        <View style={styles.locationContainer}>
                            {/* <MaterialCommunityIcons 
                                name="map-marker" 
                                size={14} 
                                color="#FFFFFF" 
                            /> */}
                            <View style={styles.locationTextContainer}>
                                <Text style={styles.locationOrigin}>{origin}</Text>
                                <Text style={styles.locationDestination}>{destination}</Text>
                            </View>
                        </View>
                        
                        {/* Informations secondaires (durée et places) */}
                        <View style={styles.infoRow}>
                            {/* Durée */}
                            {item.duree && (
                                <View style={styles.infoBadge}>
                                    <MaterialCommunityIcons 
                                        name="clock-outline" 
                                        size={12} 
                                        color="#FFFFFF" 
                                    />
                                    <Text style={styles.infoText}>{item.duree}</Text>
                                </View>
                            )}
                            
                            {/* Places disponibles */}
                            {item.placesDisponibles !== null && (
                                <View style={[
                                    styles.infoBadge,
                                    item.placesDisponibles < 5 && styles.infoBadgeUrgent
                                ]}>
                                    <MaterialCommunityIcons 
                                        name="seat-passenger" 
                                        size={12} 
                                        color="#FFFFFF" 
                                    />
                                    <Text style={styles.infoText}>{item.placesDisponibles} places</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ImageBackground>
            </Pressable>
        );
    };

    return (
        <ScrollView 
            style={{ backgroundColor }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: textColor }]}>
                    Où voulez-vous
                </Text>
                <Text style={[styles.title, { color: textColor }]}>
                    aller ?
                </Text>
            </View>
            <View style={[styles.container, {paddingBottom: 30}]}>
                {/* Champ de recherche */}
                <View style={styles.subContainer}>
                    <Pressable
                        onPress={() => /*navigation.navigate('Search')*/ console.log('Search button pressed')}
                        style={[
                            styles.searchContainer,
                            { 
                                backgroundColor: searchBackgroundColor,
                            }
                        ]}>
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
                {/* Champ de recherche */}
            </View>

            {/* Section Itinéraires en promotion */}
            <View style={styles.promotionsSection}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Nos itinéraires en promotion
                </Text>
                
                <View style={styles.cardsContainer}>
                    {promotions.map(renderItineraryCard)}
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 60,
        // paddingBottom: 20,
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
        borderRadius: 30,
        height: 50,
        width: '100%',
    },

    searchContent: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        height: 50,
        paddingHorizontal: 20
    },

    searchText: {
        fontSize: 15,
        marginLeft: 10,
        fontFamily: "Ubuntu_Regular"
    },

    promotionsSection: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 20,
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
        gap: 15,
    },

    itineraryCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        aspectRatio: 0.75,
    },

    cardImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
    },

    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

    priceBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        margin: 12,
        marginBottom: 'auto',
    },

    priceText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
    },

    cardBottomContent: {
        paddingHorizontal: 10,
        paddingBottom: 15,
    },

    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },

    locationTextContainer: {
        // marginLeft: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },

    locationOrigin: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        // opacity: 0.85,
    },

    locationDestination: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 2,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },

    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },

    infoBadgeUrgent: {
        backgroundColor: 'rgba(255, 87, 34, 0.8)',
    },

    infoText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
    },
});
