import OSMBusTracker from '@/components/OSMBusTracker';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function LiveTrackingScreen() {
    const { tripId, bookingDetails } = useLocalSearchParams();

    const tripIdParam = Array.isArray(tripId) ? tripId[0] : tripId;
    const bookingDetailsParam = Array.isArray(bookingDetails) ? bookingDetails[0] : bookingDetails;

    return (
        <View style={styles.container}>
            <OSMBusTracker
                tripId={String(tripIdParam ?? '')}
                bookingDetails={bookingDetailsParam as string | object}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
