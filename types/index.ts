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
 * Type pour la réponse de l'API des trajets populaires
 */
export type PopularTripsResponse = {
    data: PopularTrip[];
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
export type Trip = {
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
export type Departures = {
    items: Trip[];
    total: number;
    filters?: any;
};

/**
 * Type pour les paramètres de recherche de trajet
 */
export type SearchParams = {
    numberOfPersons: number;
    tripType?: string; // 'ONE_WAY' ou 'ROUND_TRIP'
    departureCity?: City;
    arrivalCity?: City;
    returnDate?: Date | null;
};

/**
 * Type pour les props de la carte de départ
 */
export type DepartureCardProps = {
    item: PopularTrip;
    width: number;
    height: number;
    onPress?: (item: PopularTrip) => void;
};

/**
 * Type pour le type de téléphone
 */
export enum PhoneType {
    NONE = 'none',
    MOBILE = 'mobile',
    HOME = 'home',
    WORK = 'work',
}

/**
 * Type pour la civilité
 */
export type Civility = 'MR' | 'Mrs' | 'Miss';