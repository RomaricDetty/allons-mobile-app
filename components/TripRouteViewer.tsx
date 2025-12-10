// components/TripRouteViewer.tsx

import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Booking } from '@/interfaces';
import { routingService } from '@/services/routingService';
import { PassengerLocation } from '@/types/tracking';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TripRouteViewerProps {
    booking: Booking;
}

/**
 * Composant pour afficher l'itinéraire d'un trajet sur une carte
 * Affiche la carte, la géolocalisation de l'utilisateur et l'itinéraire du trajet
 */
export default function TripRouteViewer({ booking }: TripRouteViewerProps) {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    const [passengerLocation, setPassengerLocation] = useState<PassengerLocation | null>(null);
    const [currentAddress, setCurrentAddress] = useState<string>('Position actuelle');
    const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[]>([]);
    const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [endPoint, setEndPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isManualMode, setIsManualMode] = useState<boolean>(false);

    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const isManualModeRef = useRef<boolean>(false);

    // Couleurs du thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const panelBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const listItemBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8';
    const iconCircleBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8';

    // Couleur d'accentuation
    const accentColor = '#6A5ACD';
    const accentColorLight = 'rgba(106, 90, 205, 0.1)';

    /**
     * Initialise la localisation du passager
     */
    useEffect(() => {
        initPassengerLocation();
        calculateRouteFromBooking();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    /**
     * Centre la carte sur l'itinéraire une fois chargé
     */
    useEffect(() => {
        if (routePath.length > 0 && mapRef.current) {
            centerMapOnRoute();
        }
    }, [routePath]);

    /**
     * Met à jour la ref du mode manuel
     */
    useEffect(() => {
        isManualModeRef.current = isManualMode;
    }, [isManualMode]);

    /**
     * Obtient l'adresse à partir des coordonnées GPS
     * @param latitude Latitude de la position
     * @param longitude Longitude de la position
     */
    const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
        try {
            const addresses = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (addresses && addresses.length > 0) {
                const address = addresses[0];
                // Construire l'adresse complète de manière lisible
                const addressParts: string[] = [];

                // Nom de la rue et numéro
                if (address.streetNumber && address.street) {
                    addressParts.push(`${address.streetNumber} ${address.street}`);
                } else if (address.street) {
                    addressParts.push(address.street);
                }

                // Quartier/District
                if (address.district) {
                    addressParts.push(address.district);
                }

                // Ville
                if (address.city) {
                    addressParts.push(address.city);
                }

                // Région/État
                if (address.region) {
                    addressParts.push(address.region);
                }

                // Code postal
                if (address.postalCode) {
                    addressParts.push(address.postalCode);
                }

                const fullAddress = addressParts.length > 0
                    ? addressParts.join(', ')
                    : 'Position actuelle';

                return fullAddress;
            }
            return 'Position actuelle';
        } catch (error) {
            console.error('Erreur géocodage inverse:', error);
            return 'Position actuelle';
        }
    };

    /**
     * Arrête le suivi de la géolocalisation
     */
    const stopLocationTracking = () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
    };

    /**
     * Initialise la localisation du passager
     */
    const initPassengerLocation = async () => {
        try {
            // Arrêter le suivi précédent si actif
            stopLocationTracking();

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès à la localisation est nécessaire pour afficher votre position"
                );
                // Utiliser les coordonnées par défaut si permission refusée
                const defaultLocation = {
                    latitude: 5.33542,
                    longitude: -4.00351,
                    accuracy: 50,
                    timestamp: new Date().toISOString(),
                };
                setPassengerLocation(defaultLocation);

                // Essayer d'obtenir l'adresse même avec les coordonnées par défaut
                const address = await getAddressFromCoordinates(
                    defaultLocation.latitude,
                    defaultLocation.longitude
                );
                setCurrentAddress(address);
                return;
            }

            // Position initiale
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const locationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                timestamp: new Date().toISOString(),
            };

            setPassengerLocation(locationData);

            // Obtenir l'adresse de la position initiale
            const address = await getAddressFromCoordinates(
                location.coords.latitude,
                location.coords.longitude
            );
            setCurrentAddress(address);

            // Suivre les changements de position
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 50,
                },
                async (location) => {
                    // Ne mettre à jour que si on n'est pas en mode manuel
                    if (!isManualModeRef.current) {
                        const locationData = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy || undefined,
                            timestamp: new Date().toISOString(),
                        };
                        setPassengerLocation(locationData);

                        // Obtenir l'adresse mise à jour
                        const address = await getAddressFromCoordinates(
                            location.coords.latitude,
                            location.coords.longitude
                        );
                        setCurrentAddress(address);
                    }
                }
            );
        } catch (error) {
            console.error('Erreur localisation passager:', error);
            const defaultLocation = {
                latitude: 5.33542,
                longitude: -4.00351,
                accuracy: 50,
                timestamp: new Date().toISOString(),
            };
            setPassengerLocation(defaultLocation);

            // Essayer d'obtenir l'adresse même en cas d'erreur
            const address = await getAddressFromCoordinates(
                defaultLocation.latitude,
                defaultLocation.longitude
            );
            setCurrentAddress(address);
        }
    };

    /**
     * Calcule l'itinéraire à partir des données du booking
     * Récupère les coordonnées directement depuis l'objet booking
     */
    const calculateRouteFromBooking = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Récupérer les coordonnées directement depuis l'objet booking
            const startCoords = booking.trip?.stationFrom?.coordinate;
            const endCoords = booking.trip?.stationTo?.coordinate;

            console.log("Start coords =>, ", startCoords);
            console.log("End coords =>, ", endCoords);

            if (!startCoords || !endCoords) {
                throw new Error('Impossible de trouver les coordonnées des villes dans le booking');
            }

            // Vérifier que les coordonnées sont valides
            if (
                typeof startCoords.latitude !== 'number' ||
                typeof startCoords.longitude !== 'number' ||
                typeof endCoords.latitude !== 'number' ||
                typeof endCoords.longitude !== 'number'
            ) {
                throw new Error('Les coordonnées du booking ne sont pas valides');
            }

            setStartPoint(startCoords);
            setEndPoint(endCoords);

            // Calculer l'itinéraire
            const route = await routingService.getRoute(startCoords, endCoords);
            setRoutePath(route);
            console.log('Itinéraire calculé avec succès:', route.length, 'points');
        } catch (error) {
            console.error('Erreur calcul itinéraire:', error);
            setError('Impossible de calculer l\'itinéraire');
            // En cas d'erreur, utiliser un itinéraire simplifié
            if (startPoint && endPoint) {
                setRoutePath([startPoint, endPoint]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Centre la carte sur l'itinéraire
     */
    const centerMapOnRoute = () => {
        if (!startPoint || !endPoint || !mapRef.current) return;

        const coordinates = [startPoint, endPoint];
        if (passengerLocation) {
            coordinates.push({
                latitude: passengerLocation.latitude,
                longitude: passengerLocation.longitude,
            });
        }

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
        });
    };

    /**
     * Centre la carte sur la position de l'utilisateur
     */
    const centerOnMe = () => {
        if (passengerLocation && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: passengerLocation.latitude, longitude: passengerLocation.longitude },
                zoom: 15,
            });
        }
    };

    /**
     * Centre la carte sur le point de départ
     */
    const centerOnStartPoint = () => {
        if (startPoint && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: startPoint.latitude, longitude: startPoint.longitude },
                zoom: 15,
            });
        }
    };

    /**
     * Centre la carte sur le point d'arrivée
     */
    const centerOnEndPoint = () => {
        if (endPoint && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: endPoint.latitude, longitude: endPoint.longitude },
                zoom: 15,
            });
        }
    };

    /**
     * Gère la sélection manuelle d'une position sur la carte
     * @param coordinate Coordonnées de la position sélectionnée
     */
    const handleMapPress = async (coordinate: { latitude: number; longitude: number }) => {
        if (!isManualMode) return;

        // Arrêter le suivi automatique
        stopLocationTracking();

        // Mettre à jour la position
        const locationData: PassengerLocation = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            timestamp: new Date().toISOString(),
        };
        setPassengerLocation(locationData);

        // Obtenir l'adresse de la position sélectionnée
        const address = await getAddressFromCoordinates(
            coordinate.latitude,
            coordinate.longitude
        );
        setCurrentAddress(address);
    };

    /**
     * Bascule entre le mode géolocalisation automatique et le mode sélection manuelle
     */
    const toggleLocationMode = () => {
        const newMode = !isManualMode;
        setIsManualMode(newMode);

        if (newMode) {
            // Mode manuel : arrêter le suivi automatique
            stopLocationTracking();
        } else {
            // Mode automatique : relancer la géolocalisation
            initPassengerLocation();
        }
    };

    /**
     * Calcule la durée estimée du trajet à partir des heures de départ et d'arrivée
     * @returns La durée formatée (ex: "3h 00min") ou null si les heures ne sont pas disponibles
     */
    const calculateDuration = (): string | null => {
        if (!booking.departureTime || !booking.arrivalTime) {
            return null;
        }

        try {
            // Parser les heures au format HH:MM
            const [departureHours, departureMinutes] = booking.departureTime.split(':').map(Number);
            const [arrivalHours, arrivalMinutes] = booking.arrivalTime.split(':').map(Number);

            // Calculer la différence en minutes
            const departureTotalMinutes = departureHours * 60 + departureMinutes;
            const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;

            // Gérer le cas où l'arrivée est le lendemain (arrivalTime < departureTime)
            let diffMinutes = arrivalTotalMinutes - departureTotalMinutes;
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // Ajouter 24 heures
            }

            // Convertir en heures et minutes
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            // Formater la durée
            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return `${minutes}min`;
            }
        } catch (error) {
            console.error('Erreur calcul durée:', error);
            return null;
        }
    };

    /**
     * Extrait un code de ville à partir du nom de la ville
     * Prend les 3 premières lettres en majuscules
     * @param cityName Nom de la ville
     * @returns Code de la ville (ex: "CPH" pour "Copenhagen")
     */
    const getCityCode = (cityName: string): string => {
        if (!cityName) return '';
        // Prendre les 3 premières lettres et les mettre en majuscules
        return cityName.substring(0, 3).toUpperCase();
    };

    /**
     * Obtient le fuseau horaire approximatif basé sur la longitude
     * @param longitude Longitude de la position
     * @returns Fuseau horaire formaté (ex: "UTC+2")
     */
    const getTimezone = (longitude: number): string => {
        // Approximation : chaque 15 degrés de longitude = 1 heure de différence
        // UTC+0 est à 0° de longitude
        const timezoneOffset = Math.round(longitude / 15);
        // Limiter entre UTC-12 et UTC+14
        const offset = Math.max(-12, Math.min(14, timezoneOffset));
        return `UTC${offset >= 0 ? '+' : ''}${offset}`;
    };

    /**
     * Retourne le composant de chargement
     */
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                    Calcul de l'itinéraire...
                </Text>
            </View>
        );
    }

    /**
     * Retourne le composant d'erreur
     */
    if (error && routePath.length === 0) {
        return (
            <View style={[styles.errorContainer, { backgroundColor }]}>
                <Ionicons name="alert-circle" size={64} color="#F44336" />
                <Text style={[styles.errorTitle, { color: textColor }]}>Erreur</Text>
                <Text style={[styles.errorText, { color: secondaryTextColor }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: accentColor }]}
                    onPress={calculateRouteFromBooking}
                >
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    /**
     * Retourne le composant de chargement si pas de localisation
     */
    if (!passengerLocation) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                    Obtention de votre position...
                </Text>
            </View>
        );
    }

    console.log('TripRouteViewer render ==>, ', booking);

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Carte OpenStreetMap */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: passengerLocation.latitude,
                    longitude: passengerLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsMyLocationButton={!isManualMode}
                showsCompass={true}
                showsScale={true}
                mapType={isDarkMode ? 'standard' : 'standard'}
                userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
                onPress={(event) => {
                    if (isManualMode && event.nativeEvent.coordinate) {
                        handleMapPress(event.nativeEvent.coordinate);
                    }
                }}
            >
                {/* Itinéraire du trajet */}
                {routePath.length > 0 && (
                    <Polyline
                        coordinates={routePath}
                        strokeColor={accentColor}
                        strokeWidth={6}
                    />
                )}

                {/* Point de départ */}
                {startPoint && (
                    <Marker
                        coordinate={startPoint}
                        title="Point de départ"
                        identifier="start-point"
                        description={booking.trip.stationFrom.city}
                    >
                        <View style={styles.startMarker}>
                            <View style={
                                { 
                                    backgroundColor: '#4CAF50',
                                    display: 'flex',
                                    alignSelf: 'center',
                                    borderRadius: 100,
                                }
                            }>
                                <Ionicons name="bus-outline" size={22} color="#fff" />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Point d'arrivée */}
                {endPoint && (
                    <Marker
                        coordinate={endPoint}
                        title="Point d'arrivée"
                        identifier="end-point"
                        description={booking.trip.stationTo.city}
                    >
                        <View style={styles.endMarker}>
                            <View style={
                                { 
                                    backgroundColor: '#F44336',
                                    display: 'flex',
                                    alignSelf: 'center',
                                    borderRadius: 100,
                                }
                            }>
                                <Ionicons name="stop-outline" size={22} color="#fff" />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Position du passager */}
                <Marker
                    coordinate={{
                        latitude: passengerLocation.latitude,
                        longitude: passengerLocation.longitude,
                    }}
                    title="Vous êtes ici"
                >
                    <View style={styles.userMarker}>
                        <View style={
                            { 
                                backgroundColor: "#1776BA",
                                display: 'flex',
                                alignSelf: 'center',
                                borderRadius: 100,
                            }
                        }>
                            <Ionicons name="locate" size={22} color="#fff" />
                        </View>
                    </View>
                </Marker>
            </MapView>

            {/* En-tête de navigation */}
            <View style={[styles.header, { backgroundColor: "transparent", paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={[
                        styles.headerButton,
                        { backgroundColor: backgroundColor }
                    ]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={20} color={textColor} />
                </TouchableOpacity>
                {/* <Text style={[styles.headerTitle, { color: textColor }]}>Itinéraire du trajet</Text> */}
                {/* <View style={styles.headerRightButtons} /> */}
            </View>

            {/* Boutons de contrôle au-dessus du panneau d'information */}
            <View style={styles.controlButtonsContainer}>
                {/* <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: iconCircleBackgroundColor }]}
                    onPress={toggleLocationMode}
                >
                    <Ionicons 
                        name={isManualMode ? "location" : "location-outline"} 
                        size={20} 
                        color={isManualMode ? accentColor : textColor} 
                    />
                </TouchableOpacity> */}
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: iconCircleBackgroundColor }]}
                    onPress={centerOnMe}
                >
                    <Ionicons name="locate" size={20} color={textColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: iconCircleBackgroundColor }]}
                    onPress={centerMapOnRoute}
                >
                    <Ionicons name="expand-outline" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Panneau d'informations */}
            <View style={[styles.infoPanel, { backgroundColor: panelBackgroundColor }]}>
                <View style={
                    { 
                        width: 50, height: 6, 
                        backgroundColor: borderColor, 
                        alignSelf: 'center', borderRadius: 15,
                        marginBottom: 30, borderWidth: 1.5, 
                        borderColor: borderColor,
                    }
                }/>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollViewContent, { paddingBottom: Math.max(20, insets.bottom) }]}
                    showsVerticalScrollIndicator={true}
                >
                    {/* En-tête avec destination et durée */}
                    <View style={[styles.panelHeader, { backgroundColor: cardBackgroundColor }]}>
                        <View style={[
                            styles.headerContent, 
                            { 
                                borderWidth: 1.5, 
                                borderColor: borderColor,
                                borderRadius: 20,
                                paddingHorizontal: 16,
                                paddingVertical: 20,
                                backgroundColor: cardBackgroundColor,
                                // shadowColor: '#000',
                                // shadowOffset: { width: 0, height: 2 },
                                // shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.08,
                                // shadowRadius: 8,
                                // elevation: 4,
                            }
                        ]}>
                            {/* Section de départ */}
                            <View style={styles.headerColumn}>
                                <View style={[styles.cityCodeBadge, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F0F4F8' }]}>
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {getCityCode(booking.trip.stationFrom.city)}
                                    </Text>
                                </View>
                                <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                    {booking.trip.stationFrom.city}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                        {getTimezone(booking.trip.stationFrom.coordinate.longitude)}
                                    </Text>
                                </View>
                            </View>

                            {/* Icône de bus au centre avec ligne décorative */}
                            <View style={styles.headerCenterSection}>
                                <View style={[styles.headerIconContainer, { backgroundColor: '#1776BA' }]}>
                                    <Ionicons name="bus-outline" size={20} color="#fff" />
                                </View>
                                <View style={[styles.headerConnectorLine, { backgroundColor: borderColor }]} />
                            </View>

                            {/* Section d'arrivée */}
                            <View style={styles.headerColumn}>
                                <View style={[styles.cityCodeBadge, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F0F4F8' }]}>
                                    <Text style={[styles.headerCityCode, { color: textColor }]}>
                                        {getCityCode(booking.trip.stationTo.city)}
                                    </Text>
                                </View>
                                <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                    {booking.trip.stationTo.city}
                                </Text>
                                <View style={styles.timezoneContainer}>
                                    <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                        {getTimezone(booking.trip.stationTo.coordinate.longitude)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* Durée du trajet avec badge */}
                        {calculateDuration() && booking.arrivalTime && (
                            <View style={[styles.durationBadge, { backgroundColor: "#1776BA", borderColor: "#1776BA" }]}>
                                <Ionicons name="time" size={18} color="#fff" />
                                <Text style={[styles.headerDuration, { color: "#fff" }]}>
                                    Durée estimée du trajet : {calculateDuration()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Indicateur de mode sélection manuelle */}
                    {isManualMode && (
                        <View style={[styles.modeIndicator, { backgroundColor: accentColorLight, borderColor: accentColor }]}>
                            <View style={[styles.modeIndicatorIconContainer, { backgroundColor: accentColor }]}>
                                <Ionicons name="hand-left-outline" size={16} color="#fff" />
                            </View>
                            <View style={styles.modeIndicatorTextContainer}>
                                <Text style={[styles.modeIndicatorTitle, { color: accentColor }]}>
                                    Mode sélection manuelle
                                </Text>
                                <Text style={[styles.modeIndicatorText, { color: accentColor }]}>
                                    Appuyez sur la carte pour choisir votre position
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Liste des étapes */}
                    <View style={styles.stepsContainer}>
                        {/* Position actuelle */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnMe}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: "#1776BA" }]}>
                                        <Ionicons name="locate" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: borderColor }]} />
                            </View>
                            <TouchableOpacity 
                                style={[styles.stepCard, { backgroundColor: listItemBackgroundColor }]}
                                activeOpacity={0.7}
                                onPress={centerOnMe}
                            >
                                <View style={styles.stepCardHeader}>
                                    <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={2}>
                                        Position actuelle
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                                </View>
                                <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={2}>
                                    {currentAddress}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Ville de départ */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnStartPoint}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: '#4CAF50' }]}>
                                        <Ionicons name="bus-outline" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: borderColor }]} />
                            </View>
                            <TouchableOpacity 
                                style={[styles.stepCard, { backgroundColor: listItemBackgroundColor }]}
                                activeOpacity={0.7}
                                onPress={centerOnStartPoint}
                            >
                                <View style={styles.stepCardHeader}>
                                    <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                        Ville de départ
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                                </View>
                                <View style={styles.stepCardDetails}>
                                    <Ionicons name="location" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={1}>
                                        {booking.trip.stationFrom.city}
                                    </Text>
                                </View>
                                <View style={styles.stepCardDetails}>
                                    <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                        Départ prévu à {booking.departureTime}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Ville d'arrivée */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity
                                    onPress={centerOnEndPoint}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepIconContainer, { backgroundColor: "#F44336" }]}>
                                        <Ionicons name="stop-outline" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                                style={[styles.stepCard, { backgroundColor: listItemBackgroundColor }]}
                                activeOpacity={0.7}
                                onPress={centerOnEndPoint}
                            >
                                <View style={styles.stepCardHeader}>
                                    <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                        Ville d'arrivée
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                                </View>
                                <View style={styles.stepCardDetails}>
                                    <Ionicons name="location" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.stepSubText, { color: secondaryTextColor }]} numberOfLines={1}>
                                        {booking.trip.stationTo.city}
                                    </Text>
                                </View>
                                <View style={styles.stepCardDetails}>
                                    <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                    <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                        Arrivée prévue à {booking.arrivalTime}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        paddingHorizontal: 20,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 4,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButtonsContainer: {
        position: 'absolute',
        bottom: '46%',
        right: 20,
        flexDirection: 'column',
        gap: 12,
        zIndex: 10,
        // borderWidth: 1,
        // borderColor: 'red',
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.2,
        // shadowRadius: 4,
        // elevation: 4,
    },
    startMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        overflow: 'hidden',
    },
    startMarkerInner: {
        width: 36,
        height: 36,
        // borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        // borderWidth: 3,
        // borderColor: 'white',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        // elevation: 6,
        overflow: 'hidden',
    },
    endMarker: {
        width: 48,
        height: 48,
        // borderRadius: 24,
        // justifyContent: 'center',
        // alignItems: 'center',
        // backgroundColor: 'rgba(244, 67, 54, 0.2)',
        overflow: 'hidden',
    },
    endMarkerInner: {
        width: 36,
        height: 36,
        // borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        // borderWidth: 3,
        // borderColor: 'white',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        // elevation: 6,
        overflow: 'hidden',
    },
    userMarker: {
        width: 44,
        height: 44,
        borderRadius: 100,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    userMarkerInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        // padding: 8,
        // borderWidth: 3,
        // borderColor: 'white',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 3,
        // elevation: 5,
        // overflow: 'hidden',
    },
    infoPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 20,
        paddingBottom: 20,
        // borderWidth: 2,
        // borderColor: '#E0E0E0',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: -4 },
        // shadowOpacity: 0.1,
        // shadowRadius: 8,
        // elevation: 8,
        maxHeight: '45%',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    panelHeader: {
        marginBottom: 16,
        borderRadius: 16,
        // padding: 20,
        paddingHorizontal: 15,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    headerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    cityCodeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 8,
    },
    headerCityCode: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerCityName: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 6,
        textAlign: 'center',
    },
    timezoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerTimezone: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    headerCenterSection: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#1776BA',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        // elevation: 4,
    },
    headerConnectorLine: {
        width: 2,
        height: 30,
        marginTop: 8,
        opacity: 0.4,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 1.5,
        gap: 8,
    },
    headerDuration: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'center',
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 16,
        marginHorizontal: 15,
        borderWidth: 1.5,
        gap: 12,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.1,
        // shadowRadius: 3,
        // elevation: 2,
    },
    modeIndicatorIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeIndicatorTextContainer: {
        flex: 1,
    },
    modeIndicatorTitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 2,
    },
    modeIndicatorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        opacity: 0.9,
    },
    stepsContainer: {
        paddingHorizontal: 15,
        gap: 16,
        marginTop: 30,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepLeft: {
        alignItems: 'center',
        marginRight: 14,
        width: 36,
    },
    stepIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.2,
        // shadowRadius: 3,
        // elevation: 3,
    },
    stepLine: {
        width: 2,
        height: 60,
        marginTop: 6,
        marginBottom: 4,
        opacity: 0.3,
        borderRadius: 1,
    },
    stepCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        minHeight: 70,
        justifyContent: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.08,
        // shadowRadius: 4,
        // elevation: 2,
    },
    stepCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepMainText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    stepCardDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    stepSubText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
});
