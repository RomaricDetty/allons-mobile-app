
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBusTracking } from '@/hooks/useBusTracking';
import { routingService } from '@/services/routingService';
import { BusStop, PassengerLocation } from '@/types/tracking';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OSMBusTrackerProps {
    tripId: string;
    bookingDetails: Object | any;
}

export default function OSMBusTracker({ tripId, bookingDetails }: OSMBusTrackerProps) {
    const { busPosition, busStops, trip, isConnected, isLoading, error } = useBusTracking(
        tripId,
        bookingDetails
    );
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    const [passengerLocation, setPassengerLocation] = useState<PassengerLocation | null>(null);
    const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
    const [nearestStop, setNearestStop] = useState<BusStop | null>(null);
    const [stopsWithDistances, setStopsWithDistances] = useState<BusStop[]>([]);
    const [showStopsPanel, setShowStopsPanel] = useState(true);
    const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[]>([]);

    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Couleurs du thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const panelBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const listItemBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8';
    const iconCircleBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8';

    // Couleur d'accentuation violet/bleu
    const accentColor = '#6A5ACD';
    const accentColorLight = 'rgba(106, 90, 205, 0.1)';
    const accentColorMedium = 'rgba(106, 90, 205, 0.3)';
    
    // Couleur de prix (vert)
    const priceColor = '#4CAF50';
    const priceBackgroundColor = colorScheme === 'dark' ? '#2E7D32' : '#E8F5E9';

    console.log('bookingDetails in OSMBusTracker ===>, ', JSON.parse(bookingDetails));
    console.log('tripId in OSMBusTracker ===>, ', tripId);

    // Animation de pulsation pour le marqueur du bus
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        return () => pulse.stop();
    }, []);

    // Initialiser la localisation du passager
    useEffect(() => {
        initPassengerLocation();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    // Calculer les distances quand la position du passager ou les arrêts changent
    useEffect(() => {
        if (passengerLocation && busStops.length > 0) {
            calculateStopDistances();
        }
    }, [passengerLocation, busStops, busPosition]);

    // Centrer la carte quand la position du bus change
    useEffect(() => {
        if (busPosition && passengerLocation && mapRef.current) {
            centerMapOnBusAndPassenger();
        }
    }, [busPosition]);

    // Calculer l'itinéraire au chargement du composant
    useEffect(() => {
        calculateRoute();
    }, []);


    /**
     * Initialise la localisation du passager
     * @returns 
     */
    const initPassengerLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès à la localisation est nécessaire pour afficher votre position"
                );
                // Utiliser les coordonnées par défaut si permission refusée
                setPassengerLocation({
                    latitude: 5.33542,
                    longitude: -4.00351,
                    accuracy: 50,
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            // Position initiale
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setPassengerLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                timestamp: new Date().toISOString(),
            });

            // Suivre les changements de position
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000, // Toutes les 10 secondes
                    distanceInterval: 50, // Ou tous les 50 mètres
                },
                (location) => {
                    setPassengerLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy || undefined,
                        timestamp: new Date().toISOString(),
                    });
                }
            );
        } catch (error) {
            console.error('Erreur localisation passager:', error);
            // Utiliser les coordonnées par défaut en cas d'erreur
            console.log('Erreur de localisation, utilisation des coordonnées par défaut');
            setPassengerLocation({
                latitude: 5.33542,
                longitude: -4.00351,
                accuracy: 50,
                timestamp: new Date().toISOString(),
            });
        }
    };

    /**
     * Calcule l'itinéraire entre St Jean Cocody et Yopougon Toits rouge
     * @returns 
     */
    const calculateRoute = async () => {
        try {
            // Coordonnées de départ : St Jean Cocody
            const startPoint = {
                latitude: 5.33542,
                longitude: -4.00351,
            };

            // Coordonnées d'arrivée : Yopougon Toits rouge
            const endPoint = {
                latitude: 5.317666,
                longitude: -4.089991,
            };

            const route = await routingService.getRoute(startPoint, endPoint);
            setRoutePath(route);
            console.log('Itinéraire calculé avec succès:', route.length, 'points');
        } catch (error) {
            console.error('Erreur calcul itinéraire:', error);
            // En cas d'erreur, utiliser un itinéraire simplifié (ligne droite)
            setRoutePath([
                { latitude: 5.33542, longitude: -4.00351 },
                { latitude: 5.317666, longitude: -4.089991 },
            ]);
        }
    };

    /**
     * Calcul les distances entre les arrêts et le passager
     * @returns 
     */
    const calculateStopDistances = useCallback(() => {
        if (!passengerLocation) return;

        const stopsWithDist = busStops.map((stop) => {
            const distanceFromUser = routingService.calculateDistance(
                passengerLocation,
                { latitude: stop.latitude, longitude: stop.longitude }
            );

            let distanceFromBus = 0;
            if (busPosition) {
                distanceFromBus = routingService.calculateDistance(
                    busPosition,
                    { latitude: stop.latitude, longitude: stop.longitude }
                );
            }

            return {
                ...stop,
                distanceFromUser,
                distanceFromBus,
            };
        });

        // Trier par distance depuis l'utilisateur
        stopsWithDist.sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));

        setStopsWithDistances(stopsWithDist);

        // Trouver l'arrêt le plus proche (qui n'est pas déjà passé)
        const availableStops = stopsWithDist.filter(
            (stop) => stop.status === 'pending' || stop.status === 'approaching'
        );

        if (availableStops.length > 0) {
            setNearestStop(availableStops[0]);
        }
    }, [passengerLocation, busStops, busPosition]);

    /**
     * Calcul l'ETA pour un arrêt
     * @param stop - L'arrêt à calculer l'ETA
     * @returns L'ETA sous forme de chaîne de caractères
     */
    const calculateETA = useCallback(
        (stop: BusStop): string => {
            if (!busPosition || !stop.distanceFromBus) return 'N/A';

            // Vitesse moyenne en ville: 30 km/h
            const averageSpeed = 30;
            const timeInHours = stop.distanceFromBus / averageSpeed;
            const timeInMinutes = Math.round(timeInHours * 60);

            if (timeInMinutes < 1) return '< 1 min';
            if (timeInMinutes < 60) return `${timeInMinutes} min`;

            const hours = Math.floor(timeInMinutes / 60);
            const minutes = timeInMinutes % 60;
            return `${hours}h ${minutes}min`;
        },
        [busPosition]
    );

    /**
     * Calcule l'ETA total jusqu'à la destination
     * @returns L'ETA total en minutes et l'heure d'arrivée
     */
    const destinationETA = useMemo(() => {
        if (!trip || !busPosition) return null;

        const destinationStop = busStops[busStops.length - 1];
        if (!destinationStop || !destinationStop.distanceFromBus) return null;

        // Vitesse moyenne en ville: 30 km/h
        const averageSpeed = 30;
        const timeInHours = destinationStop.distanceFromBus / averageSpeed;
        const timeInMinutes = Math.round(timeInHours * 60);

        const arrivalTime = new Date(Date.now() + timeInMinutes * 60 * 1000);
        const hours = arrivalTime.getHours();
        const minutes = arrivalTime.getMinutes();
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        return {
            minutes: timeInMinutes,
            arrivalTime: formattedTime,
        };
    }, [trip, busPosition, busStops]);

    /**
     * Calcule le prix du voyage (exemple)
     * @returns Le prix formaté
     */
    const tripPrice = useMemo(() => {
        // TODO: Récupérer le prix réel depuis le trip ou booking
        return '2.90';
    }, [trip]);

    /**
     * Centre la carte sur le bus et le passager
     * @returns 
     */
    const centerMapOnBusAndPassenger = () => {
        if (!busPosition || !passengerLocation || !mapRef.current) return;

        mapRef.current.fitToCoordinates(
            [
                { latitude: busPosition.latitude, longitude: busPosition.longitude },
                { latitude: passengerLocation.latitude, longitude: passengerLocation.longitude },
            ],
            {
                edgePadding: { top: 100, right: 50, bottom: showStopsPanel ? 400 : 100, left: 50 },
                animated: true,
            }
        );
    };

    /**
     * Centre la carte sur le bus
     * @returns 
     */
    const centerOnBus = () => {
        if (busPosition && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: busPosition.latitude, longitude: busPosition.longitude },
                zoom: 15,
            });
        }
    };

    /**
     * Centre la carte sur le passager
     * @returns 
     */
    const centerOnMe = () => {
        if (passengerLocation && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: passengerLocation.latitude, longitude: passengerLocation.longitude },
                zoom: 15,
            });
        }
    };

    /**
     * Centre la carte sur un arrêt
     * @param stop - L'arrêt à centrer
     * @returns 
     */
    const centerOnStop = (stop: BusStop) => {
        if (mapRef.current) {
            setSelectedStop(stop);
            mapRef.current.animateCamera({
                center: { latitude: stop.latitude, longitude: stop.longitude },
                zoom: 16,
            });
        }
    };

    /**
     * Retourne la couleur d'un statut d'arrêt
     * @param status - Le statut d'arrêt
     * @returns La couleur du statut d'arrêt
     */
    const getStopStatusColor = (status: string): string => {
        switch (status) {
            case 'departed':
                return '#999999';
            case 'arrived':
                return '#4CAF50';
            case 'approaching':
                return '#FF9800';
            default:
                return '#2196F3';
        }
    };

    /**
     * Retourne l'icône d'un statut d'arrêt
     * @param status - Le statut d'arrêt
     * @returns L'icône du statut d'arrêt
     */
    const getStopStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
        switch (status) {
            case 'departed':
                return 'checkmark-circle';
            case 'arrived':
                return 'location';
            case 'approaching':
                return 'navigate-circle';
            default:
                return 'ellipse-outline';
        }
    };

    /**
     * Retourne le texte d'un statut d'arrêt
     * @param status - Le statut d'arrêt
     * @returns Le texte du statut d'arrêt
     */
    const getStopStatusText = (status: string): string => {
        switch (status) {
            case 'departed':
                return 'Passé';
            case 'arrived':
                return 'Arrivé';
            case 'approaching':
                return 'Proche';
            default:
                return 'En attente';
        }
    };

    /**
     * Retourne le composant de chargement
     * @returns Le composant de chargement
     */
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>Chargement du voyage...</Text>
            </View>
        );
    }

    /**
     * Retourne le composant d'erreur
     * @returns Le composant d'erreur
     */
    if (error) {
        return (
            <View style={[styles.errorContainer, { backgroundColor }]}>
                <Ionicons name="alert-circle" size={64} color="#F44336" />
                <Text style={[styles.errorTitle, { color: textColor }]}>Erreur</Text>
                <Text style={[styles.errorText, { color: secondaryTextColor }]}>{error}</Text>
                <TouchableOpacity style={[styles.retryButton, { backgroundColor: accentColor }]} onPress={() => window.location.reload()}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    /**
     * Retourne le composant de chargement
     * @returns Le composant de chargement
     */
    if (!passengerLocation) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>Obtention de votre position...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Carte OpenStreetMap */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT} // Utilise OSM par défaut
                style={styles.map}
                initialRegion={{
                    latitude: passengerLocation.latitude,
                    longitude: passengerLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                mapType={isDarkMode ? 'standard' : 'standard'}
            >
                {/* Itinéraire du trajet */}
                {(routePath.length > 0 || (trip?.routePath && trip.routePath.length > 0)) && (
                    <Polyline
                        coordinates={routePath.length > 0 ? routePath : trip?.routePath || []}
                        strokeColor={accentColor}
                        strokeWidth={4}
                    />
                )}

                {/* Position du bus avec animation */}
                {busPosition && (
                    <>
                        {/* Cercle de précision avec animation pulsante */}
                        <Circle
                            center={{
                                latitude: busPosition.latitude,
                                longitude: busPosition.longitude,
                            }}
                            radius={busPosition.accuracy || 50}
                            fillColor={accentColorLight}
                            strokeColor={accentColorMedium}
                            strokeWidth={1}
                        />
                        <Animated.View
                            style={{
                                position: 'absolute',
                                transform: [{ scale: pulseAnim }],
                            }}
                        >
                            <Circle
                                center={{
                                    latitude: busPosition.latitude,
                                    longitude: busPosition.longitude,
                                }}
                                radius={(busPosition.accuracy || 50) * 1.5}
                                fillColor={accentColorLight}
                                strokeColor={accentColorMedium}
                                strokeWidth={1}
                            />
                        </Animated.View>

                        {/* Marqueur du bus */}
                        <Marker
                            coordinate={{
                                latitude: busPosition.latitude,
                                longitude: busPosition.longitude,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            rotation={busPosition.heading}
                            title={`Bus ${trip?.busNumber}`}
                            description={`Vitesse: ${Math.round(busPosition.speed)} km/h`}
                        >
                            <Animated.View
                                style={[
                                    styles.busMarker,
                                    {
                                        backgroundColor: accentColor,
                                        transform: [{ scale: pulseAnim }],
                                    },
                                ]}
                            >
                                <Ionicons name="bus" size={28} color="#fff" />
                            </Animated.View>
                        </Marker>
                    </>
                )}

                {/* Arrêts sur l'itinéraire */}
                {stopsWithDistances.map((stop, index) => (
                    <Marker
                        key={stop.id}
                        coordinate={{
                            latitude: stop.latitude,
                            longitude: stop.longitude,
                        }}
                        onPress={() => centerOnStop(stop)}
                    >
                        <View
                            style={[
                                styles.stopMarker,
                                { backgroundColor: getStopStatusColor(stop.status) },
                                stop.id === nearestStop?.id && styles.nearestStopMarker,
                                selectedStop?.id === stop.id && styles.selectedStopMarker,
                            ]}
                        >
                            <Text style={styles.stopMarkerNumber}>{stop.order}</Text>
                        </View>
                    </Marker>
                ))}

                {/* Position du passager */}
                <Marker
                    coordinate={{
                        latitude: passengerLocation.latitude,
                        longitude: passengerLocation.longitude,
                    }}
                    title="Vous êtes ici"
                >
                    <View style={styles.userMarker}>
                        <View style={[styles.userMarkerInner, { backgroundColor: accentColor }]}>
                            <Ionicons name="locate" size={16} color="#fff" />
                        </View>
                    </View>
                </Marker>
            </MapView>

            {/* En-tête de navigation */}
            <View style={[styles.header, { backgroundColor: headerBackgroundColor, paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={[styles.headerButton]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={20} color={textColor} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>Itinéraire du trajet</Text>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: iconCircleBackgroundColor }]}
                    onPress={() => {
                        // TODO: Implémenter le partage
                        console.log('Partager');
                    }}
                >
                    <Ionicons name="share-outline" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Panneau d'informations principal */}
            {showStopsPanel && (
                <View style={[styles.infoPanel, { backgroundColor: panelBackgroundColor }]}>
                    
                    {/* Carte de résumé de destination */}
                    {trip && (
                        <View style={[styles.destinationCard, { backgroundColor: listItemBackgroundColor }]}>
                            <View style={styles.destinationCardContent}>
                                <View style={styles.destinationTextContainer}>
                                    <Text style={[styles.destinationAddress, { color: textColor, alignSelf: 'center' }]}>
                                        {JSON.parse(bookingDetails).trip.stationFrom.city} <Ionicons name="arrow-forward" size={14} color={textColor} /> {JSON.parse(bookingDetails).trip.stationTo.city}
                                    </Text>
                                    {/* {destinationETA && (
                                        <Text style={[styles.destinationETA, { color: secondaryTextColor }]}>
                                            {JSON.parse(bookingDetails).trip.duration} min • Arrive à {destinationETA.arrivalTime}
                                        </Text>
                                    )} */}
                                </View>
                                {/* <View style={[styles.priceBadge, { backgroundColor: priceBackgroundColor }]}>
                                    <Ionicons name="cash-outline" size={14} color="#fff" />
                                    <Text style={styles.priceBadgeText}>{JSON.parse(bookingDetails).totalAmount}</Text>
                                </View> */}
                            </View>
                        </View>
                    )}

                    {/* Liste des étapes de l'itinéraire */}
                    <ScrollView
                        style={styles.stepsList}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Étape 1: Localisation actuelle */}
                        {passengerLocation && (
                            <View style={[styles.stepItem, { backgroundColor: listItemBackgroundColor }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: iconCircleBackgroundColor }]}>
                                    <Ionicons name="locate" size={20} color={accentColor} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: textColor }]}>
                                        Localisation actuelle
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: secondaryTextColor }]}>
                                        {passengerLocation.latitude.toFixed(4)}, {passengerLocation.longitude.toFixed(4)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Étape 2: Détails du bus */}
                        {trip && (
                            <View style={[styles.stepItem, { backgroundColor: listItemBackgroundColor }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: iconCircleBackgroundColor }]}>
                                    <Ionicons name="bus" size={20} color={secondaryTextColor} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: textColor }]}>
                                        Immatriculation du bus : {JSON.parse(bookingDetails).bus.licencePlate}
                                    </Text>
                                    {/* <Text style={[styles.stepSubtitle, { color: secondaryTextColor }]}>
                                        {busStops.filter(s => s.status === 'pending' || s.status === 'approaching').length} stops | {destinationETA?.minutes || 0} min • {JSON.parse(bookingDetails).totalAmount}
                                    </Text> */}
                                </View>
                                {/* {nearestStop && busPosition && nearestStop.distanceFromBus && (
                                    <View style={[styles.etaBadge, { backgroundColor: accentColor }]}>
                                        <Ionicons name="time" size={12} color="#fff" />
                                        <Text style={styles.etaBadgeText}>{calculateETA(nearestStop)}</Text>
                                    </View>
                                )} */}
                            </View>
                        )}

                        {/* Étape 3: Segment de marche (si nécessaire) */}
                        {/* {nearestStop && nearestStop.distanceFromUser && nearestStop.distanceFromUser > 0.1 && (
                            <View style={[styles.stepItem, { backgroundColor: listItemBackgroundColor }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: iconCircleBackgroundColor }]}>
                                    <Ionicons name="walk" size={20} color={secondaryTextColor} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: textColor }]} numberOfLines={1}>
                                        {nearestStop.name}
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: secondaryTextColor }]}>
                                        Marche - {nearestStop.distanceFromUser.toFixed(1)} km | {Math.round(nearestStop.distanceFromUser * 12)} min
                                    </Text>
                                </View>
                            </View>
                        )} */}

                        {/* Étape 4: Destination */}
                        {/* {trip && (
                            <View style={[styles.stepItem, { backgroundColor: listItemBackgroundColor }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: iconCircleBackgroundColor }]}>
                                    <Ionicons name="location" size={20} color={secondaryTextColor} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: textColor }]}>
                                        {JSON.parse(bookingDetails).trip.stationTo.city}
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: secondaryTextColor }]}>
                                        Votre destination
                                    </Text>
                                </View>
                            </View>
                        )} */}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // En-tête de navigation
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Marqueurs
    busMarker: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    stopMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    nearestStopMarker: {
        borderColor: '#4CAF50',
        borderWidth: 3,
        transform: [{ scale: 1.15 }],
    },
    selectedStopMarker: {
        borderColor: '#FF9800',
        borderWidth: 3,
    },
    stopMarkerNumber: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    userMarker: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(106, 90, 205, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarkerInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    // Panneau d'informations principal
    infoPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 20,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        maxHeight: '45%',
        minHeight: 200,
    },
    // Carte de résumé de destination
    destinationCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 16,
    },
    destinationCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    destinationTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    destinationAddress: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    destinationETA: {
        fontSize: 14,
    },
    priceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    priceBadgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    // Liste des étapes
    stepsList: {
        paddingHorizontal: 20,
        maxHeight: 300,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    stepIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 12,
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    etaBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});