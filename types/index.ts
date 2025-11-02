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

/**
 * Type pour un trajet (départ)
 */
export type TripItem = {
    id: string;
    departureCity: string;
    arrivalCity: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    currency: string;
    companyId: string;
    company: string;
    companyLogo: string;
    companyAbbreviation: string;
    licencePlate: string;
    availableSeats: number;
    totalSeats: number;
    departureStation: string;
    arrivalStation: string;
    options: string[];
    busType: string;
};

/**
 * Type pour les données reçues
 */
export type DeparturesData = {
    items: TripItem[];
    total: number;
    filters?: any;
};