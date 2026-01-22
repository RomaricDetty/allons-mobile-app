import TripRouteViewer from '@/components/TripRouteViewer';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Booking } from '@/interfaces';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Écran pour afficher l'itinéraire d'un trajet
 * Optimisé pour les performances et l'expérience utilisateur
 */
export default function RouteViewerScreen() {
    const router = useRouter();
    const { booking } = useLocalSearchParams();
    const { isDarkMode } = useTheme();
    
    // Couleurs du thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    const accentColor = '#1776BA';

    /**
     * Parse les données du booking de manière optimisée avec useMemo
     * Évite de re-parser à chaque render
     */
    const { bookingData, parseError } = useMemo(() => {
        if (!booking) {
            return { bookingData: null, parseError: 'Aucune donnée de réservation fournie' };
        }

        try {
            // Gérer le cas où booking peut être un tableau (expo-router)
            const bookingString = Array.isArray(booking) ? booking[0] : booking;
            const parsed = JSON.parse(bookingString as string) as Booking;
            
            // Validation basique des données essentielles
            if (!parsed || !parsed.trip || !parsed.trip.stationFrom || !parsed.trip.stationTo) {
                return { bookingData: null, parseError: 'Données de réservation incomplètes' };
            }

            return { bookingData: parsed, parseError: null };
        } catch (error) {
            console.error('Erreur lors du parsing du booking:', error);
            return { 
                bookingData: null, 
                parseError: 'Impossible de charger les données de réservation' 
            };
        }
    }, [booking]);

    /**
     * Affiche un écran de chargement élégant
     */
    if (!booking) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                        Chargement des données...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    /**
     * Affiche un écran d'erreur avec possibilité de retour
     */
    if (parseError || !bookingData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
                <View style={styles.centerContainer}>
                    <View style={[styles.errorIconContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5' }]}>
                        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
                    </View>
                    <Text style={[styles.errorTitle, { color: textColor }]}>
                        Erreur
                    </Text>
                    <Text style={[styles.errorText, { color: secondaryTextColor }]}>
                        {parseError || 'Impossible de charger l\'itinéraire'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: accentColor }]}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                        <Text style={styles.backButtonText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return <TripRouteViewer booking={bookingData} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        minWidth: 140,
        justifyContent: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
});
