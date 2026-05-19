// @ts-nocheck
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBusTracking } from '@/hooks/useBusTracking';
import { routingService } from '@/services/routingService';
import { BusStop, PassengerLocation } from '@/types/tracking';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OSMBusTrackerProps {
    tripId: string;
    bookingDetails: string | object;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_MIN_HEIGHT = 80;
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.45;

// Configuration des animations
const ANIMATION_CONFIG = {
    PULSE_DURATION: 1000,
    PANEL_SPRING: {
        tension: 50,
        friction: 8,
    },
    MAP_ANIMATION_DURATION: 300,
};

// Configuration de la localisation
const LOCATION_CONFIG = {
    UPDATE_INTERVAL: 10000, // 10 secondes
    DISTANCE_INTERVAL: 50, // 50 mètres
    ACCURACY: Location.Accuracy.Balanced,
};

// Coordonnées par défaut (Abidjan)
const DEFAULT_LOCATION = {
    latitude: 5.33542,
    longitude: -4.00351,
    accuracy: 50,
};

export default function OSMBusTracker({ tripId, bookingDetails }: OSMBusTrackerProps) {
    /** Parse le booking (JSON ou objet) pour en extraire tripId / bookingId réels du Socket.IO. */
    const parsedBooking = useMemo(() => {
        try {
            if (bookingDetails == null) return null;
            if (typeof bookingDetails === 'string') return JSON.parse(bookingDetails);
            return bookingDetails;
        } catch (error) {
            console.error('Erreur parsing bookingDetails:', error);
            return null;
        }
    }, [bookingDetails]);

    const trackingTripId = useMemo(() => {
        const b = parsedBooking as Record<string, unknown> | null;
        const trip = b?.trip as Record<string, unknown> | undefined;
        const fromBooking = trip?.id ?? trip?._id ?? b?.tripId;
        return String(fromBooking || tripId || '').trim();
    }, [parsedBooking, tripId]);

    const trackingBookingId = useMemo(() => {
        const b = parsedBooking as Record<string, unknown> | null;
        return String(b?.id ?? '').trim();
    }, [parsedBooking]);

    const trackingBusId = useMemo(() => {
        const b = parsedBooking as Record<string, unknown> | null;
        const id = (b?.bus as Record<string, unknown> | undefined)?.id;
        const s = id != null ? String(id).trim() : '';
        return s !== '' ? s : undefined;
    }, [parsedBooking]);

    const { busPosition, busStops, trip, isConnected, isLoading, error } = useBusTracking(
        trackingTripId,
        trackingBookingId,
        trackingBusId,
    );
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    // États du composant
    const [passengerLocation, setPassengerLocation] = useState<PassengerLocation | null>(null);
    const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
    const [nearestStop, setNearestStop] = useState<BusStop | null>(null);
    const [stopsWithDistances, setStopsWithDistances] = useState<BusStop[]>([]);
    const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [followBus, setFollowBus] = useState(true); // Auto-suivi du bus

    // Refs
    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const panelHeight = useRef(new Animated.Value(PANEL_MAX_HEIGHT)).current;
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const lastBusPosition = useRef<{ latitude: number; longitude: number } | null>(null);

    // Couleurs du thème (mémorisées)
    const themeColors = useMemo(() => ({
        background: useThemeColor({}, 'background'),
        text: useThemeColor({}, 'text'),
        secondaryText: useThemeColor({}, 'secondaryText'),
        card: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        border: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        header: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        panel: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        listItem: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8',
        iconCircle: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8',
        accent: '#6A5ACD',
        accentLight: 'rgba(106, 90, 205, 0.1)',
        accentMedium: 'rgba(106, 90, 205, 0.3)',
    }), [colorScheme]);

    /**
     * =================================================================
     * ANIMATIONS
     * =================================================================
     */

    // Animation de pulsation pour le marqueur du bus
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: ANIMATION_CONFIG.PULSE_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: ANIMATION_CONFIG.PULSE_DURATION,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        return () => pulse.stop();
    }, [pulseAnim]);

    /**
     * Toggle le panneau avec animation
     */
    const togglePanel = useCallback(() => {
        const toValue = isPanelExpanded ? PANEL_MIN_HEIGHT : PANEL_MAX_HEIGHT;
        
        Animated.spring(panelHeight, {
            toValue,
            useNativeDriver: false,
            ...ANIMATION_CONFIG.PANEL_SPRING,
        }).start();
        
        setIsPanelExpanded(!isPanelExpanded);

        // Réajuster la carte après l'animation
        setTimeout(() => {
            if (followBus && busPosition && passengerLocation) {
                centerMapOnBusAndPassenger();
            }
        }, 300);
    }, [isPanelExpanded, panelHeight, followBus, busPosition, passengerLocation]);

    /**
     * PanResponder pour gérer le swipe du panneau
     */
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                const newHeight = isPanelExpanded
                    ? PANEL_MAX_HEIGHT - gestureState.dy
                    : PANEL_MIN_HEIGHT - gestureState.dy;

                const clampedHeight = Math.max(
                    PANEL_MIN_HEIGHT,
                    Math.min(PANEL_MAX_HEIGHT, newHeight)
                );

                panelHeight.setValue(clampedHeight);
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExpand =
                    gestureState.dy < -50 ||
                    (gestureState.dy < 0 && !isPanelExpanded);

                const toValue = shouldExpand ? PANEL_MAX_HEIGHT : PANEL_MIN_HEIGHT;

                Animated.spring(panelHeight, {
                    toValue,
                    useNativeDriver: false,
                    ...ANIMATION_CONFIG.PANEL_SPRING,
                }).start();

                setIsPanelExpanded(shouldExpand);
            },
        })
    ).current;

    /**
     * =================================================================
     * LOCALISATION
     * =================================================================
     */

    /**
     * Initialise la localisation du passager
     */
    const initPassengerLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès à la localisation est nécessaire pour afficher votre position"
                );
                setPassengerLocation({
                    ...DEFAULT_LOCATION,
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            // Position initiale
            const location = await Location.getCurrentPositionAsync({
                accuracy: LOCATION_CONFIG.ACCURACY,
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
                    accuracy: LOCATION_CONFIG.ACCURACY,
                    timeInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
                    distanceInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
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
            setPassengerLocation({
                ...DEFAULT_LOCATION,
                timestamp: new Date().toISOString(),
            });
        }
    }, []);

    // Initialiser la localisation au montage
    useEffect(() => {
        initPassengerLocation();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, [initPassengerLocation]);

    /**
     * =================================================================
     * CALCULS DE DISTANCES ET ITINÉRAIRE
     * =================================================================
     */

    /**
     * Calcule l'itinéraire optimisé
     */
    const calculateRoute = useCallback(async () => {
        if (!parsedBooking?.trip?.stationFrom || !parsedBooking?.trip?.stationTo) {
            console.warn('Informations de trajet manquantes');
            return;
        }

        try {
            // Utiliser les coordonnées réelles depuis le booking si disponibles
            const startPoint = {
                latitude: parsedBooking.trip.stationFrom.latitude || 5.33542,
                longitude: parsedBooking.trip.stationFrom.longitude || -4.00351,
            };

            const endPoint = {
                latitude: parsedBooking.trip.stationTo.latitude || 5.317666,
                longitude: parsedBooking.trip.stationTo.longitude || -4.089991,
            };

            const route = await routingService.getRoute(startPoint, endPoint);
            setRoutePath(route);
        } catch (error) {
            console.error('Erreur calcul itinéraire:', error);
            // Fallback: ligne droite
            setRoutePath([
                { latitude: 5.33542, longitude: -4.00351 },
                { latitude: 5.317666, longitude: -4.089991 },
            ]);
        }
    }, [parsedBooking]);

    useEffect(() => {
        calculateRoute();
    }, [calculateRoute]);

    /**
     * Calcule les distances optimisé avec mémoization
     */
    const calculateStopDistances = useCallback(() => {
        if (!passengerLocation || busStops.length === 0) return;

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

        // Trouver l'arrêt le plus proche disponible
        const availableStops = stopsWithDist.filter(
            (stop) => stop.status === 'pending' || stop.status === 'approaching'
        );

        if (availableStops.length > 0) {
            setNearestStop(availableStops[0]);
        }
    }, [passengerLocation, busStops, busPosition]);

    useEffect(() => {
        calculateStopDistances();
    }, [calculateStopDistances]);

    /**
     * Calcule l'ETA pour un arrêt (mémorisé)
     */
    const calculateETA = useCallback(
        (stop: BusStop): string => {
            if (!busPosition || !stop.distanceFromBus) return 'N/A';

            const averageSpeed = 30; // km/h
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
     * =================================================================
     * GESTION DE LA CARTE
     * =================================================================
     */

    /**
     * Callback quand la carte est prête
     */
    const handleMapReady = useCallback(() => {
        setIsMapReady(true);
        // Centrer initialement sur le bus et le passager
        if (busPosition && passengerLocation) {
            setTimeout(() => centerMapOnBusAndPassenger(), 500);
        }
    }, [busPosition, passengerLocation]);

    /**
     * Centre la carte sur le bus et le passager (optimisé)
     */
    const centerMapOnBusAndPassenger = useCallback(() => {
        if (!isMapReady || !busPosition || !passengerLocation || !mapRef.current) return;

        const bottomPadding = isPanelExpanded ? PANEL_MAX_HEIGHT + 50 : PANEL_MIN_HEIGHT + 50;

        const coordinates = [
            { latitude: busPosition.latitude, longitude: busPosition.longitude },
            { latitude: passengerLocation.latitude, longitude: passengerLocation.longitude },
        ];

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { 
                top: 150, 
                right: 50, 
                bottom: bottomPadding, 
                left: 50 
            },
            animated: true,
        });
    }, [isMapReady, busPosition, passengerLocation, isPanelExpanded]);

    /**
     * Auto-suivi du bus quand sa position change
     */
    useEffect(() => {
        if (!followBus || !isMapReady || !busPosition || !mapRef.current) return;

        // Vérifier si le bus a bougé significativement
        const hasMovedSignificantly = !lastBusPosition.current ||
            routingService.calculateDistance(
                lastBusPosition.current,
                { latitude: busPosition.latitude, longitude: busPosition.longitude }
            ) > 0.05; // 50 mètres

        if (hasMovedSignificantly) {
            lastBusPosition.current = {
                latitude: busPosition.latitude,
                longitude: busPosition.longitude,
            };

            if (passengerLocation) {
                centerMapOnBusAndPassenger();
            } else {
                // Centrer uniquement sur le bus si pas de position passager
                mapRef.current.animateCamera({
                    center: {
                        latitude: busPosition.latitude,
                        longitude: busPosition.longitude,
                    },
                    zoom: 15,
                });
            }
        }
    }, [busPosition, followBus, isMapReady, passengerLocation, centerMapOnBusAndPassenger]);

    /**
     * Centre la carte sur le bus
     */
    const centerOnBus = useCallback(() => {
        if (!isMapReady || !busPosition || !mapRef.current) return;

        setFollowBus(true);
        mapRef.current.animateCamera({
            center: {
                latitude: busPosition.latitude,
                longitude: busPosition.longitude,
            },
            zoom: 15,
        });
    }, [isMapReady, busPosition]);

    /**
     * Centre la carte sur le passager
     */
    const centerOnMe = useCallback(() => {
        if (!isMapReady || !passengerLocation || !mapRef.current) return;

        setFollowBus(false);
        mapRef.current.animateCamera({
            center: {
                latitude: passengerLocation.latitude,
                longitude: passengerLocation.longitude,
            },
            zoom: 15,
        });
    }, [isMapReady, passengerLocation]);

    /**
     * Centre la carte sur un arrêt
     */
    const centerOnStop = useCallback((stop: BusStop) => {
        if (!isMapReady || !mapRef.current) return;

        setFollowBus(false);
        setSelectedStop(stop);
        mapRef.current.animateCamera({
            center: {
                latitude: stop.latitude,
                longitude: stop.longitude,
            },
            zoom: 16,
        });
    }, [isMapReady]);

    /**
     * Désactive le suivi automatique quand l'utilisateur bouge la carte
     */
    const handleRegionChangeComplete = useCallback(() => {
        // Désactiver le suivi si l'utilisateur a manuellement bougé la carte
        // Cette fonctionnalité peut être améliorée en détectant les gestes utilisateur
    }, []);

    /**
     * =================================================================
     * HELPERS POUR LES MARQUEURS
     * =================================================================
     */

    /**
     * Retourne la couleur d'un statut d'arrêt
     */
    const getStopStatusColor = useCallback((status: string): string => {
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
    }, []);

    /**
     * Retourne l'icône d'un statut d'arrêt
     */
    const getStopStatusIcon = useCallback((status: string): keyof typeof Ionicons.glyphMap => {
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
    }, []);

    /**
     * =================================================================
     * RENDUS CONDITIONNELS
     * =================================================================
     */

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text style={[styles.loadingText, { color: themeColors.secondaryText }]}>
                    Chargement du voyage...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
                <Ionicons name="alert-circle" size={64} color="#F44336" />
                <Text style={[styles.errorTitle, { color: themeColors.text }]}>Erreur</Text>
                <Text style={[styles.errorText, { color: themeColors.secondaryText }]}>{error}</Text>
                <TouchableOpacity 
                    style={[styles.retryButton, { backgroundColor: themeColors.accent }]} 
                    onPress={() => router.back()}
                >
                    <Text style={styles.retryButtonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!passengerLocation) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text style={[styles.loadingText, { color: themeColors.secondaryText }]}>
                    Obtention de votre position...
                </Text>
            </View>
        );
    }

    /**
     * =================================================================
     * RENDU PRINCIPAL
     * =================================================================
     */

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Carte OpenStreetMap */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: passengerLocation.latitude,
                    longitude: passengerLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                onMapReady={handleMapReady}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                loadingEnabled={true}
                loadingIndicatorColor={themeColors.accent}
                loadingBackgroundColor={themeColors.background}
                mapType={Platform.OS === 'ios' ? 'standard' : 'standard'}
                pitchEnabled={true}
                rotateEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
            >
                {/* Itinéraire du trajet */}
                {routePath.length > 0 && (
                    <Polyline
                        coordinates={routePath}
                        strokeColor={themeColors.accent}
                        strokeWidth={4}
                        lineCap="round"
                        lineJoin="round"
                    />
                )}

                {/* Position du bus avec animation */}
                {busPosition && (
                    <>
                        {/* Cercle de précision */}
                        <Circle
                            center={{
                                latitude: busPosition.latitude,
                                longitude: busPosition.longitude,
                            }}
                            radius={busPosition.accuracy || 50}
                            fillColor={themeColors.accentLight}
                            strokeColor={themeColors.accentMedium}
                            strokeWidth={1}
                        />

                        {/* Marqueur du bus */}
                        <Marker
                            coordinate={{
                                latitude: busPosition.latitude,
                                longitude: busPosition.longitude,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            rotation={busPosition.heading || 0}
                            title={`Bus ${parsedBooking?.bus?.licencePlate || ''}`}
                            description={`Vitesse: ${Math.round(busPosition.speed || 0)} km/h`}
                            tracksViewChanges={false} // Optimisation performance
                        >
                            <Animated.View
                                style={[
                                    styles.busMarker,
                                    {
                                        backgroundColor: themeColors.accent,
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
                {stopsWithDistances.map((stop) => (
                    <Marker
                        key={stop.id}
                        coordinate={{
                            latitude: stop.latitude,
                            longitude: stop.longitude,
                        }}
                        onPress={() => centerOnStop(stop)}
                        tracksViewChanges={false} // Optimisation performance
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
                    tracksViewChanges={false} // Optimisation performance
                >
                    <View style={styles.userMarker}>
                        <View style={[styles.userMarkerInner, { backgroundColor: themeColors.accent }]}>
                            <Ionicons name="locate" size={16} color="#fff" />
                        </View>
                    </View>
                </Marker>
            </MapView>

            {/* En-tête de navigation */}
            <View style={[styles.header, { backgroundColor: themeColors.header, paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Suivi en direct</Text>
                <View style={styles.headerRight}>
                    {/* Indicateur de connexion */}
                    <View style={[
                        styles.connectionIndicator,
                        { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
                    ]} />
                </View>
            </View>

            {/* Panneau d'informations avec animation */}
            <Animated.View
                style={[
                    styles.infoPanel,
                    {
                        backgroundColor: themeColors.panel,
                        height: panelHeight,
                    },
                ]}
            >
                {/* Handle pour swiper */}
                <View {...panResponder.panHandlers} style={styles.panelHandle}>
                    <View style={[styles.handleBar, { backgroundColor: themeColors.border }]} />
                </View>

                {/* Carte de résumé de destination */}
                {parsedBooking && (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={togglePanel}
                        style={[styles.destinationCard, { backgroundColor: themeColors.listItem }]}
                    >
                        <View style={styles.destinationCardContent}>
                            <View style={styles.destinationTextContainer}>
                                <Text style={[styles.destinationAddress, { color: themeColors.text }]}>
                                    {parsedBooking.trip.stationFrom.city}{' '}
                                    <Ionicons name="arrow-forward" size={14} color={themeColors.text} />{' '}
                                    {parsedBooking.trip.stationTo.city}
                                </Text>
                                <Text style={[styles.destinationSubtitle, { color: themeColors.secondaryText }]}>
                                    {busStops.length} arrêt{busStops.length > 1 ? 's' : ''}
                                </Text>
                            </View>
                            <Ionicons
                                name={isPanelExpanded ? 'chevron-down' : 'chevron-up'}
                                size={24}
                                color={themeColors.secondaryText}
                            />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Liste des étapes */}
                {isPanelExpanded && (
                    <ScrollView
                        style={styles.stepsList}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.stepsListContent}
                    >
                        {/* Localisation actuelle */}
                        {passengerLocation && (
                            <View style={[styles.stepItem, { backgroundColor: themeColors.listItem }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: themeColors.iconCircle }]}>
                                    <Ionicons name="locate" size={20} color={themeColors.accent} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                                        Votre position
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: themeColors.secondaryText }]}>
                                        Précision: {passengerLocation.accuracy?.toFixed(0) || 50}m
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Détails du bus */}
                        {parsedBooking && busPosition && (
                            <View style={[styles.stepItem, { backgroundColor: themeColors.listItem }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: themeColors.iconCircle }]}>
                                    <Ionicons name="bus" size={20} color={themeColors.accent} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                                        Bus {parsedBooking.bus.licencePlate}
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: themeColors.secondaryText }]}>
                                        Vitesse: {Math.round(busPosition.speed || 0)} km/h
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Arrêt le plus proche */}
                        {nearestStop && (
                            <View style={[styles.stepItem, { backgroundColor: themeColors.listItem }]}>
                                <View style={[styles.stepIconCircle, { backgroundColor: themeColors.iconCircle }]}>
                                    <Ionicons 
                                        name={getStopStatusIcon(nearestStop.status)} 
                                        size={20} 
                                        color={getStopStatusColor(nearestStop.status)} 
                                    />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                                        Prochain arrêt: {nearestStop.name}
                                    </Text>
                                    <Text style={[styles.stepSubtitle, { color: themeColors.secondaryText }]}>
                                        Distance: {nearestStop.distanceFromUser?.toFixed(1) || 'N/A'} km • ETA: {calculateETA(nearestStop)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                )}
            </Animated.View>

            {/* Boutons flottants */}
            <Animated.View 
                style={[
                    styles.floatingButtons, 
                    { 
                        bottom: panelHeight.interpolate({
                            inputRange: [PANEL_MIN_HEIGHT, PANEL_MAX_HEIGHT],
                            outputRange: [PANEL_MIN_HEIGHT + 20, PANEL_MAX_HEIGHT + 20],
                        })
                    }
                ]}
            >
                <TouchableOpacity
                    style={[styles.floatingButton, { backgroundColor: themeColors.panel }]}
                    onPress={centerOnBus}
                    activeOpacity={0.7}
                >
                    <Ionicons name="bus" size={24} color={followBus ? themeColors.accent : themeColors.secondaryText} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.floatingButton, { backgroundColor: themeColors.panel }]}
                    onPress={centerOnMe}
                    activeOpacity={0.7}
                >
                    <Ionicons name="locate" size={24} color={themeColors.accent} />
                </TouchableOpacity>
            </Animated.View>
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
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectionIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
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
        fontFamily: 'Ubuntu_Bold',
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
    infoPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    panelHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    destinationCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
    },
    destinationCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    destinationTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    destinationAddress: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    destinationSubtitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    stepsList: {
        paddingHorizontal: 20,
        flex: 1,
    },
    stepsListContent: {
        paddingBottom: 20,
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
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    floatingButtons: {
        position: 'absolute',
        right: 20,
        gap: 12,
    },
    floatingButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});