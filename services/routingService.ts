import { Coordinate } from '@/types/tracking';

/**
 * Service pour calculer des itinéraires avec OSRM (Open Source Routing Machine)
 * Utilise les serveurs publics d'OSRM basés sur OpenStreetMap
 */
class RoutingService {
    private baseUrl = 'https://router.project-osrm.org';

    // Coordonnées par défaut : Gare UTB Adjamé et Gare UTB Bouaké
    private readonly defaultStart: Coordinate = {
        latitude: 5.3518225,
        longitude: -4.0221293,
    };

    private readonly defaultEnd: Coordinate = {
        latitude: 7.6874596,
        longitude: -5.0269802,
    };

    /**
     * Valide si une coordonnée est valide
     */
    private isValidCoordinate(coord: Coordinate | null | undefined): boolean {
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
    }

    /**
     * Calcule l'itinéraire entre deux points
     * Utilise les coordonnées par défaut si les paramètres sont invalides
     */
    async getRoute(start: Coordinate, end: Coordinate): Promise<Coordinate[]> {
        try {
            // Utiliser les coordonnées par défaut si les paramètres sont invalides
            const validStart = this.isValidCoordinate(start)
                ? start
                : this.defaultStart;
            const validEnd = this.isValidCoordinate(end)
                ? end
                : this.defaultEnd;

            const url = `${this.baseUrl}/route/v1/driving/${validStart.longitude},${validStart.latitude};${validEnd.longitude},${validEnd.latitude}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                // En cas d'erreur, utiliser les coordonnées par défaut
                console.warn(
                    'Erreur calcul itinéraire, utilisation des coordonnées par défaut'
                );
                return this.getRoute(this.defaultStart, this.defaultEnd);
            }

            // Convertir les coordonnées [lng, lat] en {latitude, longitude}
            const coordinates = data.routes[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({
                    latitude: lat,
                    longitude: lng,
                })
            );

            return coordinates;
        } catch (error) {
            console.error('Erreur calcul itinéraire:', error);
            // En cas d'erreur, utiliser les coordonnées par défaut
            console.warn(
                'Utilisation des coordonnées par défaut suite à l\'erreur'
            );
            try {
                return await this.getRoute(this.defaultStart, this.defaultEnd);
            } catch (fallbackError) {
                throw new Error(
                    'Impossible de calculer l\'itinéraire même avec les coordonnées par défaut'
                );
            }
        }
    }

    /**
     * Calcule l'itinéraire avec les détails (tracé, distance, durée)
     * Prend en compte le tracé réel du trajet pour calculer la durée
     * Note: Pour prendre en compte les embouteillages en temps réel, il faudrait
     * utiliser une API qui supporte le trafic (ex: Google Maps API avec traffic_model)
     * @param start Point de départ
     * @param end Point d'arrivée
     * @returns Objet contenant le tracé, la distance (en km) et la durée (en minutes)
     */
    async getRouteWithDetails(
        start: Coordinate,
        end: Coordinate
    ): Promise<{
        coordinates: Coordinate[];
        distance: number; // en km
        duration: number; // en minutes
    }> {
        try {
            // Utiliser les coordonnées par défaut si les paramètres sont invalides
            const validStart = this.isValidCoordinate(start)
                ? start
                : this.defaultStart;
            const validEnd = this.isValidCoordinate(end)
                ? end
                : this.defaultEnd;

            const url = `${this.baseUrl}/route/v1/driving/${validStart.longitude},${validStart.latitude};${validEnd.longitude},${validEnd.latitude}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                // En cas d'erreur, utiliser les coordonnées par défaut
                console.warn(
                    'Erreur calcul itinéraire, utilisation des coordonnées par défaut'
                );
                return this.getRouteWithDetails(this.defaultStart, this.defaultEnd);
            }

            const route = data.routes[0];

            // Convertir les coordonnées [lng, lat] en {latitude, longitude}
            const coordinates = route.geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({
                    latitude: lat,
                    longitude: lng,
                })
            );

            return {
                coordinates,
                distance: route.distance / 1000, // Conversion en km
                duration: route.duration / 60, // Conversion en minutes
            };
        } catch (error) {
            console.error('Erreur calcul itinéraire avec détails:', error);
            // En cas d'erreur, utiliser les coordonnées par défaut
            console.warn(
                'Utilisation des coordonnées par défaut suite à l\'erreur'
            );
            try {
                return await this.getRouteWithDetails(this.defaultStart, this.defaultEnd);
            } catch (fallbackError) {
                throw new Error(
                    'Impossible de calculer l\'itinéraire même avec les coordonnées par défaut'
                );
            }
        }
    }

    /**
     * Calcule l'itinéraire passant par plusieurs points (waypoints)
     * Utilise les coordonnées par défaut si les waypoints sont invalides
     */
    async getRouteWithWaypoints(waypoints: Coordinate[]): Promise<Coordinate[]> {
        try {
            // Filtrer et valider les waypoints, utiliser les coordonnées par défaut si nécessaire
            const validWaypoints = waypoints
                .filter((point) => this.isValidCoordinate(point))
                .map((point) => point as Coordinate);

            // Si moins de 2 waypoints valides, utiliser les coordonnées par défaut
            if (validWaypoints.length < 2) {
                console.warn(
                    'Pas assez de waypoints valides, utilisation des coordonnées par défaut'
                );
                return this.getRoute(this.defaultStart, this.defaultEnd);
            }

            // Construire la liste des coordonnées pour l'URL
            const coords = validWaypoints
                .map((point) => `${point.longitude},${point.latitude}`)
                .join(';');

            const url = `${this.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                // En cas d'erreur, utiliser les coordonnées par défaut
                console.warn(
                    'Erreur calcul itinéraire avec waypoints, utilisation des coordonnées par défaut'
                );
                return this.getRoute(this.defaultStart, this.defaultEnd);
            }

            const coordinates = data.routes[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({
                    latitude: lat,
                    longitude: lng,
                })
            );

            return coordinates;
        } catch (error) {
            console.error('Erreur calcul itinéraire avec waypoints:', error);
            // En cas d'erreur, utiliser les coordonnées par défaut
            console.warn(
                'Utilisation des coordonnées par défaut suite à l\'erreur'
            );
            try {
                return await this.getRoute(this.defaultStart, this.defaultEnd);
            } catch (fallbackError) {
                throw new Error(
                    'Impossible de calculer l\'itinéraire même avec les coordonnées par défaut'
                );
            }
        }
    }

    /**
     * Calcule la distance et la durée entre deux points
     * Utilise les coordonnées par défaut si les paramètres sont invalides
     */
    async getDistanceAndDuration(
        start: Coordinate,
        end: Coordinate
    ): Promise<{ distance: number; duration: number }> {
        try {
            // Utiliser les coordonnées par défaut si les paramètres sont invalides
            const validStart = this.isValidCoordinate(start)
                ? start
                : this.defaultStart;
            const validEnd = this.isValidCoordinate(end)
                ? end
                : this.defaultEnd;

            const url = `${this.baseUrl}/route/v1/driving/${validStart.longitude},${validStart.latitude};${validEnd.longitude},${validEnd.latitude}?overview=false`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                // En cas d'erreur, utiliser les coordonnées par défaut
                console.warn(
                    'Erreur calcul distance, utilisation des coordonnées par défaut'
                );
                return this.getDistanceAndDuration(
                    this.defaultStart,
                    this.defaultEnd
                );
            }

            return {
                distance: data.routes[0].distance / 1000, // Conversion en km
                duration: data.routes[0].duration / 60, // Conversion en minutes
            };
        } catch (error) {
            console.error('Erreur calcul distance:', error);
            // En cas d'erreur, utiliser les coordonnées par défaut
            console.warn(
                'Utilisation des coordonnées par défaut suite à l\'erreur'
            );
            try {
                return await this.getDistanceAndDuration(
                    this.defaultStart,
                    this.defaultEnd
                );
            } catch (fallbackError) {
                throw new Error(
                    'Impossible de calculer la distance même avec les coordonnées par défaut'
                );
            }
        }
    }

    /**
     * Trouve le point le plus proche sur un itinéraire
     */
    async getNearestPointOnRoute(
        point: Coordinate,
        route: Coordinate[]
    ): Promise<{ coordinate: Coordinate; index: number }> {
        let minDistance = Infinity;
        let nearestIndex = 0;
        let nearestPoint = route[0];

        route.forEach((routePoint, index) => {
            const distance = this.calculateDistance(point, routePoint);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
                nearestPoint = routePoint;
            }
        });

        return {
            coordinate: nearestPoint,
            index: nearestIndex,
        };
    }

    /**
     * Calcule la distance entre deux points (formule de Haversine)
     */
    calculateDistance(point1: Coordinate, point2: Coordinate): number {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRad(point2.latitude - point1.latitude);
        const dLon = this.toRad(point2.longitude - point1.longitude);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.latitude)) *
            Math.cos(this.toRad(point2.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(value: number): number {
        return (value * Math.PI) / 180;
    }
}

export const routingService = new RoutingService();