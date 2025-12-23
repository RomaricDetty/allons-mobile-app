// services/geocodingService.ts

import { Coordinate } from '@/types/tracking';

/**
 * Service de géocodage pour obtenir les coordonnées des villes
 * Utilise les coordonnées des gares UTB par défaut, ou d'autres gares routières si pas de gare UTB
 * Base de données locale des principales villes et communes de Côte d'Ivoire
 */
class GeocodingService {
    /**
     * Base de données des coordonnées des gares UTB par défaut
     * Si pas de gare UTB, utilise les coordonnées d'autres gares routières
     */
    private cityCoordinates: { [key: string]: Coordinate } = {
        // Abidjan et ses communes - Gares UTB
        'abidjan': { latitude: 5.3518225, longitude: -4.0221293 }, // Gare UTB Adjamé (par défaut)
        'adjame': { latitude: 5.3537, longitude: -4.0083 }, // Gare UTB Adjamé
        'koumassi': { latitude: 5.3097, longitude: -3.9764 }, // Gare UTB Koumassi
        'abobo': { latitude: 5.4167, longitude: -4.0333 }, // Gare UTB Abobo
        'yopougon': { latitude: 5.3167, longitude: -4.0667 }, // Gare UTB Yopougon
        'cocody': { latitude: 5.33542, longitude: -4.00351 }, // Autre gare
        'marcory': { latitude: 5.2500, longitude: -4.0167 }, // Autre gare
        'plateau': { latitude: 5.3197, longitude: -4.0281 }, // Autre gare
        'treichville': { latitude: 5.3000, longitude: -4.0167 }, // Autre gare
        'anyama': { latitude: 5.4833, longitude: -4.0500 }, // Autre gare
        'bassam': { latitude: 5.2167, longitude: -4.0167 }, // Autre gare
        'grand-bassam': { latitude: 5.2167, longitude: -4.0167 }, // Autre gare
        
        // Autres villes principales - Gares UTB ou autres gares routières
        'bouake': { latitude: 7.6833, longitude: -5.0167 }, // Gare UTB Bouaké
        'yamoussoukro': { latitude: 6.8161, longitude: -5.2742 }, // Gare UTB Yamoussoukro
        'daloa': { latitude: 6.8774, longitude: -6.4502 }, // Gare routière Daloa
        'korhogo': { latitude: 9.4580, longitude: -5.6296 }, // Gare routière Korhogo
        'san-pedro': { latitude: 4.7485, longitude: -6.6363 }, // Gare routière San-Pédro
        'man': { latitude: 7.4125, longitude: -7.5538 }, // Gare routière Man
        'gagnoa': { latitude: 6.1319, longitude: -5.9506 }, // Gare routière Gagnoa
        'abengourou': { latitude: 6.7297, longitude: -3.4963 }, // Gare routière Abengourou
        'divo': { latitude: 5.8372, longitude: -5.3570 }, // Gare routière Divo
        'katiola': { latitude: 8.1378, longitude: -5.1000 }, // Gare routière Katiola
        'odienne': { latitude: 9.5000, longitude: -7.5667 }, // Gare routière Odienné
        'boundiali': { latitude: 9.5200, longitude: -6.4800 }, // Gare routière Boundiali
        'dabou': { latitude: 5.3250, longitude: -4.3764 }, // Gare routière Dabou
        'agboville': { latitude: 5.9280, longitude: -4.2132 }, // Gare routière Agboville
        'bongouanou': { latitude: 6.6500, longitude: -4.2000 }, // Gare routière Bongouanou
        'ferkessedougou': { latitude: 9.5920, longitude: -5.1940 }, // Gare routière Ferkessédougou
        'seguela': { latitude: 7.9611, longitude: -6.6731 }, // Gare routière Séguéla
        'toumodi': { latitude: 6.5570, longitude: -5.0170 }, // Gare routière Toumodi
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

