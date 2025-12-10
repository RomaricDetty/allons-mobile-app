import OSMBusTracker from '@/components/OSMBusTracker';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function LiveTrackingScreen() {
    const { tripId, bookingDetails } = useLocalSearchParams();

    // console.log('bookingDetails ===>, ', JSON.stringify(bookingDetails, null, 2));
    // console.log('tripId ===>, ', tripId);

    return (
        <View style={styles.container}>
            <OSMBusTracker
                tripId={tripId as string}
                bookingDetails={bookingDetails as Object | any}
            />

            {/* Bouton retour */}
            {/* <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        // top: 50,
        left: 20,
        // backgroundColor: 'white',
        width: 44,
        height: 44,
        // borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.25,
        // shadowRadius: 3.84,
        // elevation: 5,
    },
});