// @ts-nocheck
import { getCities } from "@/api/city";
import { getAvailableDepartures } from "@/api/departure";
import { BottomSheet } from "@/components/bottom-sheet";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { City, PopularTrip } from "@/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";


/**
 * Écran de recherche de trajet avec formulaire de recherche
 * Affiche un formulaire avec plusieurs champs pour rechercher un trajet
 */
const TripSearch = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute();
    const { popularTrip } = (route.params as { popularTrip?: PopularTrip }) || {};
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour les champs et modals
    const fieldBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const fieldTextColor = colorScheme === 'dark' ? '#ECEDEE' : '#1776ba';
    const fieldPlaceholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7';
    const modalBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const datePickerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cancelTextColor = colorScheme === 'dark' ? '#FF453A' : '#ff0000';
    const confirmTextColor = colorScheme === 'dark' ? '#0A84FF' : '#1776ba';

    // Ref pour tracker si on a déjà lancé la recherche automatique
    const hasAutoSearched = useRef(false);

    // États pour les champs du formulaire
    const [departureCity, setDepartureCity] = useState<City | null>(null);
    const [arrivalCity, setArrivalCity] = useState<City | null>(null);
    const [departureType, setDepartureType] = useState('');
    const [departureDate, setDepartureDate] = useState<Date | null>(null);
    const [returnDate, setReturnDate] = useState<Date | null>(null);
    const [tempDepartureDate, setTempDepartureDate] = useState<Date>(new Date());
    const [tempReturnDate, setTempReturnDate] = useState<Date>(new Date());
    const [numberOfPersons, setNumberOfPersons] = useState<number>(1);
    const [loadingDepartures, setLoadingDepartures] = useState<boolean>(false);
    const [cities, setCities] = useState<Array<City>>([]);
    const [loadingCities, setLoadingCities] = useState<boolean>(false);

    // États pour les modals
    const [showDepartureModal, setShowDepartureModal] = useState(false);
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
    const typeDepartureOptions = [
        { id: 'ONE_WAY', label: 'Aller simple' },
        { id: 'ROUND_TRIP', label: 'Aller-retour' },
    ];
    const [typeDeparture, setTypeDeparture] = useState<string>(typeDepartureOptions[0].id);
    const [showTypeDepartureModal, setShowTypeDepartureModal] = useState<boolean>(false);

    const passengerOptions = [
        { value: 1, label: '1 voyageur' },
        { value: 2, label: '2 voyageurs' },
        { value: 3, label: '3 voyageurs' },
        { value: 4, label: '4 voyageurs' },
        { value: 5, label: '5 voyageurs' },
        { value: 6, label: '6 voyageurs' },
        { value: 7, label: '7 voyageurs' },
        { value: 8, label: '8 voyageurs' },
        { value: 9, label: '9 voyageurs' },
        { value: 10, label: '10 voyageurs' }
    ];
    const [showPassengerModal, setShowPassengerModal] = useState<boolean>(false);
    /**
     * Récupère les villes disponibles pour la recherche de trajet
     * @returns void
     */
    const getCitiesFunction = async () => {
        try {
            setLoadingCities(true);
            const response = await getCities();
            // console.log('Les villes disponibles : ', response?.data);
            setCities(response?.data || []);
        } catch (error: any) {
            console.error('Erreur dans la récupération des villes : ', error);
            setCities([]);
        } finally {
            setLoadingCities(false);
        }
    }


    /**
     * Pré-remplit les champs du formulaire avec les données du trajet populaire
     * @param trip - Le trajet populaire
     * @param citiesList - La liste des villes disponibles
     * @returns void
     */
    const prefillFormFromPopularTrip = (trip: PopularTrip, citiesList: City[]) => {
        // Trouver la ville de départ
        const fromCity = citiesList.find(city => city.id === trip.stationFrom.cityId);
        if (fromCity) {
            setDepartureCity(fromCity);
        }

        // Trouver la ville d'arrivée
        const toCity = citiesList.find(city => city.id === trip.stationTo.cityId);
        if (toCity) {
            setArrivalCity(toCity);
        }

        // Mettre la date du jour par défaut
        const today = new Date();
        setDepartureDate(today);
        setTempDepartureDate(today);
    }


    /**
     * Vérifie si tous les champs requis sont remplis et lance la recherche automatiquement
     * @returns void
     */
    const checkAndAutoSearch = () => {
        if (departureCity && arrivalCity && departureDate) {
            // Lancer la recherche automatiquement
            handleSearch();
        }
    }

    /**
     * Gère la sélection d'une ville de départ
     * @param city - La ville de départ
     * @returns void
     */
    const handleSelectDepartureCity = (city: City) => {
        setDepartureCity(city);
        setShowDepartureModal(false);
    };

    /**
     * Gère la sélection d'une ville d'arrivée
     * @param city - La ville d'arrivée
     * @returns void
     */
    const handleSelectArrivalCity = (city: City) => {
        setArrivalCity(city);
        setShowArrivalModal(false);
    };

    /**
     * Gère la sélection du type de départ
     * @param typeId - L'ID du type de départ
     * @returns void
     */
    const handleSelectTypeDeparture = (typeId: string) => {
        setTypeDeparture(typeId);
        setShowTypeDepartureModal(false);
        // Réinitialiser la date de retour si on passe en aller simple
        if (typeId === 'ONE_WAY') {
            setReturnDate(null);
        }
    };

    /**
     * Gère la sélection de la date de départ
     * @param event - L'événement
     * @param selectedDate - La date sélectionnée
     * @returns void
     */
    const handleDateChange = (event: any, selectedDate?: Date) => {
        // Sur Android, fermer immédiatement après sélection
        if (Platform.OS === 'android') {
            if (selectedDate) {
                setDepartureDate(selectedDate);
                setShowDatePicker(false);
            } else {
                setShowDatePicker(false);
            }
            return;
        }

        // Sur iOS, mettre à jour l'état temporaire pour afficher dans le picker
        if (selectedDate) {
            setTempDepartureDate(selectedDate);
        }
    };

    /**
     * Gère la sélection du nombre de voyageurs
     * @param value - Le nombre de voyageurs
     * @returns void
     */
    const handleSelectPassenger = (value: number) => {
        setNumberOfPersons(value);
        setShowPassengerModal(false);
    };

    /**
     * Formate une date au format YYYY-MM-DD
     * @param date - La date à formater
     * @returns string - La date formatée au format YYYY-MM-DD ou une chaîne vide si la date est null
     */
    const formatDateToYYYYMMDD = (date: Date | null): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Gère la recherche de trajet
     * @returns void
     */
    const handleSearch = async () => {

        // Vérification que tous les champs requis sont remplis (sauf date de retour pour ONE_WAY)
        if (!departureCity || !arrivalCity || !departureDate) {
            Alert.alert('Attention !', 'Veuillez sélectionner une ville de départ, une ville d\'arrivée et une date de départ');
            return;
        }

        // Pour un aller-retour, vérifier aussi la date de retour
        if (typeDeparture === 'ROUND_TRIP' && !returnDate) {
            Alert.alert('Attention !', 'Veuillez sélectionner une date de retour pour un aller-retour');
            return;
        }

        const queryParams = `page=1&pageSize=10&cityFromId=${departureCity?.id}&cityToId=${arrivalCity?.id}&dateFrom=${formatDateToYYYYMMDD(departureDate)}&dateTo=&companyId=&passengerCount=${numberOfPersons}`;

        setLoadingDepartures(true);
        const response = await getAvailableDepartures(queryParams).catch((error: any) => {
            setLoadingDepartures(false);
            // console.error('Erreur dans la récupération des départs : ', error);
            Alert.alert('Attention !', 'Une erreur est survenue lors de la recherche des départs');
            return null;
        });
        console.log('Les départs disponibles : ', response?.data);
        setLoadingDepartures(false);
        if (response?.data?.items?.length > 0) {
            navigation.navigate('trip/trip-list', { 
                departures: response?.data, 
                searchParams: { 
                    numberOfPersons,
                    tripType: typeDeparture,
                    departureCity: departureCity,
                    arrivalCity: arrivalCity,
                    returnDate: returnDate
                } 
            });
        } else {
            Alert.alert('Information !', 'Aucun départ disponible pour la recherche, veuillez ajuster vos filtres de recherche.');
        }
    };

    /**
     * Liste filtrée des villes pour le départ (exclut la ville d'arrivée)
     * @returns Array<City>
     */
    const availableDepartureCities = useMemo(() => {
        if (!arrivalCity) return cities;
        return cities.filter(city => city.id !== arrivalCity.id);
    }, [cities, arrivalCity]);

    /**
     * Liste filtrée des villes pour l'arrivée (exclut la ville de départ)
     * @returns Array<City>
     */
    const availableArrivalCities = useMemo(() => {
        if (!departureCity) return cities;
        return cities.filter(city => city.id !== departureCity.id);
    }, [cities, departureCity]);


    /**
     * Pour récupérer les villes disponibles
     * @returns void
     */
    useEffect(() => {
        getCitiesFunction();
    }, []);

    /**
     * Pour pré-remplir le formulaire quand le trajet populaire et les villes sont disponibles
     * @returns void
     */
    useEffect(() => {
        // Vérifier qu'on a un popularTrip (on vient de l'écran d'accueil)
        if (popularTrip && cities.length > 0 && !hasAutoSearched.current) {
            // Pré-remplir le formulaire
            prefillFormFromPopularTrip(popularTrip, cities);
        }
    }, [popularTrip, cities]);

    /**
     * Pour lancer automatiquement la recherche si tous les champs sont remplis
     * uniquement quand on vient de l'écran d'accueil avec un popularTrip
     * @returns void
     */
    useEffect(() => {
        // Vérifier qu'on a un popularTrip et que tous les champs sont remplis
        // et qu'on n'a pas déjà lancé la recherche automatique
        if (popularTrip && departureCity && arrivalCity && departureDate && !hasAutoSearched.current) {
            // Marquer qu'on a lancé la recherche pour éviter les appels multiples
            hasAutoSearched.current = true;
            
            // Lancer la recherche automatiquement après un court délai
            // pour s'assurer que tous les états sont bien mis à jour
            const timer = setTimeout(() => {
                handleSearch();
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [popularTrip, departureCity, arrivalCity, departureDate]);


    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Header avec bouton retour */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                    {/* <Text style={styles.backButtonText}>Retour</Text> */}
                </Pressable>
            </View>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.sectionTitle, { color: textColor }]}>Rechercher un trajet</Text>
                {/* Formulaire de recherche */}
                <View style={[styles.formContainer]}>
                    {/* Ville de départ */}
                    <Pressable
                        style={[styles.field, { backgroundColor: fieldBackgroundColor }]}
                        onPress={() => setShowDepartureModal(true)}
                    >
                        <Icon name="map-marker" size={20} color={tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: departureCity ? fieldTextColor : fieldPlaceholderColor }
                        ]}>
                            {departureCity ? departureCity.name : 'Ville de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={iconColor} />
                    </Pressable>

                    {/* Ville d'arrivée */}
                    <Pressable
                        style={[styles.field, { backgroundColor: fieldBackgroundColor }]}
                        onPress={() => setShowArrivalModal(true)}
                    >
                        <Icon name="map-marker" size={20} color={tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: arrivalCity ? fieldTextColor : fieldPlaceholderColor }
                        ]}>
                            {arrivalCity ? arrivalCity.name : 'Ville d\'arrivée'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={iconColor} />
                    </Pressable>

                    {/* Type de départ */}
                    <Pressable 
                        style={[styles.field, { backgroundColor: fieldBackgroundColor }]} 
                        onPress={() => setShowTypeDepartureModal(true)}
                    >
                        <Icon name="bus" size={20} color={tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: typeDeparture ? fieldTextColor : fieldPlaceholderColor }
                        ]}>
                            {typeDeparture
                                ? typeDepartureOptions.find(opt => opt.id === typeDeparture)?.label
                                : 'Type de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={iconColor} />
                    </Pressable>

                    {/* Départ (date) */}
                    <Pressable
                        style={[styles.field, { backgroundColor: fieldBackgroundColor }]}
                        onPress={() => {
                            setDepartureDate(tempDepartureDate);
                            setShowDatePicker(true);
                        }}
                    >
                        <Icon name="calendar" size={20} color={tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: departureDate ? fieldTextColor : fieldPlaceholderColor }
                        ]}>
                            {departureDate
                                ? departureDate.toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })
                                : 'Date de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={iconColor} />
                    </Pressable>

                    {/* Date de retour - Affiché uniquement si Aller-retour */}
                    {typeDeparture === 'ROUND_TRIP' && (
                        <Pressable
                            style={[styles.field, { backgroundColor: fieldBackgroundColor }]}
                            onPress={() => {
                                setReturnDate(tempReturnDate);
                                setShowReturnDatePicker(true);
                            }}
                        >
                            <Icon name="calendar" size={20} color={tintColor} />
                            <Text style={[
                                styles.fieldText,
                                { color: returnDate ? fieldTextColor : fieldPlaceholderColor }
                            ]}>
                                {returnDate
                                    ? returnDate.toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })
                                    : 'Date de retour'}
                            </Text>
                            <Icon name="chevron-down" size={20} color={iconColor} />
                        </Pressable>
                    )}

                    {/* Nombre de personnes */}
                    <Pressable 
                        style={[styles.field, { backgroundColor: fieldBackgroundColor }]} 
                        onPress={() => setShowPassengerModal(true)}
                    >
                        <Icon name="account-group" size={20} color={tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: numberOfPersons ? fieldTextColor : fieldPlaceholderColor }
                        ]}>
                            {numberOfPersons
                                ? passengerOptions.find(opt => opt.value === numberOfPersons)?.label
                                : 'Nombre de voyageurs'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={iconColor} />
                    </Pressable>

                    {/* Bouton Rechercher */}
                    <View style={{marginTop: 10}}>
                        {loadingDepartures &&
                            <View style={[styles.searchButton, { opacity: 0.5 }]}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            </View>
                        }

                        {!loadingDepartures &&
                            <Pressable
                                disabled={loadingDepartures}
                                style={styles.searchButton}
                                onPress={() => handleSearch()}
                            >
                                <MaterialIcons name="search" size={30} color="#FFFFFF" />
                            </Pressable>
                        }
                    </View>

                </View>
                {/* Formulaire de recherche */}
            </ScrollView>

            {/* BottomSheet de sélection ville de départ */}
            <BottomSheet
                visible={showDepartureModal}
                onClose={() => setShowDepartureModal(false)}
                title="Ville de départ"
                data={availableDepartureCities}
                loading={loadingCities}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    return (
                        <Pressable
                            style={[styles.cityItem, { borderBottomColor: borderColor }]}
                            onPress={() => {
                                handleSelectDepartureCity(item);
                                onClose();
                            }}
                        >
                            <Icon name="map-marker" size={20} color={tintColor} />
                            <Text style={[styles.cityItemText, { color: textColor }]}>{item.name}</Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={(item, searchTerm) => {
                    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
                }}
            />

            {/* BottomSheet de sélection ville d'arrivée */}
            <BottomSheet
                visible={showArrivalModal}
                onClose={() => setShowArrivalModal(false)}
                title="Ville d'arrivée"
                data={availableArrivalCities}
                loading={loadingCities}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    return (
                        <Pressable
                            style={[styles.cityItem, { borderBottomColor: borderColor }]}
                            onPress={() => {
                                handleSelectArrivalCity(item);
                                onClose();
                            }}
                        >
                            <Icon name="map-marker" size={20} color={tintColor} />
                            <Text style={[styles.cityItemText, { color: textColor }]}>{item.name}</Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={(item, searchTerm) => {
                    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
                }}
            />

            {/* BottomSheet de sélection type de départ */}
            <BottomSheet
                visible={showTypeDepartureModal}
                onClose={() => setShowTypeDepartureModal(false)}
                title="Type de départ"
                data={typeDepartureOptions}
                loading={false}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    const isSelected = typeDeparture === item.id;
                    return (
                        <Pressable
                            style={[styles.typeItem, { borderBottomColor: borderColor }]}
                            onPress={() => {
                                handleSelectTypeDeparture(item.id);
                                onClose();
                            }}
                        >
                            <Icon
                                name={isSelected ? "check-circle" : "circle-outline"}
                                size={24}
                                color={isSelected ? tintColor : iconColor}
                            />
                            <Text style={[
                                styles.typeItemText,
                                { color: isSelected ? tintColor : textColor }
                            ]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucun type disponible"
            />

            {/* BottomSheet de sélection nombre de voyageurs */}
            <BottomSheet
                visible={showPassengerModal}
                onClose={() => setShowPassengerModal(false)}
                title="Nombre de voyageurs"
                data={passengerOptions}
                loading={false}
                keyExtractor={(item) => item.value.toString()}
                renderItem={(item, onClose) => {
                    const isSelected = numberOfPersons === item.value;
                    return (
                        <Pressable
                            style={[styles.typeItem, { borderBottomColor: borderColor }]}
                            onPress={() => {
                                handleSelectPassenger(item.value);
                                onClose();
                            }}
                        >
                            <Icon
                                name={isSelected ? "check-circle" : "circle-outline"}
                                size={24}
                                color={isSelected ? tintColor : iconColor}
                            />
                            <Text style={[
                                styles.typeItemText,
                                { color: isSelected ? tintColor : textColor }
                            ]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune option disponible"
            />

            {/* DatePicker pour la date de départ */}
            {Platform.OS === 'ios' && showDatePicker && (
                <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <Pressable
                        style={styles.datePickerModal}
                        onPress={() => setShowDatePicker(false)}
                    >
                        <Pressable
                            style={[
                                styles.datePickerContainer, 
                                { 
                                    paddingBottom: insets.bottom + 20,
                                    backgroundColor: datePickerBackgroundColor
                                }
                            ]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={[styles.datePickerHeader, { borderBottomColor: borderColor, backgroundColor: datePickerBackgroundColor }]}>
                                <Pressable onPress={() => setShowDatePicker(false)}>
                                    <Text style={[styles.datePickerCancel, { color: cancelTextColor }]}>Annuler</Text>
                                </Pressable>
                                <Text style={[styles.datePickerTitle, { color: textColor }]} numberOfLines={1}>
                                    Date de départ
                                </Text>
                                <Pressable onPress={() => {
                                    setDepartureDate(tempDepartureDate);
                                    setShowDatePicker(false);
                                }}>
                                    <Text style={[styles.datePickerConfirm, { color: confirmTextColor }]}>Confirmer</Text>
                                </Pressable>
                            </View>
                            <View style={styles.datePickerContent}>
                                <DateTimePicker
                                    value={tempDepartureDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) {
                                            setTempDepartureDate(selectedDate);
                                        }
                                    }}
                                    minimumDate={new Date()}
                                    locale="fr-FR"
                                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                />
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={departureDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        if (selectedDate) {
                            setDepartureDate(selectedDate);
                        }
                        setShowDatePicker(false);
                    }}
                    minimumDate={new Date()}
                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                />
            )}

            {/* DatePicker pour la date de retour */}
            {typeDeparture === 'ROUND_TRIP' && (
                <>
                    {Platform.OS === 'ios' && showReturnDatePicker && (
                        <Modal
                            visible={showReturnDatePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setShowReturnDatePicker(false)}
                        >
                            <Pressable
                                style={styles.datePickerModal}
                                onPress={() => setShowReturnDatePicker(false)}
                            >
                                <Pressable
                                    style={[
                                        styles.datePickerContainer, 
                                        { 
                                            paddingBottom: insets.bottom + 20,
                                            backgroundColor: datePickerBackgroundColor
                                        }
                                    ]}
                                    onPress={(e) => e.stopPropagation()}
                                >
                                    <View style={[styles.datePickerHeader, { borderBottomColor: borderColor, backgroundColor: datePickerBackgroundColor }]}>
                                        <Pressable onPress={() => setShowReturnDatePicker(false)}>
                                            <Text style={[styles.datePickerCancel, { color: cancelTextColor }]}>Annuler</Text>
                                        </Pressable>
                                        <Text style={[styles.datePickerTitle, { color: textColor }]} numberOfLines={1}>
                                            Date de retour
                                        </Text>
                                        <Pressable onPress={() => {
                                            setReturnDate(tempReturnDate);
                                            setShowReturnDatePicker(false);
                                        }}>
                                            <Text style={[styles.datePickerConfirm, { color: confirmTextColor }]}>Confirmer</Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.datePickerContent}>
                                        <DateTimePicker
                                            value={tempReturnDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(event, selectedDate) => {
                                                if (selectedDate) {
                                                    setTempReturnDate(selectedDate);
                                                }
                                            }}
                                            minimumDate={departureDate || new Date()}
                                            locale="fr-FR"
                                            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                        />
                                    </View>
                                </Pressable>
                            </Pressable>
                        </Modal>
                    )}

                    {Platform.OS === 'android' && showReturnDatePicker && (
                        <DateTimePicker
                            value={returnDate || departureDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                if (selectedDate) {
                                    setReturnDate(selectedDate);
                                }
                                setShowReturnDatePicker(false);
                            }}
                            minimumDate={departureDate || new Date()}
                            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                        />
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        zIndex: 1000,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        padding: 15,
        paddingLeft: 20,
    },
    backButtonText: {
        fontSize: 16,
        color: '#000',
        fontFamily: 'Ubuntu_Medium',
        marginLeft: 10,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    formContainer: {
        borderRadius: 20,
        padding: 20,
        gap: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    field: {
        borderRadius: 15,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 12,
        marginVertical: 3,
    },
    fieldText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    dateLabel: {
        flex: 1,
        fontSize: 15,
    },
    datePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        minHeight: 320,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        minHeight: 56,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    datePickerCancel: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    datePickerTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    datePickerConfirm: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    searchButton: {
        backgroundColor: '#1776ba',
        borderRadius: 100,
        height: 55,
        width: 55,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Ubuntu_Medium',
    },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        gap: 12,
    },
    cityItemText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    fieldPlaceholder: {
        // Couleur gérée dynamiquement
    },
    typeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        gap: 12,
    },
    typeItemText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    typeItemTextSelected: {
        fontFamily: 'Ubuntu_Medium',
    },
    datePickerContent: {
        height: 216,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
});

export default TripSearch;