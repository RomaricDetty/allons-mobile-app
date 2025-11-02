/**
 * Type pour les données d'un trajet populaire
 */
export type PopularTrip = {
    id: string;
    companyId: string;
    companyName: string;
    stationFrom: {
        id: string;
        name: string;
        cityName: string;
        cityId: string;
        address: string;
    };
    stationTo: {
        id: string;
        name: string;
        cityName: string;
        cityId: string;
        address: string;
    };
    durationMinutes: number;
    basePrice: number;
    distanceKm: number;
    label: string | null;
    createdAt: string;
    updatedAt: string;
    active: boolean;
    createdBy: string | null;
    bookingCount: number;
};

/**
 * Type pour les données d'une ville (recherche de trajet)
 */
export type City = {
    id: string;
    name: string;
};