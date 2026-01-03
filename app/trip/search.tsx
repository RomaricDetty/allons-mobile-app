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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// Constantes extraites en dehors du composant pour éviter les recréations
const TYPE_DEPARTURE_OPTIONS = [
    { id: 'ONE_WAY', label: 'Aller simple' },
    { id: 'ROUND_TRIP', label: 'Aller-retour' },
] as const;

const PASSENGER_OPTIONS = [
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
] as const;

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
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
 * Formate une date pour l'affichage
 * @param date - La date à formater
 * @returns string - La date formatée ou une chaîne vide
 */
const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', DATE_FORMAT_OPTIONS);
};

/**
 * Composant réutilisable pour un champ de recherche
 */
interface SearchFieldProps {
    icon: string;
    placeholder: string;
    value: string;
    onPress: () => void;
    backgroundColor: string;
    textColor: string;
    placeholderColor: string;
    iconColor: string;
}

const SearchField = React.memo<SearchFieldProps>(({
    icon,
    placeholder,
    value,
    onPress,
    backgroundColor,
    textColor,
    placeholderColor,
    iconColor
}) => (
    <Pressable
        style={[styles.field, { backgroundColor }]}
        onPress={onPress}
    >
        <Icon name={icon} size={20} color={iconColor} />
        <Text style={[
            styles.fieldText,
            { color: value ? textColor : placeholderColor }
        ]}>
            {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={iconColor} />
    </Pressable>
));

SearchField.displayName = 'SearchField';

/**
 * Composant réutilisable pour le DatePicker iOS
 */
interface DatePickerModalProps {
    visible: boolean;
    title: string;
    value: Date;
    minimumDate?: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    cancelTextColor: string;
    confirmTextColor: string;
    insetsBottom: number;
    colorScheme: 'light' | 'dark';
}

const DatePickerModal = React.memo<DatePickerModalProps>(({
    visible,
    title,
    value,
    minimumDate,
    onConfirm,
    onCancel,
    backgroundColor,
    borderColor,
    textColor,
    cancelTextColor,
    confirmTextColor,
    insetsBottom,
    colorScheme
}) => {
    const [tempDate, setTempDate] = useState(value);

    useEffect(() => {
        if (visible) {
            setTempDate(value);
        }
    }, [visible, value]);

    if (!visible || Platform.OS !== 'ios') return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <Pressable
                style={styles.datePickerModal}
                onPress={onCancel}
            >
                <Pressable
                    style={[
                        styles.datePickerContainer,
                        {
                            paddingBottom: insetsBottom + 20,
                            backgroundColor
                        }
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={[styles.datePickerHeader, { borderBottomColor: borderColor, backgroundColor }]}>
                        <Pressable onPress={onCancel}>
                            <Text style={[styles.datePickerCancel, { color: cancelTextColor }]}>Annuler</Text>
                        </Pressable>
                        <Text style={[styles.datePickerTitle, { color: textColor }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Pressable onPress={() => onConfirm(tempDate)}>
                            <Text style={[styles.datePickerConfirm, { color: confirmTextColor }]}>Confirmer</Text>
                        </Pressable>
                    </View>
                    <View style={styles.datePickerContent}>
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                if (selectedDate) {
                                    setTempDate(selectedDate);
                                }
                            }}
                            minimumDate={minimumDate || new Date()}
                            locale="fr-FR"
                            themeVariant={colorScheme}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

DatePickerModal.displayName = 'DatePickerModal';

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
    
    // Couleurs spécifiques mémorisées pour éviter les recalculs
    const themeColors = useMemo(() => ({
        backgroundColor,
        textColor,
        iconColor,
        tintColor,
        fieldBackgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7',
        fieldTextColor: colorScheme === 'dark' ? '#ECEDEE' : '#1776ba',
        fieldPlaceholderColor: colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7',
        datePickerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        cancelTextColor: colorScheme === 'dark' ? '#FF453A' : '#ff0000',
        confirmTextColor: colorScheme === 'dark' ? '#0A84FF' : '#1776ba',
    }), [colorScheme, backgroundColor, textColor, iconColor, tintColor]);

    // Ref pour tracker si on a déjà lancé la recherche automatique
    const hasAutoSearched = useRef(false);

    // États pour les champs du formulaire
    const [departureCity, setDepartureCity] = useState<City | null>(null);
    const [arrivalCity, setArrivalCity] = useState<City | null>(null);
    const [departureDate, setDepartureDate] = useState<Date | null>(null);
    const [returnDate, setReturnDate] = useState<Date | null>(null);
    const [tempDepartureDate, setTempDepartureDate] = useState<Date>(new Date());
    const [tempReturnDate, setTempReturnDate] = useState<Date>(new Date());
    const [numberOfPersons, setNumberOfPersons] = useState<number>(1);
    const [typeDeparture, setTypeDeparture] = useState<string>(TYPE_DEPARTURE_OPTIONS[0].id);
    const [loadingDepartures, setLoadingDepartures] = useState<boolean>(false);
    const [cities, setCities] = useState<Array<City>>([]);
    const [loadingCities, setLoadingCities] = useState<boolean>(false);

    // États pour les modals - regroupés dans un objet pour réduire les re-renders
    const [modals, setModals] = useState({
        departure: false,
        arrival: false,
        typeDeparture: false,
        passenger: false,
        datePicker: false,
        returnDatePicker: false,
    });

    /**
     * Met à jour l'état d'un modal spécifique
     */
    const setModal = useCallback((key: keyof typeof modals, value: boolean) => {
        setModals(prev => ({ ...prev, [key]: value }));
    }, []);

    /**
     * Récupère les villes disponibles pour la recherche de trajet
     */
    const getCitiesFunction = useCallback(async () => {
        try {
            setLoadingCities(true);
            const response = await getCities();
            setCities(response?.data || []);
        } catch (error: any) {
            console.error('Erreur dans la récupération des villes : ', error);
            setCities([]);
        } finally {
            setLoadingCities(false);
        }
    }, []);

    /**
     * Pré-remplit les champs du formulaire avec les données du trajet populaire
     */
    const prefillFormFromPopularTrip = useCallback((trip: PopularTrip, citiesList: City[]) => {
        const fromCity = citiesList.find(city => city.id === trip.stationFrom.cityId);
        const toCity = citiesList.find(city => city.id === trip.stationTo.cityId);
        const today = new Date();

        if (fromCity) setDepartureCity(fromCity);
        if (toCity) setArrivalCity(toCity);
        setDepartureDate(today);
        setTempDepartureDate(today);
    }, []);

    /**
     * Gère la sélection d'une ville de départ
     */
    const handleSelectDepartureCity = useCallback((city: City) => {
        setDepartureCity(city);
        setModal('departure', false);
    }, [setModal]);

    /**
     * Gère la sélection d'une ville d'arrivée
     */
    const handleSelectArrivalCity = useCallback((city: City) => {
        setArrivalCity(city);
        setModal('arrival', false);
    }, [setModal]);

    /**
     * Gère la sélection du type de départ
     */
    const handleSelectTypeDeparture = useCallback((typeId: string) => {
        setTypeDeparture(typeId);
        setModal('typeDeparture', false);
        if (typeId === 'ONE_WAY') {
            setReturnDate(null);
        }
    }, [setModal]);

    /**
     * Gère la sélection du nombre de voyageurs
     */
    const handleSelectPassenger = useCallback((value: number) => {
        setNumberOfPersons(value);
        setModal('passenger', false);
    }, [setModal]);

    /**
     * Gère la sélection de la date de départ (Android)
     */
    const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            if (selectedDate) {
                setDepartureDate(selectedDate);
            }
            setModal('datePicker', false);
        }
    }, [setModal]);

    /**
     * Gère la sélection de la date de retour (Android)
     */
    const handleReturnDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            if (selectedDate) {
                setReturnDate(selectedDate);
            }
            setModal('returnDatePicker', false);
        }
    }, [setModal]);

    /**
     * Gère la recherche de trajet
     */
    const handleSearch = useCallback(async () => {
        if (!departureCity || !arrivalCity || !departureDate) {
            Alert.alert('Attention !', 'Veuillez sélectionner une ville de départ, une ville d\'arrivée et une date de départ');
            return;
        }

        if (typeDeparture === 'ROUND_TRIP' && !returnDate) {
            Alert.alert('Attention !', 'Veuillez sélectionner une date de retour pour un aller-retour');
            return;
        }

        const queryParams = `page=1&pageSize=10&cityFromId=${departureCity.id}&cityToId=${arrivalCity.id}&dateFrom=${formatDateToYYYYMMDD(departureDate)}&dateTo=&companyId=&passengerCount=${numberOfPersons}`;

        setLoadingDepartures(true);
        try {
            const response = await getAvailableDepartures(queryParams);
            console.log('Les départs disponibles : ', response?.data);
            
            if (response?.data?.items?.length > 0) {
                navigation.navigate('trip/trip-list', {
                    departures: response.data,
                    searchParams: {
                        numberOfPersons,
                        tripType: typeDeparture,
                        departureCity,
                        arrivalCity,
                        returnDate
                    }
                });
            } else {
                Alert.alert('Information !', 'Aucun départ disponible pour la recherche, veuillez ajuster vos filtres de recherche.');
            }
        } catch (error: any) {
            console.error('Erreur dans la récupération des départs : ', error);
            Alert.alert('Attention !', 'Une erreur est survenue lors de la recherche des départs');
        } finally {
            setLoadingDepartures(false);
        }
    }, [departureCity, arrivalCity, departureDate, returnDate, typeDeparture, numberOfPersons, navigation]);

    /**
     * Liste filtrée des villes pour le départ (exclut la ville d'arrivée)
     */
    const availableDepartureCities = useMemo(() => {
        if (!arrivalCity) return cities;
        return cities.filter(city => city.id !== arrivalCity.id);
    }, [cities, arrivalCity]);

    /**
     * Liste filtrée des villes pour l'arrivée (exclut la ville de départ)
     */
    const availableArrivalCities = useMemo(() => {
        if (!departureCity) return cities;
        return cities.filter(city => city.id !== departureCity.id);
    }, [cities, departureCity]);

    /**
     * Valeurs formatées pour l'affichage
     */
    const displayValues = useMemo(() => ({
        departureCityName: departureCity?.name || '',
        arrivalCityName: arrivalCity?.name || '',
        typeDepartureLabel: TYPE_DEPARTURE_OPTIONS.find(opt => opt.id === typeDeparture)?.label || '',
        departureDateFormatted: formatDateForDisplay(departureDate),
        returnDateFormatted: formatDateForDisplay(returnDate),
        passengerLabel: PASSENGER_OPTIONS.find(opt => opt.value === numberOfPersons)?.label || '',
    }), [departureCity, arrivalCity, typeDeparture, departureDate, returnDate, numberOfPersons]);

    // Récupération des villes au montage
    useEffect(() => {
        getCitiesFunction();
    }, [getCitiesFunction]);

    // Pré-remplissage du formulaire avec le trajet populaire
    useEffect(() => {
        if (popularTrip && cities.length > 0 && !hasAutoSearched.current) {
            prefillFormFromPopularTrip(popularTrip, cities);
        }
    }, [popularTrip, cities, prefillFormFromPopularTrip]);

    // Recherche automatique si tous les champs sont remplis
    useEffect(() => {
        if (popularTrip && departureCity && arrivalCity && departureDate && !hasAutoSearched.current) {
            hasAutoSearched.current = true;
            const timer = setTimeout(() => {
                handleSearch();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [popularTrip, departureCity, arrivalCity, departureDate, handleSearch]);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
            {/* Header avec bouton retour */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={themeColors.iconColor} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>
                    Rechercher un trajet
                </Text>

                <View style={styles.formContainer}>
                    {/* Ville de départ */}
                    <SearchField
                        icon="map-marker"
                        placeholder="Ville de départ"
                        value={displayValues.departureCityName}
                        onPress={() => setModal('departure', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        textColor={themeColors.fieldTextColor}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    {/* Ville d'arrivée */}
                    <SearchField
                        icon="map-marker"
                        placeholder="Ville d'arrivée"
                        value={displayValues.arrivalCityName}
                        onPress={() => setModal('arrival', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        textColor={themeColors.fieldTextColor}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    {/* Type de départ */}
                    <SearchField
                        icon="bus"
                        placeholder="Type de départ"
                        value={displayValues.typeDepartureLabel}
                        onPress={() => setModal('typeDeparture', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        textColor={themeColors.fieldTextColor}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    {/* Date de départ */}
                    <Pressable
                        style={[styles.field, { backgroundColor: themeColors.fieldBackgroundColor }]}
                        onPress={() => {
                            setDepartureDate(tempDepartureDate);
                            setModal('datePicker', true);
                        }}
                    >
                        <Icon name="calendar" size={20} color={themeColors.tintColor} />
                        <Text style={[
                            styles.fieldText,
                            { color: departureDate ? themeColors.fieldTextColor : themeColors.fieldPlaceholderColor }
                        ]}>
                            {displayValues.departureDateFormatted || 'Date de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color={themeColors.iconColor} />
                    </Pressable>

                    {/* Date de retour - Affiché uniquement si Aller-retour */}
                    {typeDeparture === 'ROUND_TRIP' && (
                        <Pressable
                            style={[styles.field, { backgroundColor: themeColors.fieldBackgroundColor }]}
                            onPress={() => {
                                setReturnDate(tempReturnDate);
                                setModal('returnDatePicker', true);
                            }}
                        >
                            <Icon name="calendar" size={20} color={themeColors.tintColor} />
                            <Text style={[
                                styles.fieldText,
                                { color: returnDate ? themeColors.fieldTextColor : themeColors.fieldPlaceholderColor }
                            ]}>
                                {displayValues.returnDateFormatted || 'Date de retour'}
                            </Text>
                            <Icon name="chevron-down" size={20} color={themeColors.iconColor} />
                        </Pressable>
                    )}

                    {/* Nombre de personnes */}
                    <SearchField
                        icon="account-group"
                        placeholder="Nombre de voyageurs"
                        value={displayValues.passengerLabel}
                        onPress={() => setModal('passenger', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        textColor={themeColors.fieldTextColor}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    {/* Bouton Rechercher */}
                    <View style={styles.searchButtonContainer}>
                        {loadingDepartures ? (
                            <View style={[styles.searchButton, { opacity: 0.5 }]}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            </View>
                        ) : (
                            <Pressable
                                disabled={loadingDepartures}
                                style={styles.searchButton}
                                onPress={handleSearch}
                            >
                                <MaterialIcons name="search" size={30} color="#FFFFFF" />
                            </Pressable>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* BottomSheet de sélection ville de départ */}
            <BottomSheet
                visible={modals.departure}
                onClose={() => setModal('departure', false)}
                title="Ville de départ"
                data={availableDepartureCities}
                loading={loadingCities}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => (
                    <Pressable
                        style={[styles.cityItem, { borderBottomColor: themeColors.borderColor }]}
                        onPress={() => {
                            handleSelectDepartureCity(item);
                            onClose();
                        }}
                    >
                        <Icon name="map-marker" size={20} color={themeColors.tintColor} />
                        <Text style={[styles.cityItemText, { color: themeColors.textColor }]}>
                            {item.name}
                        </Text>
                    </Pressable>
                )}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={(item, searchTerm) =>
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())
                }
            />

            {/* BottomSheet de sélection ville d'arrivée */}
            <BottomSheet
                visible={modals.arrival}
                onClose={() => setModal('arrival', false)}
                title="Ville d'arrivée"
                data={availableArrivalCities}
                loading={loadingCities}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => (
                    <Pressable
                        style={[styles.cityItem, { borderBottomColor: themeColors.borderColor }]}
                        onPress={() => {
                            handleSelectArrivalCity(item);
                            onClose();
                        }}
                    >
                        <Icon name="map-marker" size={20} color={themeColors.tintColor} />
                        <Text style={[styles.cityItemText, { color: themeColors.textColor }]}>
                            {item.name}
                        </Text>
                    </Pressable>
                )}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={(item, searchTerm) =>
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())
                }
            />

            {/* BottomSheet de sélection type de départ */}
            <BottomSheet
                visible={modals.typeDeparture}
                onClose={() => setModal('typeDeparture', false)}
                title="Type de départ"
                data={TYPE_DEPARTURE_OPTIONS}
                loading={false}
                keyExtractor={(item) => item.id}
                renderItem={(item, onClose) => {
                    const isSelected = typeDeparture === item.id;
                    return (
                        <Pressable
                            style={[styles.typeItem, { borderBottomColor: themeColors.borderColor }]}
                            onPress={() => {
                                handleSelectTypeDeparture(item.id);
                                onClose();
                            }}
                        >
                            <Icon
                                name={isSelected ? "check-circle" : "circle-outline"}
                                size={24}
                                color={isSelected ? themeColors.tintColor : themeColors.iconColor}
                            />
                            <Text style={[
                                styles.typeItemText,
                                { color: isSelected ? themeColors.tintColor : themeColors.textColor }
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
                visible={modals.passenger}
                onClose={() => setModal('passenger', false)}
                title="Nombre de voyageurs"
                data={PASSENGER_OPTIONS}
                loading={false}
                keyExtractor={(item) => item.value.toString()}
                renderItem={(item, onClose) => {
                    const isSelected = numberOfPersons === item.value;
                    return (
                        <Pressable
                            style={[styles.typeItem, { borderBottomColor: themeColors.borderColor }]}
                            onPress={() => {
                                handleSelectPassenger(item.value);
                                onClose();
                            }}
                        >
                            <Icon
                                name={isSelected ? "check-circle" : "circle-outline"}
                                size={24}
                                color={isSelected ? themeColors.tintColor : themeColors.iconColor}
                            />
                            <Text style={[
                                styles.typeItemText,
                                { color: isSelected ? themeColors.tintColor : themeColors.textColor }
                            ]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune option disponible"
            />

            {/* DatePicker pour la date de départ - iOS */}
            <DatePickerModal
                visible={modals.datePicker && Platform.OS === 'ios'}
                title="Date de départ"
                value={tempDepartureDate}
                minimumDate={new Date()}
                onConfirm={(date) => {
                    setDepartureDate(date);
                    setTempDepartureDate(date);
                    setModal('datePicker', false);
                }}
                onCancel={() => setModal('datePicker', false)}
                backgroundColor={themeColors.datePickerBackgroundColor}
                borderColor={themeColors.borderColor}
                textColor={themeColors.textColor}
                cancelTextColor={themeColors.cancelTextColor}
                confirmTextColor={themeColors.confirmTextColor}
                insetsBottom={insets.bottom}
                colorScheme={colorScheme}
            />

            {/* DatePicker pour la date de départ - Android */}
            {Platform.OS === 'android' && modals.datePicker && (
                <DateTimePicker
                    value={departureDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    themeVariant={colorScheme}
                />
            )}

            {/* DatePicker pour la date de retour - iOS */}
            {typeDeparture === 'ROUND_TRIP' && (
                <DatePickerModal
                    visible={modals.returnDatePicker && Platform.OS === 'ios'}
                    title="Date de retour"
                    value={tempReturnDate}
                    minimumDate={departureDate || new Date()}
                    onConfirm={(date) => {
                        setReturnDate(date);
                        setTempReturnDate(date);
                        setModal('returnDatePicker', false);
                    }}
                    onCancel={() => setModal('returnDatePicker', false)}
                    backgroundColor={themeColors.datePickerBackgroundColor}
                    borderColor={themeColors.borderColor}
                    textColor={themeColors.textColor}
                    cancelTextColor={themeColors.cancelTextColor}
                    confirmTextColor={themeColors.confirmTextColor}
                    insetsBottom={insets.bottom}
                    colorScheme={colorScheme}
                />
            )}

            {/* DatePicker pour la date de retour - Android */}
            {typeDeparture === 'ROUND_TRIP' && Platform.OS === 'android' && modals.returnDatePicker && (
                <DateTimePicker
                    value={returnDate || departureDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleReturnDateChange}
                    minimumDate={departureDate || new Date()}
                    themeVariant={colorScheme}
                />
            )}
        </View>
    );
};

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
        width: '100%',
    },
    fieldText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
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
    searchButtonContainer: {
        marginTop: 10,
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
    datePickerContent: {
        height: 216,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
});

export default TripSearch;
