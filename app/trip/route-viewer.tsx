import TripRouteViewer from '@/components/TripRouteViewer';
import { Booking } from '@/interfaces';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

/**
 * Écran pour afficher l'itinéraire d'un trajet
 */
export default function RouteViewerScreen() {
    const { booking } = useLocalSearchParams();

    // Parser les données du booking (reçu comme chaîne JSON)
    const bookingData = booking ? JSON.parse(booking as string) as Booking : null;

    if (!bookingData) {
        return null;
    }

    return <TripRouteViewer booking={bookingData} />;

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
