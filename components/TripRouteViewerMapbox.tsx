// @ts-nocheck
import { useTheme } from "@/contexts/ThemeContext";
import { useBusTracking } from "@/hooks/useBusTracking";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Booking } from "@/interfaces";
import { geocodingService } from "@/services/geocodingService";
import { routingService } from "@/services/routingService";
import { PassengerLocation } from "@/types/tracking";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
    Camera,
    LineLayer,
    MapView,
    MarkerView,
    ShapeSource,
} from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Initialisation de Mapbox avec le token
// Import des images
const busImage = require("@/assets/images/bus.png");
const flagStartImage = require("@/assets/images/flag-start.png");
const flagEndImage = require("@/assets/images/flag-end.png");
const userLocationPinImage = require("@/assets/images/user-location-pin.png");

// Constantes de couleurs
const COLORS = {
    ACCENT: "#1776BA",
    ACCENT_LIGHT: "rgba(106, 90, 205, 0.1)",
    START_MARKER: "#4CAF50",
    END_MARKER: "#F44336",
    ERROR: "#F44336",
    WHITE: "#fff",
    DARK_CARD: "#1C1C1E",
    DARK_BORDER: "#3A3A3C",
    DARK_LIST_ITEM: "#2C2C2E",
    LIGHT_CARD: "#FFFFFF",
    LIGHT_BORDER: "#E0E0E0",
    LIGHT_LIST_ITEM: "#F8F8F8",
    DARK_BADGE: "#2C2C2E",
    LIGHT_BADGE: "#F0F4F8",
} as const;

interface TripRouteViewerMapboxProps {
    booking: Booking;
}

Mapbox.setAccessToken(
    "sk.eyJ1IjoiZGV0dHktcm9tYXJpYyIsImEiOiJjbWtxMzRmbzkwam5pM2dzOTkxbDBxOHF0In0.FTLTCaKPMw8mPG_9CvIhiw",
);

/**
 * Composant pour afficher l'itinéraire d'un trajet sur une carte Mapbox
 * Affiche la carte, la géolocalisation de l'utilisateur et l'itinéraire du trajet
 */
export default function TripRouteViewerMapbox({
    booking,
}: TripRouteViewerMapboxProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? "light";
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    const [passengerLocation, setPassengerLocation] =
        useState<PassengerLocation | null>(null);
    const [currentAddress, setCurrentAddress] =
        useState<string>("Position actuelle");
    const [routePath, setRoutePath] = useState<
        { latitude: number; longitude: number }[]
    >([]);
    const [startPoint, setStartPoint] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [endPoint, setEndPoint] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isManualMode, setIsManualMode] = useState<boolean>(false);
    const [routeDuration, setRouteDuration] = useState<number | null>(null);
    const [busPosition, setBusPosition] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [busRotation, setBusRotation] = useState<number>(0);
    const [isBusAnimationActive, setIsBusAnimationActive] =
        useState<boolean>(false);
    const [isFollowingBus, setIsFollowingBus] = useState<boolean>(false);
    const [animationProgress, setAnimationProgress] = useState<number>(0);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
    const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(
        null,
    );
    const [cameraZoom, setCameraZoom] = useState<number>(13);

    const panelHeightAnim = useRef(new Animated.Value(1)).current;

    const mapRef = useRef<MapView>(null);
    const cameraRef = useRef<Camera>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(
        null,
    );
    const isManualModeRef = useRef<boolean>(false);
    const busAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const routeDistancesRef = useRef<number[]>([]);
    const lastCameraUpdateRef = useRef<number>(0);
    const addressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const bookingIdRef = useRef<string | number | null>(null);
    const isFollowingBusRef = useRef<boolean>(false);

    const trackingTripId = useMemo(
        () =>
            String(
                booking?.trip?.id ||
                    booking?.trip?._id ||
                    booking?.tripId ||
                    booking?.id ||
                    "",
            ),
        [booking],
    );

    const trackingBookingId = useMemo(
        () => String(booking?.id || booking?.code || booking?.reference || ""),
        [booking],
    );

    const trackingBusId = useMemo(
        () =>
            String(
                booking?.bus?.id ||
                    booking?.busId ||
                    booking?.trip?.busId ||
                    "",
            ),
        [booking],
    );

    const { busPosition: liveBusPosition } = useBusTracking(
        trackingTripId,
        trackingBookingId,
        trackingBusId,
    );

    useEffect(() => {
        console.log("[TripRouteViewerMapbox] ids tracking", {
            trackingTripId,
            trackingBookingId,
            trackingBusId,
        });
    }, [trackingTripId, trackingBookingId, trackingBusId]);

    // Couleurs du thème mémorisées
    const backgroundColor = useThemeColor({}, "background");
    const textColor = useThemeColor({}, "text");
    const secondaryTextColor = useThemeColor({}, "secondaryText");

    const themeColors = useMemo(
        () => ({
            cardBackground:
                colorScheme === "dark" ? COLORS.DARK_CARD : COLORS.LIGHT_CARD,
            border: colorScheme === "dark" ? COLORS.DARK_BORDER : COLORS.LIGHT_BORDER,
            panelBackground:
                colorScheme === "dark" ? COLORS.DARK_CARD : COLORS.LIGHT_CARD,
            listItemBackground:
                colorScheme === "dark" ? COLORS.DARK_LIST_ITEM : COLORS.LIGHT_LIST_ITEM,
            iconCircleBackground:
                colorScheme === "dark" ? COLORS.DARK_LIST_ITEM : COLORS.LIGHT_LIST_ITEM,
            badgeBackground:
                colorScheme === "dark" ? COLORS.DARK_BADGE : COLORS.LIGHT_BADGE,
        }),
        [colorScheme],
    );

    /**
     * Convertit les coordonnées de {latitude, longitude} vers [longitude, latitude] pour Mapbox
     * @param coord Coordonnées au format {latitude, longitude}
     * @returns Coordonnées au format [longitude, latitude]
     */
    const toMapboxCoordinates = useCallback(
        (coord: { latitude: number; longitude: number }): [number, number] => {
            return [coord.longitude, coord.latitude];
        },
        [],
    );

    /**
     * Obtient l'adresse à partir des coordonnées GPS
     * @param latitude Latitude de la position
     * @param longitude Longitude de la position
     */
    const getAddressFromCoordinates = useCallback(
        async (latitude: number, longitude: number) => {
            try {
                const addresses = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });

                if (addresses && addresses.length > 0) {
                    const address = addresses[0];
                    const addressParts: string[] = [];

                    if (address.streetNumber && address.street) {
                        addressParts.push(`${address.streetNumber} ${address.street}`);
                    } else if (address.street) {
                        addressParts.push(address.street);
                    }

                    if (address.district) {
                        addressParts.push(address.district);
                    }

                    if (address.city) {
                        addressParts.push(address.city);
                    }

                    if (address.region) {
                        addressParts.push(address.region);
                    }

                    if (address.postalCode) {
                        addressParts.push(address.postalCode);
                    }

                    const fullAddress =
                        addressParts.length > 0
                            ? addressParts.join(", ")
                            : "Position actuelle";

                    return fullAddress;
                }
                return "Position actuelle";
            } catch {
                return "Position actuelle";
            }
        },
        [],
    );

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
    const isValidCoordinate = useCallback(
        (
            coord: { latitude: number; longitude: number } | null | undefined,
        ): coord is { latitude: number; longitude: number } => {
            return (
                coord !== null &&
                coord !== undefined &&
                typeof coord.latitude === "number" &&
                typeof coord.longitude === "number" &&
                !isNaN(coord.latitude) &&
                !isNaN(coord.longitude) &&
                coord.latitude >= -90 &&
                coord.latitude <= 90 &&
                coord.longitude >= -180 &&
                coord.longitude <= 180
            );
        },
        [],
    );

    /**
     * Calcule l'itinéraire à partir des données du booking
     */
    const calculateRouteFromBooking = useCallback(async () => {
        let startCoords = booking.trip?.stationFrom?.coordinate;
        let endCoords = booking.trip?.stationTo?.coordinate;

        try {
            setIsLoading(true);
            setError(null);

            if (!isValidCoordinate(startCoords) && booking.trip?.stationFrom?.city) {
                const defaultStartCoords = geocodingService.getCityCoordinates(
                    booking.trip.stationFrom.city,
                );
                if (defaultStartCoords) {
                    startCoords = defaultStartCoords;
                }
            }

            if (!isValidCoordinate(endCoords) && booking.trip?.stationTo?.city) {
                const defaultEndCoords = geocodingService.getCityCoordinates(
                    booking.trip.stationTo.city,
                );
                if (defaultEndCoords) {
                    endCoords = defaultEndCoords;
                }
            }

            if (!isValidCoordinate(startCoords) || !isValidCoordinate(endCoords)) {
                throw new Error(
                    "Impossible de trouver des coordonnées valides pour les villes",
                );
            }

            setStartPoint(startCoords);
            setEndPoint(endCoords);

            const routeDetails = await routingService.getRouteWithDetails(
                startCoords,
                endCoords,
            );
            setRoutePath(routeDetails.coordinates);
            setRouteDuration(routeDetails.duration);
        } catch {
            setError("Impossible de calculer l'itinéraire");
            if (isValidCoordinate(startCoords) && isValidCoordinate(endCoords)) {
                setRoutePath([startCoords, endCoords]);
                setRouteDuration(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [
        booking.trip?.stationFrom?.coordinate,
        booking.trip?.stationFrom?.city,
        booking.trip?.stationTo?.coordinate,
        booking.trip?.stationTo?.city,
        isValidCoordinate,
    ]);

    /**
     * Initialise la localisation du passager
     */
    const initPassengerLocation = useCallback(async () => {
        try {
            stopLocationTracking();

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission refusée",
                    "L'accès à la localisation est nécessaire pour afficher votre position",
                );
                const defaultLocation = {
                    latitude: 5.33542,
                    longitude: -4.00351,
                    accuracy: 50,
                    timestamp: new Date().toISOString(),
                };
                setPassengerLocation(defaultLocation);

                const address = await getAddressFromCoordinates(
                    defaultLocation.latitude,
                    defaultLocation.longitude,
                );
                setCurrentAddress(address);
                return;
            }

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

            const address = await getAddressFromCoordinates(
                location.coords.latitude,
                location.coords.longitude,
            );
            setCurrentAddress(address);

            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 50,
                },
                async (location) => {
                    if (!isManualModeRef.current) {
                        const locationData = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy || undefined,
                            timestamp: new Date().toISOString(),
                        };
                        setPassengerLocation(locationData);

                        if (addressUpdateTimeoutRef.current) {
                            clearTimeout(addressUpdateTimeoutRef.current);
                        }
                        addressUpdateTimeoutRef.current = setTimeout(async () => {
                            const address = await getAddressFromCoordinates(
                                location.coords.latitude,
                                location.coords.longitude,
                            );
                            setCurrentAddress(address);
                        }, 2000);
                    }
                },
            );
        } catch {
            const defaultLocation = {
                latitude: 5.33542,
                longitude: -4.00351,
                accuracy: 50,
                timestamp: new Date().toISOString(),
            };
            setPassengerLocation(defaultLocation);

            const address = await getAddressFromCoordinates(
                defaultLocation.latitude,
                defaultLocation.longitude,
            );
            setCurrentAddress(address);
        }
    }, [getAddressFromCoordinates, stopLocationTracking]);

    /**
     * Centre la carte sur l'itinéraire
     */
    const centerMapOnRoute = useCallback(() => {
        if (!startPoint) return;

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

        // Calculer le centre et le zoom pour inclure tous les points
        const lats = coordinates.map((c) => c.latitude);
        const lngs = coordinates.map((c) => c.longitude);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

        const latDelta = Math.max(...lats) - Math.min(...lats);
        const lngDelta = Math.max(...lngs) - Math.min(...lngs);
        const maxDelta = Math.max(latDelta, lngDelta);
        const zoom =
            maxDelta > 0
                ? Math.max(8, Math.min(15, 15 - Math.log2(maxDelta * 100)))
                : 13;

        setCameraCenter([centerLng, centerLat]);
        setCameraZoom(zoom);
    }, [startPoint, endPoint, passengerLocation]);

    /**
     * Initialise la localisation du passager et calcule l'itinéraire
     */
    useEffect(() => {
        const currentBookingId =
            booking.id ||
            booking.code ||
            `${booking.trip?.stationFrom?.city}-${booking.trip?.stationTo?.city}`;
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
     */
    useEffect(() => {
        if (startPoint) {
            setCameraCenter([startPoint.longitude, startPoint.latitude]);
            setCameraZoom(13);

            if (routePath.length > 0) {
                setTimeout(() => {
                    centerMapOnRoute();
                }, 500);
            }
        } else if (routePath.length > 0) {
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
                routePath[i],
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
    const calculateBearing = useCallback(
        (
            point1: { latitude: number; longitude: number },
            point2: { latitude: number; longitude: number },
        ): number => {
            const lat1 = (point1.latitude * Math.PI) / 180;
            const lat2 = (point2.latitude * Math.PI) / 180;
            const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

            const y = Math.sin(dLon) * Math.cos(lat2);
            const x =
                Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

            const bearing = Math.atan2(y, x);
            const bearingDegrees = (bearing * 180) / Math.PI;

            return (bearingDegrees + 360) % 360;
        },
        [],
    );

    /**
     * Calcule la position du bus le long de l'itinéraire en fonction de la progression
     * @param progression Progression entre 0 (départ) et 1 (arrivée)
     * @returns Coordonnées du bus et angle de rotation, ou null si l'itinéraire n'est pas disponible
     */
    const calculateBusPosition = useCallback(
        (
            progression: number,
        ): { latitude: number; longitude: number; rotation: number } | null => {
            if (routePath.length === 0) return null;

            if (
                routeDistancesRef.current.length === 0 ||
                routeDistancesRef.current.length !== routePath.length
            ) {
                calculateRouteDistances();
            }

            const clampedProgression = Math.max(0, Math.min(1, progression));

            const totalDistance =
                routeDistancesRef.current[routeDistancesRef.current.length - 1];
            if (totalDistance === 0 || routeDistancesRef.current.length < 2) {
                const exactIndex = clampedProgression * (routePath.length - 1);
                const currentIndex = Math.floor(exactIndex);
                const nextIndex = Math.min(currentIndex + 1, routePath.length - 1);
                const fraction = exactIndex - currentIndex;
                const currentPoint = routePath[currentIndex];
                const nextPoint = routePath[nextIndex];
                const rotation = calculateBearing(currentPoint, nextPoint);
                return {
                    latitude:
                        currentPoint.latitude +
                        (nextPoint.latitude - currentPoint.latitude) * fraction,
                    longitude:
                        currentPoint.longitude +
                        (nextPoint.longitude - currentPoint.longitude) * fraction,
                    rotation,
                };
            }

            const targetDistance = clampedProgression * totalDistance;

            let segmentIndex = 0;
            for (let i = 0; i < routeDistancesRef.current.length - 1; i++) {
                if (
                    targetDistance >= routeDistancesRef.current[i] &&
                    targetDistance <= routeDistancesRef.current[i + 1]
                ) {
                    segmentIndex = i;
                    break;
                }
            }

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

            const segmentStartDistance = routeDistancesRef.current[segmentIndex];
            const segmentEndDistance = routeDistancesRef.current[segmentIndex + 1];
            const segmentLength = segmentEndDistance - segmentStartDistance;
            const fraction =
                segmentLength > 0
                    ? (targetDistance - segmentStartDistance) / segmentLength
                    : 0;

            const currentPoint = routePath[segmentIndex];
            const nextPoint = routePath[segmentIndex + 1];

            const rotation = calculateBearing(currentPoint, nextPoint);

            return {
                latitude:
                    currentPoint.latitude +
                    (nextPoint.latitude - currentPoint.latitude) * fraction,
                longitude:
                    currentPoint.longitude +
                    (nextPoint.longitude - currentPoint.longitude) * fraction,
                rotation,
            };
        },
        [routePath, calculateRouteDistances, calculateBearing],
    );

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
     * Synchronise la position du bus depuis Socket.IO (temps réel).
     */
    useEffect(() => {
        if (!liveBusPosition) return;

        console.log("[TripRouteViewerMapbox] liveBusPosition reçue", liveBusPosition);
        setIsBusAnimationActive(false);
        setBusPosition({
            latitude: liveBusPosition.latitude,
            longitude: liveBusPosition.longitude,
        });
        setBusRotation(liveBusPosition.heading || 0);

        if (isFollowingBusRef.current) {
            setCameraCenter([liveBusPosition.longitude, liveBusPosition.latitude]);
            setCameraZoom(15);
        }
    }, [liveBusPosition]);

    /**
     * Gère l'animation du bus le long de l'itinéraire
     */
    useEffect(() => {
        if (!isBusAnimationActive || !routeDuration || routePath.length === 0) {
            return;
        }

        const totalDurationSeconds = routeDuration * 60;
        const updateInterval = 50;
        const progressIncrement = updateInterval / (totalDurationSeconds * 1000);

        let currentProgress = animationProgress;

        busAnimationIntervalRef.current = setInterval(() => {
            currentProgress = Math.min(currentProgress + progressIncrement, 1);

            const position = calculateBusPosition(currentProgress);
            if (position) {
                setBusPosition({
                    latitude: position.latitude,
                    longitude: position.longitude,
                });
                setBusRotation(position.rotation);
                setAnimationProgress(currentProgress);

                if (isFollowingBusRef.current) {
                    const now = Date.now();
                    if (now - lastCameraUpdateRef.current >= 200) {
                        setCameraCenter([position.longitude, position.latitude]);
                        setCameraZoom(15);
                        lastCameraUpdateRef.current = now;
                    }
                }
            }

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
    }, [
        isBusAnimationActive,
        routeDuration,
        routePath.length,
        calculateBusPosition,
        animationProgress,
    ]);

    /**
     * Initialise la position du bus au point de départ quand l'itinéraire est chargé
     */
    useEffect(() => {
        if (
            startPoint &&
            routePath.length > 0 &&
            !isBusAnimationActive &&
            !busPosition
        ) {
            setBusPosition(startPoint);
            setAnimationProgress(0);

            if (routePath.length > 1) {
                const initialRotation = calculateBearing(routePath[0], routePath[1]);
                setBusRotation(initialRotation);
            } else {
                setBusRotation(0);
            }
        }
    }, [
        startPoint,
        routePath,
        isBusAnimationActive,
        busPosition,
        calculateBearing,
    ]);

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
     * @returns La nouvelle position ou null en cas d'erreur
     */
    const refreshCurrentLocation =
        useCallback(async (): Promise<PassengerLocation | null> => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert(
                        "Permission refusée",
                        "L'accès à la localisation est nécessaire pour afficher votre position",
                    );
                    return null;
                }

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

                const address = await getAddressFromCoordinates(
                    location.coords.latitude,
                    location.coords.longitude,
                );
                setCurrentAddress(address);

                if (!isManualMode) {
                    initPassengerLocation();
                }

                return locationData;
            } catch (error) {
                console.error("Erreur lors de la récupération de la position:", error);
                return null;
            }
        }, [isManualMode, getAddressFromCoordinates, initPassengerLocation]);

    /**
     * Centre la carte sur la position de l'utilisateur
     */
    const centerOnMe = useCallback(async () => {
        let positionToUse = passengerLocation;

        if (isManualMode) {
            const updatedLocation = await refreshCurrentLocation();
            if (updatedLocation) {
                positionToUse = updatedLocation;
            }
        }

        if (positionToUse) {
            setCameraCenter([positionToUse.longitude, positionToUse.latitude]);
            setCameraZoom(15);
        }
    }, [passengerLocation, isManualMode, refreshCurrentLocation]);

    /**
     * Centre la carte sur le point de départ
     */
    const centerOnStartPoint = useCallback(() => {
        if (startPoint) {
            setCameraCenter([startPoint.longitude, startPoint.latitude]);
            setCameraZoom(15);
        }
    }, [startPoint]);

    /**
     * Centre la carte sur le point d'arrivée
     */
    const centerOnEndPoint = useCallback(() => {
        if (endPoint) {
            setCameraCenter([endPoint.longitude, endPoint.latitude]);
            setCameraZoom(15);
        }
    }, [endPoint]);

    /**
     * Gère la sélection manuelle d'une position sur la carte
     * @param coordinate Coordonnées de la position sélectionnée au format [longitude, latitude]
     */
    const handleMapPress = useCallback(
        async (coordinate: [number, number]) => {
            if (!isManualMode) return;

            stopLocationTracking();

            const locationData: PassengerLocation = {
                latitude: coordinate[1], // Mapbox utilise [lng, lat]
                longitude: coordinate[0],
                timestamp: new Date().toISOString(),
            };
            setPassengerLocation(locationData);

            const address = await getAddressFromCoordinates(
                coordinate[1],
                coordinate[0],
            );
            setCurrentAddress(address);
        },
        [isManualMode, getAddressFromCoordinates, stopLocationTracking],
    );

    /**
     * Bascule entre le mode géolocalisation automatique et le mode sélection manuelle
     */
    const toggleLocationMode = useCallback(() => {
        const newMode = !isManualMode;
        setIsManualMode(newMode);

        if (newMode) {
            stopLocationTracking();
        } else {
            refreshCurrentLocation();
        }
    }, [isManualMode, stopLocationTracking, refreshCurrentLocation]);

    /**
     * Démarre ou arrête l'animation du bus
     */
    const toggleBusAnimation = useCallback(() => {
        if (isBusAnimationActive) {
            setIsBusAnimationActive(false);
            setIsFollowingBus(false);
        } else {
            if (startPoint && routePath.length > 0 && routeDuration) {
                setAnimationProgress(0);
                setBusPosition(startPoint);

                if (routePath.length > 1) {
                    const initialRotation = calculateBearing(routePath[0], routePath[1]);
                    setBusRotation(initialRotation);
                } else {
                    setBusRotation(0);
                }

                lastCameraUpdateRef.current = 0;

                setIsBusAnimationActive(true);
            }
        }
    }, [
        isBusAnimationActive,
        startPoint,
        routePath,
        routeDuration,
        calculateBearing,
    ]);

    /**
     * Centre la carte sur la position du bus
     */
    const centerOnBus = useCallback(() => {
        if (busPosition) {
            setCameraCenter([busPosition.longitude, busPosition.latitude]);
            setCameraZoom(15);
        }
    }, [busPosition]);

    /**
     * Active ou désactive le suivi automatique du bus
     */
    const toggleFollowBus = useCallback(() => {
        const newFollowState = !isFollowingBus;
        setIsFollowingBus(newFollowState);
        isFollowingBusRef.current = newFollowState;

        if (newFollowState && busPosition) {
            setCameraCenter([busPosition.longitude, busPosition.latitude]);
            setCameraZoom(15);
            lastCameraUpdateRef.current = Date.now();
        }
    }, [isFollowingBus, busPosition]);

    /**
     * Réduit ou étend le panneau d'informations
     */
    const togglePanelCollapse = useCallback(() => {
        const newCollapsedState = !isPanelCollapsed;
        setIsPanelCollapsed(newCollapsedState);

        Animated.timing(panelHeightAnim, {
            toValue: newCollapsedState ? 0.2 : 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isPanelCollapsed, panelHeightAnim]);

    /**
     * Calcule la durée estimée du trajet
     * @returns La durée formatée (ex: "3h 00min") ou null si les données ne sont pas disponibles
     */
    const formattedDuration = useMemo((): string | null => {
        if (routeDuration !== null && routeDuration > 0) {
            const hours = Math.floor(routeDuration / 60);
            const minutes = Math.round(routeDuration % 60);

            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return `${minutes}min`;
            }
        }

        if (!booking.departureTime || !booking.arrivalTime) {
            return null;
        }

        try {
            const [departureHours, departureMinutes] = booking.departureTime
                .split(":")
                .map(Number);
            const [arrivalHours, arrivalMinutes] = booking.arrivalTime
                .split(":")
                .map(Number);

            const departureTotalMinutes = departureHours * 60 + departureMinutes;
            const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;

            let diffMinutes = arrivalTotalMinutes - departureTotalMinutes;
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60;
            }

            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return `${minutes}min`;
            }
        } catch (error) {
            console.error("Erreur calcul durée:", error);
            return null;
        }
    }, [routeDuration, booking.departureTime, booking.arrivalTime]);

    /**
     * Extrait un code de ville à partir du nom de la ville
     * @param cityName Nom de la ville
     * @returns Code de la ville (ex: "CPH" pour "Copenhagen")
     */
    const getCityCode = useCallback((cityName: string): string => {
        if (!cityName) return "";
        return cityName.substring(0, 3).toUpperCase();
    }, []);

    // Codes de ville mémorisés
    const startCityCode = useMemo(
        () => getCityCode(booking.trip?.stationFrom?.city || ""),
        [booking.trip?.stationFrom?.city, getCityCode],
    );
    const endCityCode = useMemo(
        () => getCityCode(booking.trip?.stationTo?.city || ""),
        [booking.trip?.stationTo?.city, getCityCode],
    );

    // Styles mémorisés
    const headerStyle = useMemo(
        () => [
            styles.header,
            { backgroundColor: "transparent", paddingTop: insets.top },
        ],
        [insets.top],
    );

    const headerButtonStyle = useMemo(
        () => [styles.headerButton, { backgroundColor: backgroundColor }],
        [backgroundColor],
    );

    const panelHeightInterpolation = useMemo(
        () =>
            panelHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["1.5%", "44%"],
            }),
        [panelHeightAnim],
    );

    const infoPanelStyle = useMemo(
        () => [
            styles.infoPanel,
            {
                backgroundColor: themeColors.panelBackground,
                maxHeight: panelHeightInterpolation,
            },
        ],
        [themeColors.panelBackground, panelHeightInterpolation],
    );

    const scrollViewContentStyle = useMemo(
        () => [
            styles.scrollViewContent,
            { paddingBottom: Math.max(20, insets.bottom) },
        ],
        [insets.bottom],
    );

    const busMarkerImageStyle = useMemo(
        () =>
            Platform.OS === "ios" ? styles.busMarkerImage : { width: 32, height: 32 },
        [],
    );

    // GeoJSON pour la polyline de l'itinéraire
    const routeGeoJSON = useMemo(() => {
        if (routePath.length === 0) return null;

        return {
            type: "FeatureCollection" as const,
            features: [
                {
                    type: "Feature" as const,
                    properties: {},
                    geometry: {
                        type: "LineString" as const,
                        coordinates: routePath.map((coord) => [
                            coord.longitude,
                            coord.latitude,
                        ]),
                    },
                },
            ],
        };
    }, [routePath]);

    // Callback mémorisé pour le retour en arrière
    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    /**
     * Retourne le composant de chargement
     */
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={COLORS.ACCENT} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                    {"Calcul de l'itinéraire..."}
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
                <Text style={[styles.errorText, { color: secondaryTextColor }]}>
                    {error}
                </Text>
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
            {/* Carte Mapbox */}
            <MapView
                ref={mapRef}
                style={styles.map}
                // styleURL={
                //   isDarkMode
                //     ? "mapbox://styles/mapbox/dark-v11"
                //     : "mapbox://styles/mapbox/standard-v11"
                // }
                onPress={(feature: any) => {
                    if (!isManualMode) return;

                    // Gérer différentes structures d'événement Mapbox
                    let coords: [number, number] | null = null;

                    if (feature.geometry && "coordinates" in feature.geometry) {
                        // Format GeoJSON: [longitude, latitude]
                        coords = feature.geometry.coordinates as [number, number];
                    } else if (feature.coordinates) {
                        // Format alternatif avec objet coordinates
                        if (
                            typeof feature.coordinates.longitude === "number" &&
                            typeof feature.coordinates.latitude === "number"
                        ) {
                            coords = [
                                feature.coordinates.longitude,
                                feature.coordinates.latitude,
                            ];
                        }
                    }

                    if (coords) {
                        handleMapPress(coords);
                    }
                }}
            >
                {/* Caméra pour contrôler la vue */}
                {cameraCenter && (
                    <Camera
                        ref={cameraRef}
                        centerCoordinate={cameraCenter}
                        zoomLevel={cameraZoom}
                        animationMode="flyTo"
                        animationDuration={500}
                    />
                )}

                {/* Itinéraire du trajet */}
                {routeGeoJSON && (
                    <ShapeSource id="routeSource" shape={routeGeoJSON}>
                        <LineLayer
                            id="routeLayer"
                            style={{
                                lineColor: COLORS.ACCENT,
                                lineWidth: 5,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    </ShapeSource>
                )}

                {/* Point de départ */}
                {isValidCoordinate(startPoint) && (
                    <MarkerView
                        id="start-point"
                        coordinate={toMapboxCoordinates(startPoint)}
                    >
                        <Image
                            source={flagStartImage}
                            style={styles.flagMarker}
                            resizeMode="contain"
                        />
                    </MarkerView>
                )}

                {/* Point d'arrivée */}
                {isValidCoordinate(endPoint) && (
                    <MarkerView id="end-point" coordinate={toMapboxCoordinates(endPoint)}>
                        <Image
                            source={flagEndImage}
                            style={styles.flagMarker}
                            resizeMode="contain"
                        />
                    </MarkerView>
                )}

                {/* Position du passager */}
                {isValidCoordinate(passengerLocation) && (
                    <MarkerView
                        id="passenger-location"
                        coordinate={toMapboxCoordinates(passengerLocation)}
                    >
                        <View style={styles.userLocationPinContainer}>
                            <Image
                                source={userLocationPinImage}
                                style={styles.userLocationPinMarker}
                                resizeMode="contain"
                            />
                        </View>
                    </MarkerView>
                )}

                {/* Position du bus */}
                {isValidCoordinate(busPosition) && (
                    <MarkerView
                        id="bus-marker"
                        coordinate={toMapboxCoordinates(busPosition)}
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
                    </MarkerView>
                )}
            </MapView>

            {/* En-tête de navigation */}
            <View style={headerStyle}>
                <TouchableOpacity style={headerButtonStyle} onPress={handleBackPress}>
                    <Ionicons name="arrow-back" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Boutons de contrôle */}
            <View style={styles.controlButtonsContainer}>
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        {
                            backgroundColor: isManualMode
                                ? COLORS.ACCENT
                                : themeColors.iconCircleBackground,
                        },
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
                                backgroundColor: isBusAnimationActive
                                    ? COLORS.ACCENT
                                    : themeColors.iconCircleBackground,
                            },
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
                                backgroundColor: isFollowingBus
                                    ? COLORS.ACCENT
                                    : themeColors.iconCircleBackground,
                            },
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
                        style={[
                            styles.controlButton,
                            { backgroundColor: themeColors.iconCircleBackground },
                        ]}
                        onPress={centerOnBus}
                    >
                        <Ionicons name="locate" size={20} color={textColor} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        { backgroundColor: themeColors.iconCircleBackground },
                    ]}
                    onPress={centerOnMe}
                >
                    <Ionicons name="person" size={20} color={textColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        { backgroundColor: themeColors.iconCircleBackground },
                    ]}
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
                    <View
                        style={[
                            styles.panelHandle,
                            {
                                backgroundColor: themeColors.border,
                                borderColor: themeColors.border,
                            },
                        ]}
                    />
                </TouchableOpacity>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={scrollViewContentStyle}
                    showsVerticalScrollIndicator={!isPanelCollapsed}
                >
                    {/* En-tête avec destination et durée */}
                    <View
                        style={[
                            styles.panelHeader,
                            { backgroundColor: themeColors.cardBackground },
                        ]}
                    >
                        <View
                            style={[
                                styles.headerContent,
                                styles.headerContentBorder,
                                {
                                    borderColor: themeColors.border,
                                    backgroundColor: themeColors.cardBackground,
                                },
                            ]}
                        >
                            {/* Section de départ */}
                            <View style={styles.headerColumn}>
                                <View
                                    style={[
                                        styles.cityCodeBadge,
                                        { backgroundColor: themeColors.badgeBackground },
                                    ]}
                                >
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {startCityCode}
                                    </Text>
                                </View>
                                <Text
                                    style={[styles.headerCityName, { color: textColor }]}
                                    numberOfLines={1}
                                >
                                    {booking.trip?.stationFrom?.city || ""}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Text
                                        style={[
                                            styles.headerTimezone,
                                            { color: secondaryTextColor },
                                        ]}
                                    >
                                        {booking.trip?.stationFrom?.name || ""}
                                    </Text>
                                </View>
                            </View>

                            {/* Icône de bus au centre */}
                            <View style={styles.headerCenterSection}>
                                <View
                                    style={[
                                        styles.headerIconContainer,
                                        { backgroundColor: COLORS.ACCENT },
                                    ]}
                                >
                                    <Ionicons name="bus-outline" size={20} color={COLORS.WHITE} />
                                </View>
                                <View
                                    style={[
                                        styles.headerConnectorLine,
                                        { backgroundColor: themeColors.border },
                                    ]}
                                />
                            </View>

                            {/* Section d'arrivée */}
                            <View style={styles.headerColumn}>
                                <View
                                    style={[
                                        styles.cityCodeBadge,
                                        { backgroundColor: themeColors.badgeBackground },
                                    ]}
                                >
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {endCityCode}
                                    </Text>
                                </View>
                                <Text
                                    style={[styles.headerCityName, { color: textColor }]}
                                    numberOfLines={1}
                                >
                                    {booking.trip?.stationTo?.city || ""}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Text
                                        style={[
                                            styles.headerTimezone,
                                            { color: secondaryTextColor },
                                        ]}
                                    >
                                        {booking.trip?.stationTo?.name || ""}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* Durée du trajet */}
                        {formattedDuration && booking.arrivalTime && (
                            <View
                                style={[
                                    styles.durationBadge,
                                    {
                                        backgroundColor: COLORS.ACCENT,
                                        borderColor: COLORS.ACCENT,
                                    },
                                ]}
                            >
                                <Ionicons name="time" size={18} color={COLORS.WHITE} />
                                <Text style={[styles.headerDuration, { color: COLORS.WHITE }]}>
                                    Durée estimée du trajet : {formattedDuration}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Indicateur de mode sélection manuelle */}
                    {isManualMode && !isPanelCollapsed && (
                        <View
                            style={[
                                styles.modeIndicator,
                                {
                                    backgroundColor: COLORS.ACCENT_LIGHT,
                                    borderColor: COLORS.ACCENT,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.modeIndicatorIconContainer,
                                    { backgroundColor: COLORS.ACCENT },
                                ]}
                            >
                                <Ionicons
                                    name="hand-left-outline"
                                    size={16}
                                    color={COLORS.WHITE}
                                />
                            </View>
                            <View style={styles.modeIndicatorTextContainer}>
                                <Text
                                    style={[styles.modeIndicatorTitle, { color: COLORS.ACCENT }]}
                                >
                                    Mode sélection manuelle
                                </Text>
                                <Text
                                    style={[styles.modeIndicatorText, { color: COLORS.ACCENT }]}
                                >
                                    Appuyez sur la carte pour choisir votre position
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Liste des étapes */}
                    {!isPanelCollapsed && (
                        <View style={styles.stepsContainer}>
                            {/* Position actuelle */}
                            <View style={styles.stepItem}>
                                <View style={styles.stepLeft}>
                                    <TouchableOpacity onPress={centerOnMe} activeOpacity={0.7}>
                                        <View
                                            style={[
                                                styles.stepIconContainer,
                                                { backgroundColor: COLORS.ACCENT },
                                            ]}
                                        >
                                            <Ionicons name="locate" size={16} color={COLORS.WHITE} />
                                        </View>
                                    </TouchableOpacity>
                                    <View
                                        style={[
                                            styles.stepLine,
                                            { backgroundColor: themeColors.border },
                                        ]}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.stepCard,
                                        styles.stepCardRow,
                                        { backgroundColor: themeColors.listItemBackground },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={centerOnMe}
                                >
                                    <View style={{ width: "90%" }}>
                                        <View style={styles.stepCardHeader}>
                                            <Text
                                                style={[styles.stepMainText, { color: textColor }]}
                                                numberOfLines={2}
                                            >
                                                Position actuelle
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.stepSubText,
                                                { color: secondaryTextColor },
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {currentAddress}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={secondaryTextColor}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Ville de départ */}
                            <View style={styles.stepItem}>
                                <View style={styles.stepLeft}>
                                    <TouchableOpacity
                                        onPress={centerOnStartPoint}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.stepIconContainer,
                                                { backgroundColor: COLORS.START_MARKER },
                                            ]}
                                        >
                                            <Ionicons
                                                name="bus-outline"
                                                size={16}
                                                color={COLORS.WHITE}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    <View
                                        style={[
                                            styles.stepLine,
                                            { backgroundColor: themeColors.border },
                                        ]}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.stepCard,
                                        styles.stepCardRow,
                                        { backgroundColor: themeColors.listItemBackground },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={centerOnStartPoint}
                                >
                                    <View style={{ width: "90%" }}>
                                        <View style={styles.stepCardHeader}>
                                            <Text
                                                style={[styles.stepMainText, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                Ville de départ
                                            </Text>
                                        </View>
                                        <View style={styles.stepCardDetails}>
                                            <Ionicons
                                                name="location"
                                                size={12}
                                                color={secondaryTextColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.stepSubText,
                                                    { color: secondaryTextColor },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {booking.trip.stationFrom.city}
                                            </Text>
                                        </View>
                                        <View style={styles.stepCardDetails}>
                                            <Ionicons
                                                name="time-outline"
                                                size={12}
                                                color={secondaryTextColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.stepSubText,
                                                    { color: secondaryTextColor },
                                                ]}
                                            >
                                                Départ prévu à {booking.departureTime}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={secondaryTextColor}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Ville d'arrivée */}
                            <View style={styles.stepItem}>
                                <View style={styles.stepLeft}>
                                    <TouchableOpacity
                                        onPress={centerOnEndPoint}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.stepIconContainer,
                                                { backgroundColor: COLORS.END_MARKER },
                                            ]}
                                        >
                                            <Ionicons
                                                name="stop-outline"
                                                size={16}
                                                color={COLORS.WHITE}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.stepCard,
                                        styles.stepCardRow,
                                        { backgroundColor: themeColors.listItemBackground },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={centerOnEndPoint}
                                >
                                    <View style={{ width: "90%" }}>
                                        <View style={styles.stepCardHeader}>
                                            <Text
                                                style={[styles.stepMainText, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                {"Ville d'arrivée"}
                                            </Text>
                                        </View>
                                        <View style={styles.stepCardDetails}>
                                            <Ionicons
                                                name="location"
                                                size={12}
                                                color={secondaryTextColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.stepSubText,
                                                    { color: secondaryTextColor },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {booking.trip.stationTo.city}
                                            </Text>
                                        </View>
                                        <View style={styles.stepCardDetails}>
                                            <Ionicons
                                                name="time-outline"
                                                size={12}
                                                color={secondaryTextColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.stepSubText,
                                                    { color: secondaryTextColor },
                                                ]}
                                            >
                                                Arrivée prévue à {booking.arrivalTime}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={secondaryTextColor}
                                    />
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
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    headerRightButtons: {
        flexDirection: "row",
        alignItems: "center",
    },
    controlButtonsContainer: {
        position: "absolute",
        bottom: "46%",
        right: 20,
        flexDirection: "column",
        gap: 12,
        zIndex: 10,
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    flagMarker: {
        width: 64,
        height: 64,
    },
    userLocationPinContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    userLocationPinMarker: {
        width: 32,
        height: 32,
    },
    busMarkerContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    busMarkerImage: {
        width: 56,
        height: 56,
    },
    infoPanel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 20,
        paddingBottom: 20,
        maxHeight: "45%",
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
        width: "100%",
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    panelHandle: {
        width: 30,
        height: 6,
        alignSelf: "center",
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 1.5,
        marginTop: 0,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
        alignItems: "center",
    },
    cityCodeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 8,
    },
    headerCityCode: {
        fontSize: 20,
        fontFamily: "Ubuntu_Bold",
        textAlign: "center",
        letterSpacing: 1,
    },
    headerCityName: {
        fontSize: 13,
        fontFamily: "Ubuntu_Medium",
        marginBottom: 6,
        textAlign: "center",
    },
    timezoneContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    headerTimezone: {
        fontSize: 11,
        fontFamily: "Ubuntu_Regular",
        textAlign: "center",
    },
    headerCenterSection: {
        alignItems: "center",
        marginHorizontal: 12,
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerConnectorLine: {
        width: 2,
        height: 30,
        marginTop: 8,
        opacity: 0.4,
    },
    durationBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 1.5,
        gap: 8,
    },
    headerDuration: {
        fontSize: 13,
        fontFamily: "Ubuntu_Medium",
        textAlign: "center",
    },
    modeIndicator: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        marginBottom: 16,
        marginHorizontal: 15,
        borderWidth: 1.5,
        gap: 12,
    },
    modeIndicatorIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    modeIndicatorTextContainer: {
        flex: 1,
    },
    modeIndicatorTitle: {
        fontSize: 13,
        fontFamily: "Ubuntu_Bold",
        marginBottom: 2,
    },
    modeIndicatorText: {
        fontSize: 12,
        fontFamily: "Ubuntu_Regular",
        opacity: 0.9,
    },
    stepsContainer: {
        paddingHorizontal: 15,
        gap: 16,
        marginTop: 30,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    stepLeft: {
        alignItems: "center",
        marginRight: 14,
        width: 36,
    },
    stepIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
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
        justifyContent: "center",
    },
    stepCardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    stepCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    stepMainText: {
        fontSize: 15,
        fontFamily: "Ubuntu_Bold",
        flex: 1,
    },
    stepCardDetails: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    stepSubText: {
        fontSize: 12,
        fontFamily: "Ubuntu_Regular",
        flex: 1,
    },
});
