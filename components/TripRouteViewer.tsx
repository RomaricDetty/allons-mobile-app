// components/TripRouteViewer.tsx

import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Booking } from '@/interfaces';
import { geocodingService } from '@/services/geocodingService';
import { routingService } from '@/services/routingService';
import { PassengerLocation } from '@/types/tracking';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import des images
const busImage = require('@/assets/images/bus.png');
const flagStartImage = require('@/assets/images/flag-start.png');
const flagEndImage = require('@/assets/images/flag-end.png');
const userLocationPinImage = require('@/assets/images/user-location-pin.png');

// Constantes de couleurs
const COLORS = {
    ACCENT: '#1776BA',
    ACCENT_LIGHT: 'rgba(106, 90, 205, 0.1)',
    START_MARKER: '#4CAF50',
    END_MARKER: '#F44336',
    ERROR: '#F44336',
    WHITE: '#fff',
    DARK_CARD: '#1C1C1E',
    DARK_BORDER: '#3A3A3C',
    DARK_LIST_ITEM: '#2C2C2E',
    LIGHT_CARD: '#FFFFFF',
    LIGHT_BORDER: '#E0E0E0',
    LIGHT_LIST_ITEM: '#F8F8F8',
    DARK_BADGE: '#2C2C2E',
    LIGHT_BADGE: '#F0F4F8',
} as const;

// Constantes pour les anchors des markers (mémorisées pour éviter les recréations)
const MARKER_ANCHOR_BOTTOM = { x: 0.5, y: 1 };
const MARKER_ANCHOR_CENTER = { x: 0.5, y: 0.5 };

interface TripRouteViewerProps {
    booking: Booking;
}

/**
 * Composant pour afficher l'itinéraire d'un trajet sur une carte
 * Affiche la carte, la géolocalisation de l'utilisateur et l'itinéraire du trajet
 */
export default function TripRouteViewer({ booking }: TripRouteViewerProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    const [passengerLocation, setPassengerLocation] = useState<PassengerLocation | null>(null);
    const [currentAddress, setCurrentAddress] = useState<string>('Position actuelle');
    const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[]>([]);
    const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [endPoint, setEndPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isManualMode, setIsManualMode] = useState<boolean>(false);
    const [routeDuration, setRouteDuration] = useState<number | null>(null); // Durée en minutes calculée à partir du tracé
    const [busPosition, setBusPosition] = useState<{ latitude: number; longitude: number } | null>(null);
    const [busRotation, setBusRotation] = useState<number>(0); // Angle de rotation du bus en degrés
    const [isBusAnimationActive, setIsBusAnimationActive] = useState<boolean>(false);
    const [isFollowingBus, setIsFollowingBus] = useState<boolean>(false); // Suivre automatiquement le bus avec la caméra
    const [animationProgress, setAnimationProgress] = useState<number>(0); // Progression de l'animation (0 à 1)
    const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false); // État du panneau (réduit ou étendu)
    
    const panelHeightAnim = useRef(new Animated.Value(1)).current; // Animation pour la hauteur du panneau

    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const isManualModeRef = useRef<boolean>(false);
    const busAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const routeDistancesRef = useRef<number[]>([]); // Distances cumulées le long de l'itinéraire
    const lastCameraUpdateRef = useRef<number>(0);
    const addressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Debounce pour les mises à jour d'adresse
    const bookingIdRef = useRef<string | number | null>(null); // Pour éviter les recalculs inutiles
    const isFollowingBusRef = useRef<boolean>(false); // Ref pour éviter les dépendances dans l'animation

    // Couleurs du thème mémorisées
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    
    const themeColors = useMemo(() => ({
        cardBackground: colorScheme === 'dark' ? COLORS.DARK_CARD : COLORS.LIGHT_CARD,
        border: colorScheme === 'dark' ? COLORS.DARK_BORDER : COLORS.LIGHT_BORDER,
        panelBackground: colorScheme === 'dark' ? COLORS.DARK_CARD : COLORS.LIGHT_CARD,
        listItemBackground: colorScheme === 'dark' ? COLORS.DARK_LIST_ITEM : COLORS.LIGHT_LIST_ITEM,
        iconCircleBackground: colorScheme === 'dark' ? COLORS.DARK_LIST_ITEM : COLORS.LIGHT_LIST_ITEM,
        badgeBackground: colorScheme === 'dark' ? COLORS.DARK_BADGE : COLORS.LIGHT_BADGE,
    }), [colorScheme]);

    /**
     * Obtient l'adresse à partir des coordonnées GPS
     * @param latitude Latitude de la position
     * @param longitude Longitude de la position
     */
    const getAddressFromCoordinates = useCallback(async (latitude: number, longitude: number) => {
        try {
            const addresses = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (addresses && addresses.length > 0) {
                const address = addresses[0];
                // Construire l'adresse complète de manière lisible
                const addressParts: string[] = [];

                // Nom de la rue et numéro
                if (address.streetNumber && address.street) {
                    addressParts.push(`${address.streetNumber} ${address.street}`);
                } else if (address.street) {
                    addressParts.push(address.street);
                }

                // Quartier/District
                if (address.district) {
                    addressParts.push(address.district);
                }

                // Ville
                if (address.city) {
                    addressParts.push(address.city);
                }

                // Région/État
                if (address.region) {
                    addressParts.push(address.region);
                }

                // Code postal
                if (address.postalCode) {
                    addressParts.push(address.postalCode);
                }

                const fullAddress = addressParts.length > 0
                    ? addressParts.join(', ')
                    : 'Position actuelle';

                return fullAddress;
            }
            return 'Position actuelle';
        } catch (error) {
            return 'Position actuelle';
        }
    }, []);

    /**
     * Arrête le suivi de la géolocalisation
     */
    const stopLocationTracking = useCallback(() => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
    }, []);

    /**
     * Valide si une coordonnée est valide
     * @param coord Coordonnée à valider
     * @returns true si la coordonnée est valide, false sinon
     */
    const isValidCoordinate = useCallback((coord: { latitude: number; longitude: number } | null | undefined): boolean => {
        return (
            coord !== null &&
            coord !== undefined &&
            typeof coord.latitude === 'number' &&
            typeof coord.longitude === 'number' &&
            !isNaN(coord.latitude) &&
            !isNaN(coord.longitude) &&
            coord.latitude >= -90 &&
            coord.latitude <= 90 &&
            coord.longitude >= -180 &&
            coord.longitude <= 180
        );
    }, []);

    /**
     * Calcule l'itinéraire à partir des données du booking
     * Récupère les coordonnées directement depuis l'objet booking
     * Utilise les coordonnées par défaut basées sur le nom de la ville si les coordonnées du booking ne sont pas valides
     * Calcule également la durée du trajet selon le tracé réel
     */
    const calculateRouteFromBooking = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Récupérer les coordonnées directement depuis l'objet booking
            let startCoords = booking.trip?.stationFrom?.coordinate;
            let endCoords = booking.trip?.stationTo?.coordinate;

            // Si les coordonnées de départ ne sont pas valides, utiliser les coordonnées par défaut basées sur le nom de la ville
            if (!isValidCoordinate(startCoords) && booking.trip?.stationFrom?.city) {
                const defaultStartCoords = geocodingService.getCityCoordinates(booking.trip.stationFrom.city);
                if (defaultStartCoords) {
                    startCoords = defaultStartCoords;
                }
            }

            // Si les coordonnées d'arrivée ne sont pas valides, utiliser les coordonnées par défaut basées sur le nom de la ville
            if (!isValidCoordinate(endCoords) && booking.trip?.stationTo?.city) {
                const defaultEndCoords = geocodingService.getCityCoordinates(booking.trip.stationTo.city);
                if (defaultEndCoords) {
                    endCoords = defaultEndCoords;
                }
            }

            // Vérifier que nous avons des coordonnées valides après les fallbacks
            if (!isValidCoordinate(startCoords) || !isValidCoordinate(endCoords)) {
                throw new Error('Impossible de trouver des coordonnées valides pour les villes');
            }

            setStartPoint(startCoords);
            setEndPoint(endCoords);

            // Calculer l'itinéraire avec les détails (tracé, distance, durée)
            const routeDetails = await routingService.getRouteWithDetails(startCoords, endCoords);
            setRoutePath(routeDetails.coordinates);
            setRouteDuration(routeDetails.duration);
        } catch (error) {
            setError('Impossible de calculer l\'itinéraire');
            // En cas d'erreur, utiliser un itinéraire simplifié
            const currentStartPoint = startPoint;
            const currentEndPoint = endPoint;
            if (currentStartPoint && currentEndPoint) {
                setRoutePath([currentStartPoint, currentEndPoint]);
                setRouteDuration(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [booking.trip?.stationFrom?.coordinate, booking.trip?.stationFrom?.city, booking.trip?.stationTo?.coordinate, booking.trip?.stationTo?.city, isValidCoordinate]);

    /**
     * Initialise la localisation du passager
     */
    const initPassengerLocation = useCallback(async () => {
        try {
            // Arrêter le suivi précédent si actif
            stopLocationTracking();

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès à la localisation est nécessaire pour afficher votre position"
                );
                // Utiliser les coordonnées par défaut si permission refusée
                const defaultLocation = {
                    latitude: 5.33542,
                    longitude: -4.00351,
                    accuracy: 50,
                    timestamp: new Date().toISOString(),
                };
                setPassengerLocation(defaultLocation);

                // Essayer d'obtenir l'adresse même avec les coordonnées par défaut
                const address = await getAddressFromCoordinates(
                    defaultLocation.latitude,
                    defaultLocation.longitude
                );
                setCurrentAddress(address);
                return;
            }

            // Position initiale
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const locationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                timestamp: new Date().toISOString(),
            };

            setPassengerLocation(locationData);

            // Obtenir l'adresse de la position initiale
            const address = await getAddressFromCoordinates(
                location.coords.latitude,
                location.coords.longitude
            );
            setCurrentAddress(address);

            // Suivre les changements de position
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 50,
                },
                async (location) => {
                    // Ne mettre à jour que si on n'est pas en mode manuel
                    if (!isManualModeRef.current) {
                        const locationData = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy || undefined,
                            timestamp: new Date().toISOString(),
                        };
                        setPassengerLocation(locationData);

                        // Debounce pour les mises à jour d'adresse (évite trop d'appels API)
                        if (addressUpdateTimeoutRef.current) {
                            clearTimeout(addressUpdateTimeoutRef.current);
                        }
                        addressUpdateTimeoutRef.current = setTimeout(async () => {
                            const address = await getAddressFromCoordinates(
                                location.coords.latitude,
                                location.coords.longitude
                            );
                            setCurrentAddress(address);
                        }, 2000); // Attendre 2 secondes avant de mettre à jour l'adresse
                    }
                }
            );
        } catch (error) {
            const defaultLocation = {
                latitude: 5.33542,
                longitude: -4.00351,
                accuracy: 50,
                timestamp: new Date().toISOString(),
            };
            setPassengerLocation(defaultLocation);

            // Essayer d'obtenir l'adresse même en cas d'erreur
            const address = await getAddressFromCoordinates(
                defaultLocation.latitude,
                defaultLocation.longitude
            );
            setCurrentAddress(address);
        }
    }, [getAddressFromCoordinates, stopLocationTracking]);

    /**
     * Centre la carte sur l'itinéraire
     * Priorise le point de départ si disponible
     * Ajuste le padding pour que le point de départ soit visible au-dessus du panneau d'informations
     */
    const centerMapOnRoute = useCallback(() => {
        if (!mapRef.current) return;

        // Si on a un point de départ, centrer d'abord dessus
        if (startPoint) {
            const coordinates = [startPoint];
            if (endPoint) {
                coordinates.push(endPoint);
            }
            if (passengerLocation) {
                coordinates.push({
                    latitude: passengerLocation.latitude,
                    longitude: passengerLocation.longitude,
                });
            }

            // Padding augmenté en bas pour tenir compte du panneau d'informations (max 45% de l'écran)
            // Utiliser un padding bottom plus important pour que le point de départ soit visible
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                animated: true,
            });
        } else if (endPoint) {
            // Sinon, centrer sur le point d'arrivée
            mapRef.current.animateCamera({
                center: { latitude: endPoint.latitude, longitude: endPoint.longitude },
                zoom: 15,
            });
        }
    }, [startPoint, endPoint, passengerLocation]);

    /**
     * Initialise la localisation du passager et calcule l'itinéraire
     * Ne s'exécute qu'une seule fois au montage ou si le booking change
     */
    useEffect(() => {
        // Éviter les recalculs inutiles si le booking n'a pas changé
        const currentBookingId = booking.id || booking.code || `${booking.trip?.stationFrom?.city}-${booking.trip?.stationTo?.city}`;
        if (bookingIdRef.current === currentBookingId && startPoint && endPoint) {
            return;
        }
        bookingIdRef.current = currentBookingId;

        initPassengerLocation();
        calculateRouteFromBooking();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
            if (addressUpdateTimeoutRef.current) {
                clearTimeout(addressUpdateTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id, booking.code]);

    /**
     * Centre la carte sur l'itinéraire une fois chargé
     * Priorise le point de départ pour l'affichage par défaut
     * Ajuste la position pour que le point de départ soit visible au-dessus du panneau
     */
    useEffect(() => {
        if (startPoint && mapRef.current) {
            // Centrer sur le point de départ avec un offset vers le haut pour qu'il soit visible au-dessus du panneau
            // Le panneau prend jusqu'à 45% de l'écran, donc on centre légèrement vers le haut
            mapRef.current.animateCamera({
                center: {
                    latitude: startPoint.latitude,
                    longitude: startPoint.longitude
                },
                zoom: 13, // Zoom légèrement augmenté pour mieux voir le point de départ
            });

            // Ensuite, ajuster pour voir tout l'itinéraire si disponible
            if (routePath.length > 0) {
                setTimeout(() => {
                    centerMapOnRoute();
                }, 500);
            }
        } else if (routePath.length > 0 && mapRef.current) {
            centerMapOnRoute();
        }
    }, [routePath, startPoint, centerMapOnRoute]);

    /**
     * Met à jour la ref du mode manuel
     */
    useEffect(() => {
        isManualModeRef.current = isManualMode;
    }, [isManualMode]);

    /**
     * Calcule les distances cumulées le long de l'itinéraire
     * Permet de calculer la position du bus en fonction de la distance réelle parcourue
     */
    const calculateRouteDistances = useCallback(() => {
        if (routePath.length < 2) {
            routeDistancesRef.current = [0];
            return;
        }

        const distances: number[] = [0];
        let totalDistance = 0;

        for (let i = 1; i < routePath.length; i++) {
            const distance = routingService.calculateDistance(
                routePath[i - 1],
                routePath[i]
            );
            totalDistance += distance;
            distances.push(totalDistance);
        }

        routeDistancesRef.current = distances;
    }, [routePath]);

    /**
     * Calcule l'angle de rotation (bearing) entre deux points
     * @param point1 Point de départ
     * @param point2 Point d'arrivée
     * @returns Angle en degrés (0-360)
     */
    const calculateBearing = useCallback((point1: { latitude: number; longitude: number }, point2: { latitude: number; longitude: number }): number => {
        const lat1 = (point1.latitude * Math.PI) / 180;
        const lat2 = (point2.latitude * Math.PI) / 180;
        const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const bearing = Math.atan2(y, x);
        const bearingDegrees = (bearing * 180) / Math.PI;
        
        // Normaliser entre 0 et 360
        return (bearingDegrees + 360) % 360;
    }, []);

    /**
     * Calcule la position du bus le long de l'itinéraire en fonction de la progression
     * Utilise la distance réelle le long de la polyline pour un suivi précis
     * @param progression Progression entre 0 (départ) et 1 (arrivée)
     * @returns Coordonnées du bus et angle de rotation, ou null si l'itinéraire n'est pas disponible
     */
    const calculateBusPosition = useCallback((progression: number): { latitude: number; longitude: number; rotation: number } | null => {
        if (routePath.length === 0) return null;

        // S'assurer que les distances sont calculées
        if (routeDistancesRef.current.length === 0 || routeDistancesRef.current.length !== routePath.length) {
            calculateRouteDistances();
        }

        // Limiter la progression entre 0 et 1
        const clampedProgression = Math.max(0, Math.min(1, progression));

        // Calculer la distance cible le long de l'itinéraire
        const totalDistance = routeDistancesRef.current[routeDistancesRef.current.length - 1];
        if (totalDistance === 0 || routeDistancesRef.current.length < 2) {
            // Fallback : utiliser l'ancienne méthode basée sur l'index si les distances ne sont pas disponibles
            const exactIndex = clampedProgression * (routePath.length - 1);
            const currentIndex = Math.floor(exactIndex);
            const nextIndex = Math.min(currentIndex + 1, routePath.length - 1);
            const fraction = exactIndex - currentIndex;
            const currentPoint = routePath[currentIndex];
            const nextPoint = routePath[nextIndex];
            const rotation = calculateBearing(currentPoint, nextPoint);
            return {
                latitude: currentPoint.latitude + (nextPoint.latitude - currentPoint.latitude) * fraction,
                longitude: currentPoint.longitude + (nextPoint.longitude - currentPoint.longitude) * fraction,
                rotation,
            };
        }

        const targetDistance = clampedProgression * totalDistance;

        // Trouver le segment où se trouve la distance cible
        let segmentIndex = 0;
        for (let i = 0; i < routeDistancesRef.current.length - 1; i++) {
            if (targetDistance >= routeDistancesRef.current[i] && targetDistance <= routeDistancesRef.current[i + 1]) {
                segmentIndex = i;
                break;
            }
        }

        // Si on est à la fin, retourner le dernier point avec l'angle du dernier segment
        if (clampedProgression >= 1) {
            const lastPoint = routePath[routePath.length - 1];
            const secondLastPoint = routePath[routePath.length - 2];
            const rotation = calculateBearing(secondLastPoint, lastPoint);
            return {
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
                rotation,
            };
        }

        // Calculer la fraction dans le segment actuel
        const segmentStartDistance = routeDistancesRef.current[segmentIndex];
        const segmentEndDistance = routeDistancesRef.current[segmentIndex + 1];
        const segmentLength = segmentEndDistance - segmentStartDistance;
        const fraction = segmentLength > 0 
            ? (targetDistance - segmentStartDistance) / segmentLength 
            : 0;

        // Interpolation linéaire entre les deux points du segment
        const currentPoint = routePath[segmentIndex];
        const nextPoint = routePath[segmentIndex + 1];

        // Calculer l'angle de rotation basé sur la direction du mouvement
        const rotation = calculateBearing(currentPoint, nextPoint);

        return {
            latitude: currentPoint.latitude + (nextPoint.latitude - currentPoint.latitude) * fraction,
            longitude: currentPoint.longitude + (nextPoint.longitude - currentPoint.longitude) * fraction,
            rotation,
        };
    }, [routePath, calculateRouteDistances, calculateBearing]);

    /**
     * Calcule les distances de l'itinéraire quand le routePath change
     */
    useEffect(() => {
        if (routePath.length > 0) {
            calculateRouteDistances();
        }
    }, [routePath, calculateRouteDistances]);

    /**
     * Met à jour la ref du suivi du bus
     */
    useEffect(() => {
        isFollowingBusRef.current = isFollowingBus;
    }, [isFollowingBus]);

    /**
     * Gère l'animation du bus le long de l'itinéraire
     * Met à jour uniquement la position du bus sans déplacer la caméra
     * L'utilisateur peut naviguer librement sur la carte pendant l'animation
     * Optimisé pour réduire les mises à jour d'état
     */
    useEffect(() => {
        if (!isBusAnimationActive || !routeDuration || routePath.length === 0) {
            return;
        }

        const totalDurationSeconds = routeDuration * 60; // Durée totale en secondes
        const updateInterval = 50; // Mise à jour toutes les 50ms pour une animation très fluide
        const progressIncrement = updateInterval / (totalDurationSeconds * 1000); // Incrément de progression par mise à jour

        let currentProgress = animationProgress;
        
        busAnimationIntervalRef.current = setInterval(() => {
            currentProgress = Math.min(currentProgress + progressIncrement, 1);

            // Calculer la position du bus avec rotation
            const position = calculateBusPosition(currentProgress);
            if (position) {
                // Mettre à jour la position et la rotation du bus (batch les mises à jour)
                setBusPosition({ latitude: position.latitude, longitude: position.longitude });
                setBusRotation(position.rotation);
                setAnimationProgress(currentProgress);

                // Suivre le bus avec la caméra si le mode suivi est activé
                if (isFollowingBusRef.current) {
                    const now = Date.now();
                    // Mettre à jour la caméra toutes les 200ms pour un suivi fluide
                    if (now - lastCameraUpdateRef.current >= 200) {
                        if (mapRef.current) {
                            mapRef.current.animateCamera({
                                center: { latitude: position.latitude, longitude: position.longitude },
                                zoom: 15,
                            });
                            lastCameraUpdateRef.current = now;
                        }
                    }
                }
            }

            // Si on a atteint l'arrivée, arrêter l'animation
            if (currentProgress >= 1) {
                setIsBusAnimationActive(false);
            }
        }, updateInterval);

        return () => {
            if (busAnimationIntervalRef.current) {
                clearInterval(busAnimationIntervalRef.current);
                busAnimationIntervalRef.current = null;
            }
        };
    }, [isBusAnimationActive, routeDuration, routePath.length, calculateBusPosition, animationProgress]);

    /**
     * Initialise la position du bus au point de départ quand l'itinéraire est chargé
     * Ne réinitialise que si l'animation n'est pas active
     */
    useEffect(() => {
        if (startPoint && routePath.length > 0 && !isBusAnimationActive && !busPosition) {
            setBusPosition(startPoint);
            setAnimationProgress(0);
            
            // Calculer l'angle initial basé sur la direction du premier segment
            if (routePath.length > 1) {
                const initialRotation = calculateBearing(routePath[0], routePath[1]);
                setBusRotation(initialRotation);
            } else {
                setBusRotation(0);
            }
        }
    }, [startPoint, routePath.length, isBusAnimationActive, calculateBearing]);

    /**
     * Nettoie tous les intervalles lors du démontage
     */
    useEffect(() => {
        return () => {
            if (busAnimationIntervalRef.current) {
                clearInterval(busAnimationIntervalRef.current);
                busAnimationIntervalRef.current = null;
            }
        };
    }, []);

    /**
     * Récupère la position géographique la plus récente
     * Force une mise à jour de la position actuelle même en mode manuel
     * @returns La nouvelle position ou null en cas d'erreur
     */
    const refreshCurrentLocation = useCallback(async (): Promise<PassengerLocation | null> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès à la localisation est nécessaire pour afficher votre position"
                );
                return null;
            }

            // Récupérer la position actuelle
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const locationData: PassengerLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                timestamp: new Date().toISOString(),
            };

            setPassengerLocation(locationData);

            // Obtenir l'adresse de la position actuelle
            const address = await getAddressFromCoordinates(
                location.coords.latitude,
                location.coords.longitude
            );
            setCurrentAddress(address);

            // Si on n'est pas en mode manuel, relancer le suivi automatique
            if (!isManualMode) {
                initPassengerLocation();
            }

            return locationData;
        } catch (error) {
            console.error('Erreur lors de la récupération de la position:', error);
            return null;
        }
    }, [isManualMode, getAddressFromCoordinates, initPassengerLocation]);

    /**
     * Centre la carte sur la position de l'utilisateur
     * Si en mode manuel, met à jour la position avec la position GPS la plus récente
     */
    const centerOnMe = useCallback(async () => {
        let positionToUse = passengerLocation;
        
        // Si en mode manuel, mettre à jour la position avant de centrer
        if (isManualMode) {
            const updatedLocation = await refreshCurrentLocation();
            if (updatedLocation) {
                positionToUse = updatedLocation;
            }
        }
        
        if (positionToUse && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: positionToUse.latitude, longitude: positionToUse.longitude },
                zoom: 15,
            });
        }
    }, [passengerLocation, isManualMode, refreshCurrentLocation]);

    /**
     * Centre la carte sur le point de départ
     * Ajuste la position pour que le point soit visible au-dessus du panneau d'informations
     */
    const centerOnStartPoint = useCallback(() => {
        if (startPoint && mapRef.current) {
            // Utiliser fitToCoordinates avec un seul point pour avoir un padding adapté
            mapRef.current.fitToCoordinates([startPoint], {
                edgePadding: { top: 100, right: 50, bottom: 450, left: 50 },
                animated: true,
            });
        }
    }, [startPoint]);

    /**
     * Centre la carte sur le point d'arrivée
     */
    const centerOnEndPoint = useCallback(() => {
        if (endPoint && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: endPoint.latitude, longitude: endPoint.longitude },
                zoom: 15,
            });
        }
    }, [endPoint]);

    /**
     * Gère la sélection manuelle d'une position sur la carte
     * @param coordinate Coordonnées de la position sélectionnée
     */
    const handleMapPress = useCallback(async (coordinate: { latitude: number; longitude: number }) => {
        if (!isManualMode) return;

        // Arrêter le suivi automatique
        stopLocationTracking();

        // Mettre à jour la position
        const locationData: PassengerLocation = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            timestamp: new Date().toISOString(),
        };
        setPassengerLocation(locationData);

        // Obtenir l'adresse de la position sélectionnée
        const address = await getAddressFromCoordinates(
            coordinate.latitude,
            coordinate.longitude
        );
        setCurrentAddress(address);
    }, [isManualMode, getAddressFromCoordinates, stopLocationTracking]);

    /**
     * Bascule entre le mode géolocalisation automatique et le mode sélection manuelle
     * Lors du retour en mode automatique, récupère la position la plus récente
     */
    const toggleLocationMode = useCallback(() => {
        const newMode = !isManualMode;
        setIsManualMode(newMode);

        if (newMode) {
            // Mode manuel : arrêter le suivi automatique
            stopLocationTracking();
        } else {
            // Mode automatique : récupérer la position la plus récente et relancer le suivi
            refreshCurrentLocation();
        }
    }, [isManualMode, stopLocationTracking, refreshCurrentLocation]);

    /**
     * Démarre ou arrête l'animation du bus
     * Réinitialise la position au point de départ à chaque démarrage
     * Ne déplace pas la caméra automatiquement pour laisser l'utilisateur naviguer librement
     */
    const toggleBusAnimation = useCallback(() => {
        if (isBusAnimationActive) {
            // Arrêter l'animation et désactiver le suivi automatique
            setIsBusAnimationActive(false);
            setIsFollowingBus(false);
        } else {
            // Démarrer l'animation depuis le début
            if (startPoint && routePath.length > 0 && routeDuration) {
                // Réinitialiser la progression et la position
                setAnimationProgress(0);
                setBusPosition(startPoint);
                
                // Calculer l'angle initial basé sur la direction du premier segment
                if (routePath.length > 1) {
                    const initialRotation = calculateBearing(routePath[0], routePath[1]);
                    setBusRotation(initialRotation);
                } else {
                    setBusRotation(0);
                }
                
                // Réinitialiser le suivi de la caméra
                lastCameraUpdateRef.current = 0;
                
                // Démarrer l'animation immédiatement
                setIsBusAnimationActive(true);
            }
        }
    }, [isBusAnimationActive, startPoint, routePath.length, routeDuration, calculateBearing]);

    /**
     * Centre la carte sur la position du bus
     */
    const centerOnBus = useCallback(() => {
        if (busPosition && mapRef.current) {
            mapRef.current.animateCamera({
                center: busPosition,
                zoom: 15,
            });
        }
    }, [busPosition]);

    /**
     * Active ou désactive le suivi automatique du bus
     * Quand activé, la caméra suit automatiquement le bus pendant son déplacement
     */
    const toggleFollowBus = useCallback(() => {
        const newFollowState = !isFollowingBus;
        setIsFollowingBus(newFollowState);
        isFollowingBusRef.current = newFollowState;
        
        // Si on active le suivi, centrer immédiatement sur le bus
        if (newFollowState && busPosition && mapRef.current) {
            mapRef.current.animateCamera({
                center: busPosition,
                zoom: 15,
            });
            lastCameraUpdateRef.current = Date.now();
        }
    }, [isFollowingBus, busPosition]);

    /**
     * Réduit ou étend le panneau d'informations
     * Permet d'avoir une meilleure vue de la carte
     */
    const togglePanelCollapse = useCallback(() => {
        const newCollapsedState = !isPanelCollapsed;
        setIsPanelCollapsed(newCollapsedState);
        
        // Animation fluide de la hauteur du panneau
        Animated.timing(panelHeightAnim, {
            toValue: newCollapsedState ? 0.2 : 1, // Réduire à 20% de la hauteur (masque plus de la moitié)
            duration: 300,
            useNativeDriver: false, // height ne peut pas utiliser le native driver
        }).start();
    }, [isPanelCollapsed, panelHeightAnim]);

    /**
     * Calcule la durée estimée du trajet selon le tracé réel et les éventuels embouteillages
     * Priorise la durée calculée à partir du tracé du trajet
     * Si non disponible, utilise les heures de départ et d'arrivée du booking
     * @returns La durée formatée (ex: "3h 00min") ou null si les données ne sont pas disponibles
     */
    const formattedDuration = useMemo((): string | null => {
        // Prioriser la durée calculée à partir du tracé du trajet
        if (routeDuration !== null && routeDuration > 0) {
            const hours = Math.floor(routeDuration / 60);
            const minutes = Math.round(routeDuration % 60);

            // Formater la durée
            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return `${minutes}min`;
            }
        }

        // Fallback : utiliser les heures de départ et d'arrivée du booking
        if (!booking.departureTime || !booking.arrivalTime) {
            return null;
        }

        try {
            // Parser les heures au format HH:MM
            const [departureHours, departureMinutes] = booking.departureTime.split(':').map(Number);
            const [arrivalHours, arrivalMinutes] = booking.arrivalTime.split(':').map(Number);

            // Calculer la différence en minutes
            const departureTotalMinutes = departureHours * 60 + departureMinutes;
            const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;

            // Gérer le cas où l'arrivée est le lendemain (arrivalTime < departureTime)
            let diffMinutes = arrivalTotalMinutes - departureTotalMinutes;
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // Ajouter 24 heures
            }

            // Convertir en heures et minutes
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            // Formater la durée
            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return `${minutes}min`;
            }
        } catch (error) {
            console.error('Erreur calcul durée:', error);
            return null;
        }
    }, [routeDuration, booking.departureTime, booking.arrivalTime]);

    /**
     * Extrait un code de ville à partir du nom de la ville
     * Prend les 3 premières lettres en majuscules
     * @param cityName Nom de la ville
     * @returns Code de la ville (ex: "CPH" pour "Copenhagen")
     */
    const getCityCode = useCallback((cityName: string): string => {
        if (!cityName) return '';
        // Prendre les 3 premières lettres et les mettre en majuscules
        return cityName.substring(0, 3).toUpperCase();
    }, []);

    // Codes de ville mémorisés
    const startCityCode = useMemo(() => getCityCode(booking.trip?.stationFrom?.city || ''), [booking.trip?.stationFrom?.city]);
    const endCityCode = useMemo(() => getCityCode(booking.trip?.stationTo?.city || ''), [booking.trip?.stationTo?.city]);

    // Descriptions des markers mémorisées
    const startMarkerDescription = useMemo(() => 
        `${booking.trip?.stationFrom?.name || ''} - ${booking.trip?.stationFrom?.city || ''}`, 
        [booking.trip?.stationFrom?.name, booking.trip?.stationFrom?.city]
    );
    const endMarkerDescription = useMemo(() => 
        `${booking.trip?.stationTo?.name || ''} - ${booking.trip?.stationTo?.city || ''}`, 
        [booking.trip?.stationTo?.name, booking.trip?.stationTo?.city]
    );

    // Styles mémorisés pour éviter les recréations
    const headerStyle = useMemo(() => [
        styles.header,
        { backgroundColor: "transparent", paddingTop: insets.top }
    ], [insets.top]);

    const headerButtonStyle = useMemo(() => [
        styles.headerButton,
        { backgroundColor: backgroundColor }
    ], [backgroundColor]);

    const panelHeightInterpolation = useMemo(() => 
        panelHeightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['1.5%', '44%']
        }), [panelHeightAnim]);

    const infoPanelStyle = useMemo(() => [
        styles.infoPanel,
        {
            backgroundColor: themeColors.panelBackground,
            maxHeight: panelHeightInterpolation
        }
    ], [themeColors.panelBackground, panelHeightInterpolation]);

    const scrollViewContentStyle = useMemo(() => [
        styles.scrollViewContent,
        { paddingBottom: Math.max(20, insets.bottom) }
    ], [insets.bottom]);

    // Style du bus marker mémorisé
    const busMarkerImageStyle = useMemo(() => 
        Platform.OS === 'ios' ? styles.busMarkerImage : { width: 32, height: 32 },
        []
    );

    // Coordonnées du passager mémorisées
    const passengerCoordinate = useMemo(() => {
        if (!passengerLocation) return null;
        return {
            latitude: passengerLocation.latitude,
            longitude: passengerLocation.longitude,
        };
    }, [passengerLocation]);

    // Initial region mémorisée
    const initialRegion = useMemo(() => {
        const defaultLat = startPoint?.latitude ?? passengerLocation?.latitude ?? 5.33542;
        const defaultLon = startPoint?.longitude ?? passengerLocation?.longitude ?? -4.00351;
        return {
            latitude: defaultLat,
            longitude: defaultLon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
    }, [startPoint?.latitude, startPoint?.longitude, passengerLocation?.latitude, passengerLocation?.longitude]);

    /**
     * Obtient le fuseau horaire approximatif basé sur la longitude
     * @param longitude Longitude de la position
     * @returns Fuseau horaire formaté (ex: "UTC+2")
     */
    const getTimezone = useCallback((longitude: number): string => {
        // Approximation : chaque 15 degrés de longitude = 1 heure de différence
        // UTC+0 est à 0° de longitude
        const timezoneOffset = Math.round(longitude / 15);
        // Limiter entre UTC-12 et UTC+14
        const offset = Math.max(-12, Math.min(14, timezoneOffset));
        return `UTC${offset >= 0 ? '+' : ''}${offset}`;
    }, []);

    // Callback mémorisé pour le retour en arrière
    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    // Callback mémorisé pour le press sur la carte
    const handleMapPressCallback = useCallback((event: any) => {
        if (isManualMode && event.nativeEvent.coordinate) {
            handleMapPress(event.nativeEvent.coordinate);
        }
    }, [isManualMode, handleMapPress]);

    /**
     * Retourne le composant de chargement
     */
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={COLORS.ACCENT} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                    Calcul de l'itinéraire...
                </Text>
            </View>
        );
    }

    /**
     * Retourne le composant d'erreur
     */
    if (error && routePath.length === 0) {
        return (
            <View style={[styles.errorContainer, { backgroundColor }]}>
                <Ionicons name="alert-circle" size={64} color="#F44336" />
                <Text style={[styles.errorTitle, { color: textColor }]}>Erreur</Text>
                <Text style={[styles.errorText, { color: secondaryTextColor }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: COLORS.ACCENT }]}
                    onPress={calculateRouteFromBooking}
                >
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    /**
     * Retourne le composant de chargement si pas de localisation
     */
    if (!passengerLocation) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={COLORS.ACCENT} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                    Obtention de votre position...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Carte OpenStreetMap */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={initialRegion}
                showsMyLocationButton={!isManualMode}
                showsCompass={true}
                showsScale={true}
                mapType={isDarkMode ? 'standard' : 'standard'}
                userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
                onPress={handleMapPressCallback}
            >
                {/* Itinéraire du trajet */}
                {routePath.length > 0 && (
                    <Polyline
                        coordinates={routePath}
                        strokeColor={COLORS.ACCENT}
                        strokeWidth={5}
                    />
                )}

                {/* Point de départ */}
                {startPoint && (
                    <Marker
                        coordinate={startPoint}
                        title="Point de départ"
                        identifier="start-point"
                        description={startMarkerDescription}
                        anchor={MARKER_ANCHOR_BOTTOM}
                    >
                        <Image
                            source={flagStartImage}
                            style={styles.flagMarker}
                            resizeMode="contain"
                        />
                    </Marker>
                )}

                {/* Point d'arrivée */}
                {endPoint && (
                    <Marker
                        coordinate={endPoint}
                        title="Point d'arrivée"
                        identifier="end-point"
                        description={endMarkerDescription}
                        anchor={MARKER_ANCHOR_BOTTOM}
                    >
                        <Image
                            source={flagEndImage}
                            style={styles.flagMarker}
                            resizeMode="contain"
                        />
                    </Marker>
                )}

                {/* Position du passager */}
                {passengerCoordinate && (
                    <Marker
                        coordinate={passengerCoordinate}
                        title="Vous êtes ici"
                        anchor={MARKER_ANCHOR_BOTTOM}
                    >
                        <View style={styles.userLocationPinContainer}>
                            <View>
                                <Image
                                    source={userLocationPinImage}
                                    style={styles.userLocationPinMarker}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Position du bus */}
                {busPosition && (
                    <Marker
                        coordinate={busPosition}
                        title="Bus"
                        identifier="bus-marker"
                        anchor={MARKER_ANCHOR_CENTER}
                    >
                        <View style={styles.busMarkerContainer}>
                            <View style={[{ transform: [{ rotate: `${busRotation}deg` }] }]}>
                                <Image
                                    source={busImage}
                                    style={busMarkerImageStyle}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* En-tête de navigation */}
            <View style={headerStyle}>
                <TouchableOpacity
                    style={headerButtonStyle}
                    onPress={handleBackPress}
                >
                    <Ionicons name="arrow-back" size={20} color={textColor} />
                </TouchableOpacity>
                {/* <Text style={[styles.headerTitle, { color: textColor }]}>Itinéraire du trajet</Text> */}
                {/* <View style={styles.headerRightButtons} /> */}
            </View>

            {/* Boutons de contrôle au-dessus du panneau d'information */}
            <View style={styles.controlButtonsContainer}>
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        {
                            backgroundColor: isManualMode ? COLORS.ACCENT : themeColors.iconCircleBackground
                        }
                    ]}
                    onPress={toggleLocationMode}
                >
                    <Ionicons 
                        name={isManualMode ? "location" : "location-outline"} 
                        size={20} 
                        color={isManualMode ? COLORS.WHITE : textColor} 
                    />
                </TouchableOpacity>
                {busPosition && routeDuration && (
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            {
                                backgroundColor: isBusAnimationActive ? COLORS.ACCENT : themeColors.iconCircleBackground
                            }
                        ]}
                        onPress={toggleBusAnimation}
                    >
                        <Ionicons
                            name={isBusAnimationActive ? "pause" : "bus"}
                            size={20}
                            color={isBusAnimationActive ? COLORS.WHITE : textColor}
                        />
                    </TouchableOpacity>
                )}
                {busPosition && (
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            {
                                backgroundColor: isFollowingBus ? COLORS.ACCENT : themeColors.iconCircleBackground
                            }
                        ]}
                        onPress={toggleFollowBus}
                    >
                        <Ionicons
                            name={isFollowingBus ? "eye" : "eye-outline"}
                            size={20}
                            color={isFollowingBus ? COLORS.WHITE : textColor}
                        />
                    </TouchableOpacity>
                )}
                {busPosition && (
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: themeColors.iconCircleBackground }]}
                        onPress={centerOnBus}
                    >
                        <Ionicons name="locate" size={20} color={textColor} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: themeColors.iconCircleBackground }]}
                    onPress={centerOnMe}
                >
                    <Ionicons name="person" size={20} color={textColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: themeColors.iconCircleBackground }]}
                    onPress={centerMapOnRoute}
                >
                    <Ionicons name="expand-outline" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Panneau d'informations */}
            <Animated.View style={infoPanelStyle}>
                <TouchableOpacity
                    style={styles.panelHandleContainer}
                    onPress={togglePanelCollapse}
                    activeOpacity={0.7}
                >
                    <View style={[styles.panelHandle, { backgroundColor: themeColors.border, borderColor: themeColors.border }]} />
                </TouchableOpacity>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={scrollViewContentStyle}
                    showsVerticalScrollIndicator={!isPanelCollapsed}
                >
                    {/* En-tête avec destination et durée */}
                    <View style={[styles.panelHeader, { backgroundColor: themeColors.cardBackground }]}>
                        <View style={[
                            styles.headerContent,
                            styles.headerContentBorder,
                            {
                                borderColor: themeColors.border,
                                backgroundColor: themeColors.cardBackground,
                            }
                        ]}>
                            {/* Section de départ */}
                            <View style={styles.headerColumn}>
                                <View style={[styles.cityCodeBadge, { backgroundColor: themeColors.badgeBackground }]}>
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {startCityCode}
                                    </Text>
                                </View>
                                <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                    {booking.trip?.stationFrom?.city || ''}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                        {booking.trip?.stationFrom?.name || ''}
                                    </Text>
                                </View>
                            </View>

                            {/* Icône de bus au centre avec ligne décorative */}
                            <View style={styles.headerCenterSection}>
                                <View style={[styles.headerIconContainer, { backgroundColor: COLORS.ACCENT }]}>
                                    <Ionicons name="bus-outline" size={20} color={COLORS.WHITE} />
                                </View>
                                <View style={[styles.headerConnectorLine, { backgroundColor: themeColors.border }]} />
                            </View>

                            {/* Section d'arrivée */}
                            <View style={styles.headerColumn}>
                                <View style={[styles.cityCodeBadge, { backgroundColor: themeColors.badgeBackground }]}>
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {endCityCode}
                                    </Text>
                                </View>
                                <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                    {booking.trip?.stationTo?.city || ''}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                        {booking.trip?.stationTo?.name || ''}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* Durée du trajet avec badge */}
                        {formattedDuration && booking.arrivalTime && (
                            <View style={[styles.durationBadge, { backgroundColor: COLORS.ACCENT, borderColor: COLORS.ACCENT }]}>
                                <Ionicons name="time" size={18} color={COLORS.WHITE} />
                                <Text style={[styles.headerDuration, { color: COLORS.WHITE }]}>
                                    Durée estimée du trajet : {formattedDuration}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Indicateur de mode sélection manuelle - Masqué quand le panneau est réduit */}
                    {isManualMode && !isPanelCollapsed && (
                        <View style={[styles.modeIndicator, { backgroundColor: COLORS.ACCENT_LIGHT, borderColor: COLORS.ACCENT }]}>
                            <View style={[styles.modeIndicatorIconContainer, { backgroundColor: COLORS.ACCENT }]}>
                                <Ionicons name="hand-left-outline" size={16} color={COLORS.WHITE} />
                            </View>
                            <View style={styles.modeIndicatorTextContainer}>
                                <Text style={[styles.modeIndicatorTitle, { color: COLORS.ACCENT }]}>
                                    Mode sélection manuelle
                                </Text>
                                <Text style={[styles.modeIndicatorText, { color: COLORS.ACCENT }]}>
                                    Appuyez sur la carte pour choisir votre position
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Liste des étapes - Masquée quand le panneau est réduit */}
                    {!isPanelCollapsed && (
                        <View style={styles.stepsContainer}>
                        {/* Position actuelle */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnMe}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: COLORS.ACCENT }]}>
                                        <Ionicons name="locate" size={16} color={COLORS.WHITE} />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground }
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnMe}
                            >
                                <View style={{ width: '90%' }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={2}>
                                            Position actuelle
                                        </Text>
                                    </View>
                                    <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={2}>
                                        {currentAddress}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Ville de départ */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnStartPoint}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: COLORS.START_MARKER }]}>
                                        <Ionicons name="bus-outline" size={16} color={COLORS.WHITE} />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground }
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnStartPoint}
                            >
                                <View style={{ width: '90%' }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                            Ville de départ
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="location" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={1}>
                                            {booking.trip.stationFrom.city}
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                            Départ prévu à {booking.departureTime}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Ville d'arrivée */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnEndPoint}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: COLORS.END_MARKER }]}>
                                        <Ionicons name="stop-outline" size={16} color={COLORS.WHITE} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground }
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnEndPoint}
                            >
                                <View style={{ width: '90%' }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                            Ville d'arrivée
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="location" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={1}>
                                            {booking.trip.stationTo.city}
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                            Arrivée prévue à {booking.arrivalTime}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    )}
                </ScrollView>
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
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 4,
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
    headerRightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButtonsContainer: {
        position: 'absolute',
        bottom: '46%',
        right: 20,
        flexDirection: 'column',
        gap: 12,
        zIndex: 10,
        // borderWidth: 1,
        // borderColor: 'red',
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.2,
        // shadowRadius: 4,
        // elevation: 4,
    },
    flagMarker: {
        width: 64,
        height: 64,
    },
    userLocationPinContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    userLocationPinShadow: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(23, 118, 186, 0.15)',
        shadowColor: COLORS.ACCENT,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
    },
    userLocationPinMarker: {
        width: 32,
        height: 32,
    },
    busMarkerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    busMarkerShadow: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'rgba(23, 118, 186, 0.15)',
        // shadowColor: COLORS.ACCENT,
        // shadowOffset: { width: 0, height: 3 },
        // shadowOpacity: 0.4,
        // shadowRadius: 6,
        // elevation: 6,
    },
    busMarkerImage: {
        width: 56,
        height: 56,
    },
    infoPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 20,
        paddingBottom: 20,
        // borderWidth: 2,
        // borderColor: '#E0E0E0',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: -4 },
        // shadowOpacity: 0.1,
        // shadowRadius: 8,
        // elevation: 8,
        maxHeight: '45%',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    panelHeader: {
        marginBottom: 16,
        borderRadius: 16,
        paddingHorizontal: 15,
    },
    panelHandleContainer: {
        width: '100%',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    panelHandle: {
        width: 30,
        height: 6,
        alignSelf: 'center',
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 1.5,
        marginTop: 0,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    headerContentBorder: {
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    headerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    cityCodeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 8,
    },
    headerCityCode: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerCityName: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 6,
        textAlign: 'center',
    },
    timezoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerTimezone: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    headerCenterSection: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#1776BA',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        // elevation: 4,
    },
    headerConnectorLine: {
        width: 2,
        height: 30,
        marginTop: 8,
        opacity: 0.4,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 1.5,
        gap: 8,
    },
    headerDuration: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'center',
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 16,
        marginHorizontal: 15,
        borderWidth: 1.5,
        gap: 12,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.1,
        // shadowRadius: 3,
        // elevation: 2,
    },
    modeIndicatorIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeIndicatorTextContainer: {
        flex: 1,
    },
    modeIndicatorTitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 2,
    },
    modeIndicatorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        opacity: 0.9,
    },
    stepsContainer: {
        paddingHorizontal: 15,
        gap: 16,
        marginTop: 30,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepLeft: {
        alignItems: 'center',
        marginRight: 14,
        width: 36,
    },
    stepIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.2,
        // shadowRadius: 3,
        // elevation: 3,
    },
    stepLine: {
        width: 2,
        height: 60,
        marginTop: 6,
        marginBottom: 4,
        opacity: 0.3,
        borderRadius: 1,
    },
    stepCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        minHeight: 70,
        justifyContent: 'center',
    },
    stepCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        // borderWidth: 1,
        // borderColor: 'red',
    },
    stepMainText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    stepCardDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    stepSubText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
});
