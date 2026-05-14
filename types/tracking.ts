export interface Coordinate {
    latitude: number;
    longitude: number;
}

export interface BusPosition extends Coordinate {
    speed: number;
    heading: number; // Direction en degrés (0-360)
    timestamp: string;
    accuracy?: number;
}

export interface BusStop {
    id: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    order: number; // Position dans l'itinéraire (1, 2, 3...)
    estimatedArrival?: string;
    actualArrival?: string;
    status: 'pending' | 'approaching' | 'arrived' | 'departed';
    distanceFromUser?: number; // Distance en km depuis la position du passager
    distanceFromBus?: number; // Distance en km depuis le bus
}

export interface Trip {
    id: string;
    busId: string;
    busNumber: string;
    driverName: string;
    route: string;
    departureLocation: string;
    arrivalLocation: string;
    departureTime: string;
    estimatedArrivalTime: string;
    stops: BusStop[];
    routePath: Coordinate[]; // Polyline de l'itinéraire complet
    status: 'scheduled' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
}

export interface PassengerLocation extends Coordinate {
    accuracy?: number;
    timestamp: string;
}

export interface WebSocketMessage {
    type:
        | 'bus_position_update'
        | 'bus_stop_update'
        | 'bus_status_update'
        | 'trip_update'
        | 'connection'
        | 'error';
    data: any;
}