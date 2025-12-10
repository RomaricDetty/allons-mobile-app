// services/geocodingService.ts

import { Coordinate } from '@/types/tracking';

/**
 * Service de géocodage pour obtenir les coordonnées des villes
 * Utilise une base de données locale des principales villes de Côte d'Ivoire
 */
class GeocodingService {
    /**
     * Base de données des coordonnées des principales villes de Côte d'Ivoire
     */
    private cityCoordinates: { [key: string]: Coordinate } = {
        // Abidjan et ses communes
        'abidjan': { latitude: 5.3599517, longitude: -4.0082563 },
        'cocody': { latitude: 5.33542, longitude: -4.00351 },
        'yopougon': { latitude: 5.317666, longitude: -4.089991 },
        'marcory': { latitude: 5.2500, longitude: -4.0167 },
        'plateau': { latitude: 5.3197, longitude: -4.0281 },
        'adjame': { latitude: 5.3594, longitude: -4.0256 },
        'koumassi': { latitude: 5.3000, longitude: -4.0167 },
        'treichville': { latitude: 5.3000, longitude: -4.0167 },
        'abobo': { latitude: 5.4167, longitude: -4.0167 },
        'anyama': { latitude: 5.4833, longitude: -4.0500 },
        'bassam': { latitude: 5.2167, longitude: -4.0167 },
        'grand-bassam': { latitude: 5.2167, longitude: -4.0167 },
        
        // Autres villes principales
        'bouake': { latitude: 7.6944, longitude: -5.0303 },
        'daloa': { latitude: 6.8778, longitude: -6.4500 },
        'korhogo': { latitude: 9.4581, longitude: -5.6296 },
        'san-pedro': { latitude: 4.7489, longitude: -6.6364 },
        'man': { latitude: 7.4125, longitude: -7.5536 },
        'gagnoa': { latitude: 6.1333, longitude: -5.9500 },
        'abengourou': { latitude: 6.7333, longitude: -3.4833 },
        'divo': { latitude: 5.7833, longitude: -5.3667 },
        'katiola': { latitude: 8.1333, longitude: -5.1000 },
        'odienne': { latitude: 9.5000, longitude: -7.5667 },
        'boundiali': { latitude: 9.5167, longitude: -6.4833 },
        'dabou': { latitude: 5.3167, longitude: -4.3833 },
        'agboville': { latitude: 5.9333, longitude: -4.2167 },
        'bongouanou': { latitude: 6.6500, longitude: -4.2000 },
        'ferkessedougou': { latitude: 9.6000, longitude: -5.2000 },
        'seguela': { latitude: 7.9667, longitude: -6.6667 },
        'toumodi': { latitude: 6.5667, longitude: -5.0167 },
        'yamoussoukro': { latitude: 6.8276, longitude: -5.2893 },
    };

    /**
     * Normalise le nom d'une ville pour la recherche
     * @param cityName - Le nom de la ville
     * @returns Le nom normalisé
     */
    private normalizeCityName(cityName: string): string {
        return cityName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
            .trim();
    }

    /**
     * Obtient les coordonnées d'une ville à partir de son nom
     * @param cityName - Le nom de la ville
     * @returns Les coordonnées de la ville ou null si non trouvée
     */
    getCityCoordinates(cityName: string): Coordinate | null {
        const normalizedName = this.normalizeCityName(cityName);
        
        // Recherche exacte
        if (this.cityCoordinates[normalizedName]) {
            return this.cityCoordinates[normalizedName];
        }

        // Recherche partielle
        for (const [key, coords] of Object.entries(this.cityCoordinates)) {
            if (key.includes(normalizedName) || normalizedName.includes(key)) {
                return coords;
            }
        }

        // Si non trouvée, retourner les coordonnées d'Abidjan par défaut
        console.warn(`Ville "${cityName}" non trouvée, utilisation des coordonnées d'Abidjan par défaut`);
        return this.cityCoordinates['abidjan'];
    }

    /**
     * Obtient les coordonnées d'une ville avec géocodage en ligne (fallback)
     * @param cityName - Le nom de la ville
     * @returns Les coordonnées de la ville
     */
    async getCityCoordinatesOnline(cityName: string): Promise<Coordinate | null> {
        try {
            // Essayer d'abord la base locale
            const localCoords = this.getCityCoordinates(cityName);
            if (localCoords && localCoords !== this.cityCoordinates['abidjan']) {
                return localCoords;
            }

            // Si non trouvée localement, utiliser Nominatim (OpenStreetMap)
            const encodedCityName = encodeURIComponent(`${cityName}, Côte d'Ivoire`);
            const url = `https://nominatim.openstreetmap.org/search?q=${encodedCityName}&format=json&limit=1`;

            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon),
                };
            }

            // Fallback sur Abidjan
            return this.cityCoordinates['abidjan'];
        } catch (error) {
            console.error('Erreur géocodage en ligne:', error);
            return this.getCityCoordinates(cityName);
        }
    }
}

export const geocodingService = new GeocodingService();
