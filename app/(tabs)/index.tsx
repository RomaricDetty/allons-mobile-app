// @ts-nocheck
import { ItineraryCard, type ItineraryData } from '@/components/itinerary-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useState } from 'react';
import {
    Platform, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, View
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function HomeScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const colorScheme = useColorScheme() ?? 'dark';
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    
    const searchBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const searchTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const searchIconColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';

    const promotions: ItineraryData[] = [
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
    ];

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 2000);
    };

    const handleCardPress = (id: number) => {
        console.log('Itinerary pressed:', id);
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
            
            <View style={[styles.container, { paddingBottom: 30 }]}>
                <View style={styles.subContainer}>
                    <Pressable
                        onPress={() => console.log('Search button pressed')}
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

            <View style={styles.promotionsSection}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Nos itinéraires en promotion
                </Text>
                
                <View style={styles.cardsContainer}>
                    {promotions.map(item => (
                        <ItineraryCard 
                            key={item.id} 
                            item={item} 
                            onPress={handleCardPress}
                        />
                    ))}
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
});
