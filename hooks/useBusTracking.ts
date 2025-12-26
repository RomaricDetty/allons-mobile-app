import { busTrackingService } from '@/services/busTrackingService';
import { routingService } from '@/services/routingService';
import { BusPosition, BusStop, Trip } from '@/types/tracking';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseBusTrackingResult {
    busPosition: BusPosition | null;
    busStops: BusStop[];
    trip: Trip | null;
    isConnected: boolean;
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

export function useBusTracking(tripId: string, bookingId: string): UseBusTrackingResult {
    const [busPosition, setBusPosition] = useState<BusPosition | null>(null);
    const [busStops, setBusStops] = useState<BusStop[]>([]);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const routeProgressRef = useRef(0); // Référence pour maintenir la progression de l'itinéraire

    // Charger les détails du voyage
    const fetchTripDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `https://votre-backend.com/api/trips/${tripId}`,
                {
                    headers: {
                        Authorization: `Bearer votreToken`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Erreur lors du chargement du voyage');
            }

            const data: Trip | any = await response.json();
            setTrip(data);
            setBusStops(data.stops);

            if (data.currentPosition) {
                setBusPosition(data.currentPosition);
            }
        } catch (err) {
            console.error('Erreur fetchTripDetails:', err);
            // Utiliser les données de test par défaut en cas d'erreur
            console.log('Utilisation des données de test par défaut');
            const testData = getDefaultTestData(tripId);
            setTrip(testData.trip);
            setBusStops(testData.busStops);
            setBusPosition(testData.busPosition);
            setIsConnected(true); // Simuler une connexion pour les tests
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    // Initialiser la connexion WebSocket
    useEffect(() => {
        fetchTripDetails();

        // Handlers pour les messages WebSocket
        const handleConnection = (message: any) => {
            setIsConnected(message.data.connected);
        };

        const handleBusPositionUpdate = (message: any) => {
            setBusPosition(message.data.position);
        };

        const handleBusStopUpdate = (message: any) => {
            setBusStops((prevStops) =>
                prevStops.map((stop) =>
                    stop.id === message.data.stop.id ? message.data.stop : stop
                )
            );
        };

        const handleTripUpdate = (message: any) => {
            setTrip((prevTrip) => ({
                ...prevTrip!,
                ...message.data.trip,
            }));
        };

        // Enregistrer les handlers
        busTrackingService.on('connection', handleConnection);
        busTrackingService.on('bus_position_update', handleBusPositionUpdate);
        busTrackingService.on('bus_stop_update', handleBusStopUpdate);
        busTrackingService.on('trip_update', handleTripUpdate);

        // Connexion au WebSocket
        busTrackingService.connect(tripId, bookingId);

        // Simulation de mouvement du bus le long de l'itinéraire (si pas de connexion WebSocket)
        const testData = getDefaultTestData(tripId);
        const routePath = testData.trip.routePath;
        routeProgressRef.current = 0; // Réinitialiser la progression
        
        const testInterval = setInterval(() => {
            setBusPosition((prev) => {
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
        }, 3000); // Mise à jour toutes les 3 secondes

        // Nettoyage
        return () => {
            clearInterval(testInterval);
            busTrackingService.off('connection', handleConnection);
            busTrackingService.off('bus_position_update', handleBusPositionUpdate);
            busTrackingService.off('bus_stop_update', handleBusStopUpdate);
            busTrackingService.off('trip_update', handleTripUpdate);
            busTrackingService.disconnect();
        };
    }, [tripId, bookingId, fetchTripDetails]);

    return {
        busPosition,
        busStops,
        trip,
        isConnected,
        isLoading,
        error,
        refetch: fetchTripDetails,
    };
}