import { baseUrl } from '@/api/config';
import { busTrackingService } from '@/services/busTrackingService';
import { routingService } from '@/services/routingService';
import { getAuthToken } from '@/utils/storage';
import { BusPosition, BusStop, Trip } from '@/types/tracking';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseBusTrackingOptions {
    /** Ne positionne le bus que via Socket.IO (pas de simulation ni position de test / API). */
    realtimeOnly?: boolean;
}

interface UseBusTrackingResult {
    busPosition: BusPosition | null;
    busStops: BusStop[];
    trip: Trip | null;
    isConnected: boolean;
    hasRealtimeData: boolean;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Génère des données de test pour le live-tracking avec des coordonnées de Côte d'Ivoire
 * @param tripId - ID du voyage
 * @returns Données de test (bus, arrêts, voyage)
 */
const getDefaultTestData = (tripId: string): { trip: Trip; busPosition: BusPosition; busStops: BusStop[] } => {
    // Coordonnées d'Abidjan, Côte d'Ivoire pour les tests
    // Position initiale du bus : Cocody (St Jean)
    const defaultBusPosition: BusPosition = {
        latitude: 5.33542,
        longitude: -4.00351,
        speed: 30,
        heading: 270, // Direction ouest vers Yopougon
        timestamp: new Date().toISOString(),
        accuracy: 20,
    };

    // Arrêts à Abidjan, Côte d'Ivoire
    const defaultStops: BusStop[] = [
        {
            id: 'stop-1',
            name: 'Cocody - St Jean',
            address: 'Cocody, Abidjan, Côte d\'Ivoire',
            latitude: 5.33542,
            longitude: -4.00351,
            order: 1,
            status: 'departed',
        },
        {
            id: 'stop-2',
            name: 'Plateau - Gare Sud',
            address: 'Plateau, Abidjan, Côte d\'Ivoire',
            latitude: 5.3197,
            longitude: -4.0281,
            order: 2,
            status: 'approaching',
        },
        {
            id: 'stop-3',
            name: 'Marcory - Carrefour',
            address: 'Marcory, Abidjan, Côte d\'Ivoire',
            latitude: 5.2800,
            longitude: -4.0100,
            order: 3,
            status: 'pending',
        },
        {
            id: 'stop-4',
            name: 'Yopougon - Sicogi',
            address: 'Yopougon, Abidjan, Côte d\'Ivoire',
            latitude: 5.3300,
            longitude: -4.0700,
            order: 4,
            status: 'pending',
        },
        {
            id: 'stop-5',
            name: 'Yopougon - Toits Rouges',
            address: 'Yopougon Toits Rouges, Abidjan, Côte d\'Ivoire',
            latitude: 5.317666,
            longitude: -4.089991,
            order: 5,
            status: 'pending',
        },
    ];

    const defaultTrip: Trip = {
        id: tripId,
        busId: 'bus-123',
        busNumber: '42',
        driverName: 'Kouassi Kouamé',
        route: 'Cocody St Jean → Yopougon Toits Rouges',
        departureLocation: 'Cocody - St Jean',
        arrivalLocation: 'Yopougon - Toits Rouges',
        departureTime: new Date().toISOString(),
        estimatedArrivalTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        stops: defaultStops,
        routePath: [
            { latitude: 5.33542, longitude: -4.00351 }, // Cocody St Jean
            { latitude: 5.3300, longitude: -4.0100 },
            { latitude: 5.3250, longitude: -4.0180 },
            { latitude: 5.3197, longitude: -4.0281 }, // Plateau
            { latitude: 5.3150, longitude: -4.0250 },
            { latitude: 5.3000, longitude: -4.0150 },
            { latitude: 5.2800, longitude: -4.0100 }, // Marcory
            { latitude: 5.2900, longitude: -4.0300 },
            { latitude: 5.3100, longitude: -4.0500 },
            { latitude: 5.3300, longitude: -4.0700 }, // Yopougon Sicogi
            { latitude: 5.3250, longitude: -4.0800 },
            { latitude: 5.317666, longitude: -4.089991 }, // Yopougon Toits Rouges
        ],
        status: 'in_progress',
    };

    return {
        trip: defaultTrip,
        busPosition: defaultBusPosition,
        busStops: defaultStops,
    };
};

export function useBusTracking(
    tripId: string,
    bookingId: string,
    preferredBusId?: string,
    options?: UseBusTrackingOptions,
): UseBusTrackingResult {
    const realtimeOnly = options?.realtimeOnly === true;
    const logDev = (...args: any[]) => {
        if (__DEV__) console.log(...args);
    };
    const [busPosition, setBusPosition] = useState<BusPosition | null>(null);
    const [busStops, setBusStops] = useState<BusStop[]>([]);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [hasRealtimeData, setHasRealtimeData] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const routeProgressRef = useRef(0); // Référence pour maintenir la progression de l'itinéraire
    const hasRealtimeUpdateRef = useRef(false);
    const isConnectedRef = useRef(false);

    /**
     * Synchronise la référence de connexion pour les callbacks d'intervalle.
     */
    useEffect(() => {
        isConnectedRef.current = isConnected;
    }, [isConnected]);

    // Charger les détails du voyage
    const fetchTripDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (!tripId || tripId.trim() === '') {
                if (realtimeOnly) {
                    setIsLoading(false);
                    return;
                }
                logDev('tripId manquant, utilisation des données de test');
                const testData = getDefaultTestData('trip-test');
                setTrip(testData.trip);
                setBusStops(testData.busStops);
                setBusPosition(testData.busPosition);
                setIsLoading(false);
                return;
            }

            // Récupérer le token d'authentification
            const token = await getAuthToken();
            
            // Si pas de token, utiliser les données de test
            if (!token || token.trim() === '') {
                if (realtimeOnly) {
                    setIsLoading(false);
                    return;
                }
                logDev('Token d\'authentification manquant, utilisation des données de test');
                const testData = getDefaultTestData(tripId);
                setTrip(testData.trip);
                setBusStops(testData.busStops);
                setBusPosition(testData.busPosition);
                setIsConnected(true);
                setIsLoading(false);
                return;
            }

            const response = await fetch(
                `${baseUrl}/trips/${tripId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Erreur lors du chargement du voyage');
            }

            const data: Trip | any = await response.json();
            setTrip(data);
            setBusStops(data.stops);

            if (!realtimeOnly && data.currentPosition) {
                setBusPosition(data.currentPosition);
            }
        } catch (err) {
            console.error('Erreur fetchTripDetails:', err);
            if (!realtimeOnly) {
                logDev('Utilisation des données de test par défaut');
                const testData = getDefaultTestData(tripId);
                setTrip(testData.trip);
                setBusStops(testData.busStops);
                setBusPosition(testData.busPosition);
                setIsConnected(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [tripId, realtimeOnly]);

    // Initialiser la connexion WebSocket
    useEffect(() => {
        fetchTripDetails();

        // Handlers pour les messages WebSocket
        const handleConnection = (message: any) => {
            logDev('[useBusTracking] connection', message?.data);
            setIsConnected(message.data.connected);
        };

        const handleBusPositionUpdate = (message: any) => {
            hasRealtimeUpdateRef.current = true;
            setHasRealtimeData(true);
            logDev('[useBusTracking] bus_position_update', message?.data?.position);
            setBusPosition(message.data.position);
        };

        const handleBusStopUpdate = (message: any) => {
            const stop = message?.data?.stop;
            if (!stop?.id) return;
            setBusStops((prevStops) =>
                prevStops.map((s) => (s.id === stop.id ? { ...s, ...stop } : s)),
            );
        };

        const handleTripUpdate = (message: any) => {
            const next = message?.data?.trip;
            if (!next || typeof next !== 'object') return;
            setTrip((prevTrip) => {
                if (!prevTrip) return next as Trip;
                return { ...prevTrip, ...next };
            });
        };

        // Enregistrer les handlers
        busTrackingService.on('connection', handleConnection);
        busTrackingService.on('bus_position_update', handleBusPositionUpdate);
        busTrackingService.on('bus_stop_update', handleBusStopUpdate);
        busTrackingService.on('trip_update', handleTripUpdate);

        let cancelled = false;
        void (async () => {
            const token = await getAuthToken();
            if (cancelled) return;
            await busTrackingService.connect(tripId, bookingId, token);
        })();

        let testInterval: ReturnType<typeof setInterval> | undefined;

        if (!realtimeOnly) {
        const testData = getDefaultTestData(tripId);
        const routePath = testData.trip.routePath;
        routeProgressRef.current = 0;

        testInterval = setInterval(() => {
            setBusPosition((prev) => {
                if (isConnectedRef.current || hasRealtimeUpdateRef.current) {
                    return prev;
                }

                if (!prev) {
                    return testData.busPosition;
                }

                // Si on a un itinéraire, suivre le chemin
                if (routePath && routePath.length > 1) {
                    // Calculer la position actuelle sur l'itinéraire
                    routeProgressRef.current += 0.008; // Avancer de 0.8% toutes les 3 secondes
                    
                    if (routeProgressRef.current >= 1) {
                        routeProgressRef.current = 0; // Revenir au début si on arrive à la fin
                    }

                    // Trouver le segment de l'itinéraire où se trouve le bus
                    const totalSegments = routePath.length - 1;
                    const currentSegment = Math.floor(routeProgressRef.current * totalSegments);
                    const segmentProgress = (routeProgressRef.current * totalSegments) % 1;
                    const clampedSegment = Math.min(currentSegment, totalSegments - 1);

                    const startPoint = routePath[clampedSegment];
                    const endPoint = routePath[Math.min(clampedSegment + 1, routePath.length - 1)];

                    // Interpoler la position entre les deux points
                    const newLatitude = startPoint.latitude + (endPoint.latitude - startPoint.latitude) * segmentProgress;
                    const newLongitude = startPoint.longitude + (endPoint.longitude - startPoint.longitude) * segmentProgress;

                    // Calculer la direction (heading) basée sur le mouvement
                    const deltaLat = endPoint.latitude - startPoint.latitude;
                    const deltaLng = endPoint.longitude - startPoint.longitude;
                    const heading = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);

                    const newPosition = {
                        ...prev,
                        latitude: newLatitude,
                        longitude: newLongitude,
                        heading: heading >= 0 ? heading : heading + 360,
                        speed: 30 + Math.random() * 10, // Vitesse entre 30 et 40 km/h
                        timestamp: new Date().toISOString(),
                    };

                    // Mettre à jour les statuts des arrêts en fonction de la position du bus
                    setBusStops((prevStops) => {
                        return prevStops.map((stop) => {
                            const distance = routingService.calculateDistance(
                                { latitude: newLatitude, longitude: newLongitude },
                                { latitude: stop.latitude, longitude: stop.longitude }
                            );

                            // Si le bus est très proche de l'arrêt (moins de 100m)
                            if (distance < 0.1 && stop.status === 'approaching') {
                                return { ...stop, status: 'arrived' };
                            }
                            // Si le bus est proche de l'arrêt (moins de 500m) et que l'arrêt est en attente
                            else if (distance < 0.5 && stop.status === 'pending') {
                                return { ...stop, status: 'approaching' };
                            }
                            // Si le bus a dépassé l'arrêt (basé sur l'ordre et la progression)
                            else if (stop.status === 'arrived' && routeProgressRef.current > (stop.order / prevStops.length)) {
                                return { ...stop, status: 'departed' };
                            }
                            return stop;
                        });
                    });

                    return newPosition;
                } else {
                    // Fallback : mouvement aléatoire léger si pas d'itinéraire
                    return {
                        ...prev,
                        latitude: prev.latitude + (Math.random() - 0.5) * 0.0005,
                        longitude: prev.longitude + (Math.random() - 0.5) * 0.0005,
                        heading: (prev.heading + (Math.random() - 0.5) * 5) % 360,
                        timestamp: new Date().toISOString(),
                    };
                }
            });
        }, 3000);
        }

        return () => {
            cancelled = true;
            if (testInterval) clearInterval(testInterval);
            hasRealtimeUpdateRef.current = false;
            setHasRealtimeData(false);
            busTrackingService.off('connection', handleConnection);
            busTrackingService.off('bus_position_update', handleBusPositionUpdate);
            busTrackingService.off('bus_stop_update', handleBusStopUpdate);
            busTrackingService.off('trip_update', handleTripUpdate);
            busTrackingService.disconnect();
        };
    }, [tripId, bookingId, fetchTripDetails, realtimeOnly]);

    /**
     * Rejoint explicitement la room du bus dès que son identifiant est connu.
     */
    useEffect(() => {
        const candidateBusIds = [
            preferredBusId,
            trip?.busId,
            tripId,
        ].filter((value): value is string => !!value && value.trim() !== '');

        if (candidateBusIds.length === 0) return;

        candidateBusIds.forEach((busId) => {
            logDev('[useBusTracking] tentative bus:join', { busId });
            busTrackingService.joinBusRoom(busId);
        });
    }, [preferredBusId, trip?.busId, tripId]);

    return {
        busPosition,
        busStops,
        trip,
        isConnected,
        hasRealtimeData,
        isLoading,
        error,
        refetch: fetchTripDetails,
    };
}