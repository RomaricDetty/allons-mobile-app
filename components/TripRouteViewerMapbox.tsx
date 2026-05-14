// @ts-nocheck
import { ControlButtons } from "@/components/trip-route-viewer-mapbox/ControlButtons";
import { InfoPanel } from "@/components/trip-route-viewer-mapbox/InfoPanel";
import { MapScene } from "@/components/trip-route-viewer-mapbox/MapScene";
import { resolveMapboxAccessToken } from "@/constants/mapbox";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useBusTracking } from "@/hooks/useBusTracking";
import { Booking } from "@/interfaces";
import { geocodingService } from "@/services/geocodingService";
import { routingService } from "@/services/routingService";
import { PassengerLocation } from "@/types/tracking";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
    Camera,
    MapView,
} from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ElementRef,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    InteractionManager,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
    ROUTE_BLUE: "#2196F3",
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

/**
 * Calcule les coins nord-est et sud-ouest Mapbox ([lng, lat]) pour englober tous les points du tracé.
 */
function computeLngLatBoundsFromRoute(
    points: { latitude: number; longitude: number }[],
): { ne: [number, number]; sw: [number, number] } | null {
    if (!points.length) return null;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of points) {
        const { latitude: lat, longitude: lng } = p;
        if (
            typeof lat !== "number" ||
            typeof lng !== "number" ||
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {
            continue;
        }
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
    }
    if (!Number.isFinite(minLat)) return null;

    const latSpan = Math.max(maxLat - minLat, 1e-5);
    const lngSpan = Math.max(maxLng - minLng, 1e-5);
    const latMargin = Math.max(latSpan * 0.02, 0.004);
    const lngMargin = Math.max(lngSpan * 0.02, 0.004);

    return {
        ne: [maxLng + lngMargin, maxLat + latMargin],
        sw: [minLng - lngMargin, minLat - latMargin],
    };
}

// Optimisation suivi temps réel (mode équilibré)
const LIVE_UPDATE_INTERVAL_MS = 2500;
const CAMERA_UPDATE_INTERVAL_MS = 900;
const MIN_BUS_MOVE_KM = 0.02; // 20m
const MIN_HEADING_DELTA_DEG = 3;
const SIM_UPDATE_INTERVAL_MS = 220;
const SIM_MIN_DURATION_SECONDS = 180; // 3 min
const SIM_MAX_DURATION_SECONDS = 600; // 10 min
const POSITION_SMOOTHING_ALPHA = 0.28;
const ROTATION_SMOOTHING_ALPHA = 0.22;
const PANEL_EXPANDED_VALUE = 1;
const PANEL_COLLAPSED_VALUE = 0.2;
const PANEL_SWIPE_THRESHOLD = 24;

/** Espace vertical entre le bas des boutons carte et le haut du contenu du panneau. */
const CONTROL_BUTTONS_GAP_ABOVE_PANEL = 10;

interface TripRouteViewerMapboxProps {
    booking: Booking;
}

Mapbox.setAccessToken(resolveMapboxAccessToken());

/**
 * Composant pour afficher l'itinéraire d'un trajet sur une carte Mapbox
 * Affiche la carte, la géolocalisation de l'utilisateur et l'itinéraire du trajet
 */
export default function TripRouteViewerMapbox({
    booking,
}: TripRouteViewerMapboxProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? "light";
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

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
    const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
    const [busPosition, setBusPosition] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [busRotation, setBusRotation] = useState<number>(0);
    const [isBusAnimationActive, setIsBusAnimationActive] =
        useState<boolean>(false);
    const [isFollowingBus, setIsFollowingBus] = useState<boolean>(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

    const panelHeightAnim = useRef(new Animated.Value(1)).current;

    const mapRef = useRef<MapView>(null);
    const cameraRef = useRef<ElementRef<typeof Camera> | null>(null);
    const animationProgressRef = useRef(0);
    const locationSubscription = useRef<Location.LocationSubscription | null>(
        null,
    );
    const isManualModeRef = useRef<boolean>(false);
    const busAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const routeDistancesRef = useRef<number[]>([]);
    const addressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const bookingIdRef = useRef<string | number | null>(null);
    const isFollowingBusRef = useRef<boolean>(false);
    const pendingLivePositionRef = useRef<{
        latitude: number;
        longitude: number;
        heading?: number;
    } | null>(null);
    const liveFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastAppliedLiveRef = useRef<{
        latitude: number;
        longitude: number;
        heading?: number;
    } | null>(null);
    const hasLiveSocketUpdateRef = useRef<boolean>(false);
    const smoothedRotationRef = useRef<number>(0);
    const cameraStateRef = useRef<{
        center: [number, number] | null;
        zoom: number;
        lastUpdateAt: number;
    }>({
        center: null,
        zoom: 13,
        lastUpdateAt: 0,
    });

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

    const { busPosition: liveBusPosition, hasRealtimeData } = useBusTracking(
        trackingTripId,
        trackingBookingId,
        trackingBusId,
    );

    useEffect(() => {
        if (__DEV__) {
            console.log("[TripRouteViewerMapbox] ids tracking", {
                trackingTripId,
                trackingBookingId,
                trackingBusId,
            });
        }
    }, [trackingTripId, trackingBookingId, trackingBusId]);

    /**
     * Compare deux headings en tenant compte de la boucle 360°.
     */
    const getHeadingDelta = useCallback((prev?: number, next?: number) => {
        if (typeof prev !== "number" || typeof next !== "number") return 999;
        const raw = Math.abs(prev - next) % 360;
        return raw > 180 ? 360 - raw : raw;
    }, []);

    /**
     * Lisse la rotation (angle) en prenant la plus petite différence angulaire.
     */
    const smoothAngle = useCallback((from: number, to: number, alpha: number) => {
        const delta = ((((to - from) % 360) + 540) % 360) - 180;
        const next = from + delta * alpha;
        return (next + 360) % 360;
    }, []);

    /**
     * Met à jour la caméra avec throttling pour éviter les re-renders excessifs.
     */
    const updateCamera = useCallback(
        (center: [number, number], zoom: number, force = false) => {
            const now = Date.now();
            const previous = cameraStateRef.current;

            if (!force && now - previous.lastUpdateAt < CAMERA_UPDATE_INTERVAL_MS) {
                return;
            }

            if (previous.center && !force) {
                const movedKm = routingService.calculateDistance(
                    { latitude: previous.center[1], longitude: previous.center[0] },
                    { latitude: center[1], longitude: center[0] },
                );
                const zoomDelta = Math.abs(previous.zoom - zoom);
                if (movedKm < MIN_BUS_MOVE_KM && zoomDelta < 0.05) {
                    return;
                }
            }

            cameraStateRef.current = {
                center,
                zoom,
                lastUpdateAt: now,
            };

            cameraRef.current?.setCamera({
                centerCoordinate: center,
                zoomLevel: zoom,
                animationDuration: force ? 520 : 400,
                animationMode: force ? "flyTo" : "easeTo",
            });
        },
        [],
    );

    // Couleurs du thème mémorisées
    const backgroundColor = useThemeColor({}, "background");
    const textColor = useThemeColor({}, "text");
    const secondaryTextColor = useThemeColor({}, "secondaryText");

    const themeColors = useMemo(
        () => ({
            cardBackground:
                colorScheme === "dark" ? COLORS.DARK_CARD : COLORS.LIGHT_CARD,
            border: colorScheme === "dark" ? COLORS.DARK_BORDER : COLORS.LIGHT_BORDER,
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

            await new Promise<void>((resolve) => {
                InteractionManager.runAfterInteractions(() => resolve());
            });

            const routeDetails = await routingService.getRouteWithDetails(
                startCoords,
                endCoords,
            );
            setRoutePath(routeDetails.coordinates);
            setRouteDuration(routeDetails.duration);
            setRouteDistanceKm(routeDetails.distance);
        } catch {
            setError("Impossible de calculer l'itinéraire");
            if (isValidCoordinate(startCoords) && isValidCoordinate(endCoords)) {
                setRoutePath([startCoords, endCoords]);
                setRouteDuration(null);
                setRouteDistanceKm(null);
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
     * Cadre toute la polyline sur l’écran via Mapbox fitBounds (marges pour en-tête, boutons à droite, panneau bas).
     */
    const centerMapOnRoute = useCallback(() => {
        const coords =
            routePath.length >= 2
                ? routePath
                : startPoint && endPoint
                  ? [startPoint, endPoint]
                  : startPoint
                    ? [startPoint]
                    : endPoint
                      ? [endPoint]
                      : [];

        if (coords.length === 0) return;

        const bounds = computeLngLatBoundsFromRoute(coords);
        if (!bounds) return;

        const padTop = Math.round(insets.top + 54);
        const padRight = 62;
        const padBottom = Math.round(
            windowHeight * 0.44 + Math.max(insets.bottom, 10),
        );
        const padLeft = 18;

        cameraRef.current?.fitBounds(
            bounds.ne,
            bounds.sw,
            [padTop, padRight, padBottom, padLeft],
            650,
        );

        const cx = (bounds.ne[0] + bounds.sw[0]) / 2;
        const cy = (bounds.ne[1] + bounds.sw[1]) / 2;
        const span = Math.max(
            Math.abs(bounds.ne[1] - bounds.sw[1]),
            Math.abs(bounds.ne[0] - bounds.sw[0]),
        );
        const approxZoom =
            span > 1e-6 ? Math.max(2.5, Math.min(18, 9 - Math.log2(span * 85))) : 10;
        cameraStateRef.current = {
            center: [cx, cy],
            zoom: approxZoom,
            lastUpdateAt: Date.now(),
        };
    }, [routePath, startPoint, endPoint, windowHeight, insets.top, insets.bottom]);

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
     * Cadre l’itinéraire complet une fois le tracé disponible (sans zoom fixe sur le départ seul).
     */
    useEffect(() => {
        const hasGeometry =
            routePath.length >= 2 || (startPoint && endPoint);
        if (!hasGeometry) return;

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const interactionHandle = InteractionManager.runAfterInteractions(() => {
            timeoutId = setTimeout(() => {
                centerMapOnRoute();
            }, 280);
        });

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            interactionHandle.cancel?.();
        };
    }, [routePath, startPoint, endPoint, centerMapOnRoute]);

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
        if (!liveBusPosition || !hasRealtimeData) return;
        if (__DEV__) {
            console.log("[TripRouteViewerMapbox] liveBusPosition reçue", liveBusPosition);
        }
        hasLiveSocketUpdateRef.current = true;
        pendingLivePositionRef.current = {
            latitude: liveBusPosition.latitude,
            longitude: liveBusPosition.longitude,
            heading: liveBusPosition.heading || 0,
        };
        setIsBusAnimationActive(false);
    }, [liveBusPosition, hasRealtimeData]);

    /**
     * Flush des updates live toutes les 2.5s (mode équilibré).
     */
    useEffect(() => {
        liveFlushIntervalRef.current = setInterval(() => {
            const pending = pendingLivePositionRef.current;
            if (!pending) return;

            const previous = lastAppliedLiveRef.current;
            const movedKm = previous
                ? routingService.calculateDistance(
                      { latitude: previous.latitude, longitude: previous.longitude },
                      { latitude: pending.latitude, longitude: pending.longitude },
                  )
                : 999;
            const headingDelta = getHeadingDelta(previous?.heading, pending.heading);
            const shouldApply = movedKm >= MIN_BUS_MOVE_KM || headingDelta >= MIN_HEADING_DELTA_DEG;

            if (!shouldApply) return;

            pendingLivePositionRef.current = null;
            lastAppliedLiveRef.current = pending;
            setBusPosition({
                latitude: pending.latitude,
                longitude: pending.longitude,
            });
            const currentRotation = smoothedRotationRef.current || 0;
            const nextRotation = smoothAngle(
                currentRotation,
                pending.heading || 0,
                ROTATION_SMOOTHING_ALPHA,
            );
            smoothedRotationRef.current = nextRotation;
            setBusRotation(nextRotation);

            if (isFollowingBusRef.current) {
                updateCamera([pending.longitude, pending.latitude], 15);
            }
        }, LIVE_UPDATE_INTERVAL_MS);

        return () => {
            if (liveFlushIntervalRef.current) {
                clearInterval(liveFlushIntervalRef.current);
                liveFlushIntervalRef.current = null;
            }
        };
    }, [getHeadingDelta, updateCamera, smoothAngle]);

    /**
     * Gère l'animation du bus le long de l'itinéraire
     */
    useEffect(() => {
        if (
            !isBusAnimationActive ||
            hasLiveSocketUpdateRef.current ||
            !routeDuration ||
            routePath.length === 0
        ) {
            return;
        }

        const totalDurationSeconds = Math.max(
            SIM_MIN_DURATION_SECONDS,
            Math.min(SIM_MAX_DURATION_SECONDS, routeDuration * 60),
        );
        const updateInterval = SIM_UPDATE_INTERVAL_MS;
        const progressIncrement = updateInterval / (totalDurationSeconds * 1000);

        let currentProgress = animationProgressRef.current;

        busAnimationIntervalRef.current = setInterval(() => {
            currentProgress = Math.min(currentProgress + progressIncrement, 1);
            animationProgressRef.current = currentProgress;

            const position = calculateBusPosition(currentProgress);
            if (position) {
                setBusPosition((prev) => {
                    if (!prev) {
                        return {
                            latitude: position.latitude,
                            longitude: position.longitude,
                        };
                    }
                    return {
                        latitude:
                            prev.latitude +
                            (position.latitude - prev.latitude) * POSITION_SMOOTHING_ALPHA,
                        longitude:
                            prev.longitude +
                            (position.longitude - prev.longitude) * POSITION_SMOOTHING_ALPHA,
                    };
                });

                const currentRotation = smoothedRotationRef.current || position.rotation;
                const nextRotation = smoothAngle(
                    currentRotation,
                    position.rotation,
                    ROTATION_SMOOTHING_ALPHA,
                );
                smoothedRotationRef.current = nextRotation;
                setBusRotation(nextRotation);

                if (isFollowingBusRef.current) {
                    updateCamera([position.longitude, position.latitude], 15);
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
        updateCamera,
        smoothAngle,
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
            animationProgressRef.current = 0;

            if (routePath.length > 1) {
                const initialRotation = calculateBearing(routePath[0], routePath[1]);
                smoothedRotationRef.current = initialRotation;
                setBusRotation(initialRotation);
            } else {
                smoothedRotationRef.current = 0;
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
            if (liveFlushIntervalRef.current) {
                clearInterval(liveFlushIntervalRef.current);
                liveFlushIntervalRef.current = null;
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
            updateCamera([positionToUse.longitude, positionToUse.latitude], 15, true);
        }
    }, [passengerLocation, isManualMode, refreshCurrentLocation, updateCamera]);

    /**
     * Centre la carte sur le point de départ
     */
    const centerOnStartPoint = useCallback(() => {
        if (startPoint) {
            updateCamera([startPoint.longitude, startPoint.latitude], 15, true);
        }
    }, [startPoint, updateCamera]);

    /**
     * Centre la carte sur le point d'arrivée
     */
    const centerOnEndPoint = useCallback(() => {
        if (endPoint) {
            updateCamera([endPoint.longitude, endPoint.latitude], 15, true);
        }
    }, [endPoint, updateCamera]);

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
     * Centre la carte sur la position du bus
     */
    const centerOnBus = useCallback(() => {
        if (busPosition) {
            updateCamera([busPosition.longitude, busPosition.latitude], 15, true);
        }
    }, [busPosition, updateCamera]);

    /**
     * Active ou désactive le suivi automatique du bus
     */
    const toggleFollowBus = useCallback(() => {
        const newFollowState = !isFollowingBus;
        setIsFollowingBus(newFollowState);
        isFollowingBusRef.current = newFollowState;

        if (newFollowState && busPosition) {
            updateCamera([busPosition.longitude, busPosition.latitude], 15, true);
        }
    }, [isFollowingBus, busPosition, updateCamera]);

    /**
     * Réduit ou étend le panneau d'informations
     */
    const animateInfoPanel = useCallback(
        (collapsed: boolean) => {
            setIsPanelCollapsed(collapsed);
            Animated.timing(panelHeightAnim, {
                toValue: collapsed ? PANEL_COLLAPSED_VALUE : PANEL_EXPANDED_VALUE,
                duration: 300,
                useNativeDriver: false,
            }).start();
        },
        [panelHeightAnim],
    );

    /**
     * Bascule l'état du panneau via un appui sur la poignée.
     */
    const togglePanelCollapse = useCallback(() => {
        animateInfoPanel(!isPanelCollapsed);
    }, [animateInfoPanel, isPanelCollapsed]);

    /**
     * Applique l'action afficher/masquer selon le swipe vertical.
     */
    const handlePanelSwipeRelease = useCallback(
        (deltaY: number) => {
            if (deltaY > PANEL_SWIPE_THRESHOLD && !isPanelCollapsed) {
                animateInfoPanel(true);
                return;
            }
            if (deltaY < -PANEL_SWIPE_THRESHOLD && isPanelCollapsed) {
                animateInfoPanel(false);
            }
        },
        [animateInfoPanel, isPanelCollapsed],
    );

    /**
     * Configure le pan gesture de la poignée du panneau.
     */
    const panelPanResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gestureState) =>
                    Math.abs(gestureState.dy) > 6 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderRelease: (_, gestureState) => {
                    handlePanelSwipeRelease(gestureState.dy);
                },
                onPanResponderTerminate: (_, gestureState) => {
                    handlePanelSwipeRelease(gestureState.dy);
                },
            }),
        [handlePanelSwipeRelease],
    );

    /** GeoJSON Mapbox pour la polyline d'itinéraire (couleur carte = ACCENT). */
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

    /** Ville affichée sous le nom de la gare de départ. */
    const startDetailLine = useMemo(() => {
        const city = booking.trip?.stationFrom?.city?.trim();
        return city && city.length > 0 ? city : "—";
    }, [booking.trip?.stationFrom?.city]);

    /** Ville affichée sous le nom de la gare d'arrivée. */
    const endDetailLine = useMemo(() => {
        const city = booking.trip?.stationTo?.city?.trim();
        return city && city.length > 0 ? city : "—";
    }, [booking.trip?.stationTo?.city]);

    /**
     * Minutes restantes avant l'heure d'arrivée affichée (même jour que le départ, +1 jour si passage minuit).
     */
    const minutesUntilArrival = useMemo(() => {
        if (!booking.arrivalTime || !booking.departureTime || !booking.departureDateTime) {
            return null;
        }
        try {
            const dep = new Date(booking.departureDateTime);
            if (Number.isNaN(dep.getTime())) return null;

            const [ah, am] = booking.arrivalTime.split(":").map(Number);
            const [dh, dm] = booking.departureTime.split(":").map(Number);
            if (![ah, am, dh, dm].every((x) => Number.isFinite(x))) return null;

            const arr = new Date(
                dep.getFullYear(),
                dep.getMonth(),
                dep.getDate(),
                ah,
                am,
                0,
                0,
            );
            const depClock = dh * 60 + dm;
            const arrClock = ah * 60 + am;
            if (arrClock < depClock) {
                arr.setDate(arr.getDate() + 1);
            }

            const diffMin = Math.round((arr.getTime() - Date.now()) / 60000);
            return Number.isFinite(diffMin) ? diffMin : null;
        } catch {
            return null;
        }
    }, [booking.arrivalTime, booking.departureTime, booking.departureDateTime]);

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
                backgroundColor: "transparent",
                maxHeight: panelHeightInterpolation,
            },
        ],
        [panelHeightInterpolation],
    );

    /** Contenu du panneau (cartes) sans scroll : padding safe area + espacement entre cartes. */
    const scrollViewContentStyle = useMemo(
        () => [
            styles.infoPanelBody,
            { paddingBottom: Math.max(10, insets.bottom) },
        ],
        [insets.bottom],
    );

    const busMarkerImageStyle = useMemo(
        () =>
            Platform.OS === "ios" ? styles.busMarkerImage : { width: 32, height: 32 },
        [],
    );

    /** Centre [lng, lat] pour l’initialisation du Camera Mapbox. */
    const defaultCameraCenter = useMemo<[number, number]>(() => {
        if (startPoint) {
            return [startPoint.longitude, startPoint.latitude];
        }
        return [-4.00351, 5.33542];
    }, [startPoint]);

    const defaultCameraZoom = 13;

    /**
     * Position des boutons carte : juste au-dessus du panneau (hauteur estimée du contenu, pas un % d’écran).
     */
    const controlButtonsContainerStyle = useMemo(() => {
        const safe = Math.max(insets.bottom, 10);
        const handleBlock = 8 + 44;
        const tripCardApprox = 198;
        const betweenCards = 8;
        const myPositionRow = isPanelCollapsed ? 0 : 94;
        const manualRow = !isPanelCollapsed && isManualMode ? 92 : 0;
        const bodyPadding = 12;

        const panelApprox =
            handleBlock +
            tripCardApprox +
            betweenCards +
            myPositionRow +
            manualRow +
            safe +
            bodyPadding;

        return {
            bottom:
                Math.round(panelApprox + CONTROL_BUTTONS_GAP_ABOVE_PANEL),
        };
    }, [isPanelCollapsed, isManualMode, insets.bottom]);

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
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['bottom']}>
            <MapScene
                key={`map-${String(booking?.id ?? "")}-${trackingTripId}`}
                mapRef={mapRef}
                cameraRef={cameraRef}
                defaultCameraCenter={defaultCameraCenter}
                defaultCameraZoom={defaultCameraZoom}
                styles={styles}
                isManualMode={isManualMode}
                handleMapPress={handleMapPress}
                routeGeoJSON={routeGeoJSON}
                isValidCoordinate={isValidCoordinate}
                startPoint={startPoint}
                endPoint={endPoint}
                passengerLocation={passengerLocation}
                busPosition={busPosition}
                busRotation={busRotation}
                busMarkerImageStyle={busMarkerImageStyle}
                toMapboxCoordinates={toMapboxCoordinates}
                colors={{
                    ...COLORS,
                    busImage,
                    flagStartImage,
                    flagEndImage,
                    userLocationPinImage,
                }}
            />

            {/* En-tête de navigation */}
            <View style={headerStyle}>
                <TouchableOpacity
                    style={headerButtonStyle}
                    onPress={handleBackPress}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Retour"
                >
                    <Ionicons name="arrow-back" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            <ControlButtons
                styles={styles}
                containerStyle={controlButtonsContainerStyle}
                themeColors={themeColors}
                isManualMode={isManualMode}
                toggleLocationMode={toggleLocationMode}
                textColor={textColor}
                busPosition={busPosition}
                isFollowingBus={isFollowingBus}
                toggleFollowBus={toggleFollowBus}
                centerOnBus={centerOnBus}
                centerOnMe={centerOnMe}
                centerMapOnRoute={centerMapOnRoute}
                colors={COLORS}
            />

            <InfoPanel
                infoPanelStyle={infoPanelStyle}
                styles={styles}
                togglePanelCollapse={togglePanelCollapse}
                panelHandlePanHandlers={panelPanResponder.panHandlers}
                themeColors={themeColors}
                scrollViewContentStyle={scrollViewContentStyle}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
                booking={booking}
                isManualMode={isManualMode}
                isPanelCollapsed={isPanelCollapsed}
                centerOnMe={centerOnMe}
                centerOnStartPoint={centerOnStartPoint}
                centerOnEndPoint={centerOnEndPoint}
                currentAddress={currentAddress}
                colors={COLORS}
                startDetailLine={startDetailLine}
                endDetailLine={endDetailLine}
                minutesUntilArrival={minutesUntilArrival}
                routeDistanceKm={routeDistanceKm}
            />
        </SafeAreaView>
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
    designCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        elevation: 0,
    },
    designCardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    designTimeline: {
        flex: 1,
        marginRight: 8,
    },
    designTimelineBlock: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    designRingGreen: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 3,
        borderColor: "#4CAF50",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    designRingGreenInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4CAF50",
    },
    designRingBlue: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 3,
        borderColor: "#ff0000",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    designRingBlueInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ff0000",
    },
    designTimelineText: {
        flex: 1,
        paddingRight: 4,
    },
    designPlaceTitle: {
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 18,
    },
    designPlaceSub: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    designTimelineConnector: {
        width: 2,
        height: 16,
        borderRadius: 1,
        backgroundColor: "#BDBDBD",
        marginLeft: 10,
        marginVertical: 2,
        opacity: 0.75,
    },
    designTimeColumn: {
        alignItems: "flex-end",
        justifyContent: "flex-start",
        minWidth: 72,
        paddingTop: 4,
    },
    designTimeLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    designTimeValue: {
        fontSize: 40,
        fontWeight: "800",
        lineHeight: 44,
    },
    designTimeUnit: {
        fontSize: 16,
        fontWeight: "700",
    },
    designFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 2,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    designFooterLabel: {
        fontSize: 12,
    },
    designFooterValue: {
        fontSize: 16,
        fontWeight: "700",
        marginTop: 2,
    },
    designFooterSchedule: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        gap: 6,
    },
    designFooterDots: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 2,
    },
    designFooterDot: {
        width: 3,
        height: 3,
        borderRadius: 2,
    },
    designFooterTime: {
        fontSize: 13,
        fontWeight: "600",
    },
    designSecondaryRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        elevation: 0,
    },
    designSecondaryTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    designSecondarySub: {
        fontSize: 11,
        marginTop: 2,
        lineHeight: 14,
    },
    infoPanel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 8,
        paddingBottom: 8,
        maxHeight: "45%",
    },
    /** Colonne des cartes : pas de flex:1 pour éviter de forcer la hauteur et le scroll. */
    infoPanelBody: {
        paddingHorizontal: 15,
        gap: 8,
    },
    panelHeader: {
        marginBottom: 16,
        borderRadius: 16,
        paddingHorizontal: 15,
    },
    panelHandleContainer: {
        width: "100%",
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    panelHandle: {
        width: 30,
        height: 6,
        alignSelf: "center",
        borderRadius: 15,
        marginBottom: 8,
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
        padding: 10,
        borderRadius: 14,
        marginBottom: 0,
        borderWidth: 1,
        gap: 10,
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
