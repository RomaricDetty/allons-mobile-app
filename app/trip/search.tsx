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
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * =================================================================
 * CONSTANTES
 * =================================================================
 */

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
 * =================================================================
 * UTILITAIRES
 * =================================================================
 */

/**
 * Formate une date au format YYYY-MM-DD
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
 */
const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', DATE_FORMAT_OPTIONS);
};

/**
 * =================================================================
 * COMPOSANTS MÉMORISÉS
 * =================================================================
 */

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

const SearchField = memo<SearchFieldProps>(({
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
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
    >
        <Icon name={icon} size={20} color={iconColor} />
        <Text 
            style={[
                styles.fieldText,
                { color: value ? textColor : placeholderColor }
            ]}
            numberOfLines={1}
        >
            {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={iconColor} />
    </Pressable>
));

SearchField.displayName = 'SearchField';

/**
 * En-tête avec bouton retour
 */
interface HeaderProps {
    onBack: () => void;
    iconColor: string;
    paddingTop: number;
}

const Header = memo<HeaderProps>(({ onBack, iconColor, paddingTop }) => (
    <View style={[styles.header, { paddingTop }]}>
        <Pressable
            onPress={onBack}
            style={styles.backButton}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true, radius: 25 }}
        >
            <Icon name="arrow-left" size={25} color={iconColor} />
        </Pressable>
    </View>
));

Header.displayName = 'Header';

/**
 * Bouton de recherche
 */
interface SearchButtonProps {
    loading: boolean;
    onPress: () => void;
}

const SearchButton = memo<SearchButtonProps>(({ loading, onPress }) => (
    <View style={styles.searchButtonContainer}>
        {loading ? (
            <View style={[styles.searchButton, styles.searchButtonLoading]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
        ) : (
            <Pressable
                disabled={loading}
                style={styles.searchButton}
                onPress={onPress}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
            >
                <MaterialIcons name="search" size={30} color="#FFFFFF" />
            </Pressable>
        )}
    </View>
));

SearchButton.displayName = 'SearchButton';

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

const DatePickerModal = memo<DatePickerModalProps>(({
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
                            <Text style={[styles.datePickerCancel, { color: cancelTextColor }]}>
                                Annuler
                            </Text>
                        </Pressable>
                        <Text style={[styles.datePickerTitle, { color: textColor }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Pressable onPress={() => onConfirm(tempDate)}>
                            <Text style={[styles.datePickerConfirm, { color: confirmTextColor }]}>
                                Confirmer
                            </Text>
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
 * Item de ville dans le BottomSheet
 */
interface CityItemProps {
    item: City;
    onSelect: (city: City) => void;
    tintColor: string;
    textColor: string;
    borderColor: string;
}

const CityItem = memo<CityItemProps>(({ item, onSelect, tintColor, textColor, borderColor }) => (
    <Pressable
        style={[styles.cityItem, { borderBottomColor: borderColor }]}
        onPress={() => onSelect(item)}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
    >
        <Icon name="map-marker" size={20} color={tintColor} />
        <Text style={[styles.cityItemText, { color: textColor }]}>
            {item.name}
        </Text>
    </Pressable>
));

CityItem.displayName = 'CityItem';

/**
 * Item de sélection (type départ, voyageurs)
 */
interface SelectionItemProps {
    item: { id?: string; value?: number; label: string };
    isSelected: boolean;
    onSelect: () => void;
    tintColor: string;
    textColor: string;
    iconColor: string;
    borderColor: string;
}

const SelectionItem = memo<SelectionItemProps>(({
    item,
    isSelected,
    onSelect,
    tintColor,
    textColor,
    iconColor,
    borderColor
}) => (
    <Pressable
        style={[styles.typeItem, { borderBottomColor: borderColor }]}
        onPress={onSelect}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
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
));

SelectionItem.displayName = 'SelectionItem';

/**
 * =================================================================
 * COMPOSANT PRINCIPAL
 * =================================================================
 */

const TripSearch = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute();
    const { popularTrip } = (route.params as { popularTrip?: PopularTrip }) || {};
    const colorScheme = useColorScheme() ?? 'light';
    
    // Hooks de couleurs AVANT tout useMemo/useCallback
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs thématiques mémorisées
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

    // Ref pour la recherche automatique
    const hasAutoSearched = useRef(false);

    // États du formulaire
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

    // États des modals
    const [modals, setModals] = useState({
        departure: false,
        arrival: false,
        typeDeparture: false,
        passenger: false,
        datePicker: false,
        returnDatePicker: false,
    });

    /**
     * =================================================================
     * HANDLERS DES MODALS
     * =================================================================
     */

    const setModal = useCallback((key: keyof typeof modals, value: boolean) => {
        setModals(prev => ({ ...prev, [key]: value }));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals({
            departure: false,
            arrival: false,
            typeDeparture: false,
            passenger: false,
            datePicker: false,
            returnDatePicker: false,
        });
    }, []);

    /**
     * =================================================================
     * API CALLS
     * =================================================================
     */

    /**
     * Récupère les villes disponibles
     */
    const fetchCities = useCallback(async () => {
        try {
            setLoadingCities(true);
            const response = await getCities();
            setCities(response?.data || []);
        } catch (error: any) {
            console.error('Erreur récupération villes:', error);
            setCities([]);
            Alert.alert('Erreur', 'Impossible de charger les villes');
        } finally {
            setLoadingCities(false);
        }
    }, []);

    /**
     * Effectue la recherche de départs
     */
    const performSearch = useCallback(async () => {
        if (!departureCity || !arrivalCity || !departureDate) {
            Alert.alert('Attention', 'Veuillez sélectionner une ville de départ, d\'arrivée et une date');
            return;
        }

        if (typeDeparture === 'ROUND_TRIP' && !returnDate) {
            Alert.alert('Attention', 'Veuillez sélectionner une date de retour');
            return;
        }

        const queryParams = `page=1&pageSize=10&cityFromId=${departureCity.id}&cityToId=${arrivalCity.id}&dateFrom=${formatDateToYYYYMMDD(departureDate)}&dateTo=&companyId=&passengerCount=${numberOfPersons}`;

        setLoadingDepartures(true);
        try {
            const response = await getAvailableDepartures(queryParams);
            
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
                Alert.alert('Information', 'Aucun départ disponible, ajustez vos critères de recherche');
            }
        } catch (error: any) {
            console.error('Erreur recherche départs:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la recherche');
        } finally {
            setLoadingDepartures(false);
        }
    }, [departureCity, arrivalCity, departureDate, returnDate, typeDeparture, numberOfPersons, navigation]);

    /**
     * =================================================================
     * HANDLERS DE SÉLECTION
     * =================================================================
     */

    const handleSelectDepartureCity = useCallback((city: City) => {
        setDepartureCity(city);
        setModal('departure', false);
    }, [setModal]);

    const handleSelectArrivalCity = useCallback((city: City) => {
        setArrivalCity(city);
        setModal('arrival', false);
    }, [setModal]);

    const handleSelectTypeDeparture = useCallback((typeId: string) => {
        setTypeDeparture(typeId);
        setModal('typeDeparture', false);
        if (typeId === 'ONE_WAY') {
            setReturnDate(null);
        }
    }, [setModal]);

    const handleSelectPassenger = useCallback((value: number) => {
        setNumberOfPersons(value);
        setModal('passenger', false);
    }, [setModal]);

    /**
     * Handlers pour les dates Android
     */
    const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setModal('datePicker', false);
            if (selectedDate) {
                setDepartureDate(selectedDate);
                setTempDepartureDate(selectedDate);
            }
        }
    }, [setModal]);

    const handleReturnDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setModal('returnDatePicker', false);
            if (selectedDate) {
                setReturnDate(selectedDate);
                setTempReturnDate(selectedDate);
            }
        }
    }, [setModal]);

    /**
     * Handlers pour les dates iOS
     */
    const handleDepartureDateConfirm = useCallback((date: Date) => {
        setDepartureDate(date);
        setTempDepartureDate(date);
        setModal('datePicker', false);
    }, [setModal]);

    const handleReturnDateConfirm = useCallback((date: Date) => {
        setReturnDate(date);
        setTempReturnDate(date);
        setModal('returnDatePicker', false);
    }, [setModal]);

    /**
     * =================================================================
     * DONNÉES FILTRÉES ET FORMATÉES
     * =================================================================
     */

    /**
     * Villes disponibles pour le départ (exclut la ville d'arrivée)
     */
    const availableDepartureCities = useMemo(() => {
        if (!arrivalCity) return cities;
        return cities.filter(city => city.id !== arrivalCity.id);
    }, [cities, arrivalCity]);

    /**
     * Villes disponibles pour l'arrivée (exclut la ville de départ)
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

    /**
     * =================================================================
     * PRÉPARATION FORMULAIRE
     * =================================================================
     */

    /**
     * Pré-remplit le formulaire avec un trajet populaire
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
     * =================================================================
     * EFFETS
     * =================================================================
     */

    // Chargement des villes au montage
    useEffect(() => {
        fetchCities();
    }, [fetchCities]);

    // Pré-remplissage avec trajet populaire
    useEffect(() => {
        if (popularTrip && cities.length > 0 && !hasAutoSearched.current) {
            prefillFormFromPopularTrip(popularTrip, cities);
        }
    }, [popularTrip, cities, prefillFormFromPopularTrip]);

    // Recherche automatique
    useEffect(() => {
        if (popularTrip && departureCity && arrivalCity && departureDate && !hasAutoSearched.current) {
            hasAutoSearched.current = true;
            const timer = setTimeout(() => {
                performSearch();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [popularTrip, departureCity, arrivalCity, departureDate, performSearch]);

    /**
     * =================================================================
     * RENDER CALLBACKS
     * =================================================================
     */

    const renderCityItem = useCallback((item: City, onClose: () => void) => (
        <CityItem
            item={item}
            onSelect={(city) => {
                handleSelectDepartureCity(city);
                onClose();
            }}
            tintColor={themeColors.tintColor}
            textColor={themeColors.textColor}
            borderColor={themeColors.borderColor}
        />
    ), [handleSelectDepartureCity, themeColors]);

    const renderArrivalCityItem = useCallback((item: City, onClose: () => void) => (
        <CityItem
            item={item}
            onSelect={(city) => {
                handleSelectArrivalCity(city);
                onClose();
            }}
            tintColor={themeColors.tintColor}
            textColor={themeColors.textColor}
            borderColor={themeColors.borderColor}
        />
    ), [handleSelectArrivalCity, themeColors]);

    const renderTypeItem = useCallback((item: typeof TYPE_DEPARTURE_OPTIONS[number], onClose: () => void) => (
        <SelectionItem
            item={item}
            isSelected={typeDeparture === item.id}
            onSelect={() => {
                handleSelectTypeDeparture(item.id);
                onClose();
            }}
            tintColor={themeColors.tintColor}
            textColor={themeColors.textColor}
            iconColor={themeColors.iconColor}
            borderColor={themeColors.borderColor}
        />
    ), [typeDeparture, handleSelectTypeDeparture, themeColors]);

    const renderPassengerItem = useCallback((item: typeof PASSENGER_OPTIONS[number], onClose: () => void) => (
        <SelectionItem
            item={item}
            isSelected={numberOfPersons === item.value}
            onSelect={() => {
                handleSelectPassenger(item.value);
                onClose();
            }}
            tintColor={themeColors.tintColor}
            textColor={themeColors.textColor}
            iconColor={themeColors.iconColor}
            borderColor={themeColors.borderColor}
        />
    ), [numberOfPersons, handleSelectPassenger, themeColors]);

    const cityKeyExtractor = useCallback((item: City) => item.id, []);
    const typeKeyExtractor = useCallback((item: typeof TYPE_DEPARTURE_OPTIONS[number]) => item.id, []);
    const passengerKeyExtractor = useCallback((item: typeof PASSENGER_OPTIONS[number]) => item.value.toString(), []);

    const cityFilterFunction = useCallback((item: City, searchTerm: string) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    , []);

    /**
     * =================================================================
     * RENDER
     * =================================================================
    */

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
            {/* Header */}
            <Header
                onBack={() => navigation.goBack()}
                iconColor={themeColors.iconColor}
                paddingTop={insets.top}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                    <SearchField
                        icon="calendar"
                        placeholder="Date de départ"
                        value={displayValues.departureDateFormatted}
                        onPress={() => {
                            setDepartureDate(tempDepartureDate);
                            setModal('datePicker', true);
                        }}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        textColor={themeColors.fieldTextColor}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    {/* Date de retour */}
                    {typeDeparture === 'ROUND_TRIP' && (
                        <SearchField
                            icon="calendar"
                            placeholder="Date de retour"
                            value={displayValues.returnDateFormatted}
                            onPress={() => {
                                setReturnDate(tempReturnDate);
                                setModal('returnDatePicker', true);
                            }}
                            backgroundColor={themeColors.fieldBackgroundColor}
                            textColor={themeColors.fieldTextColor}
                            placeholderColor={themeColors.fieldPlaceholderColor}
                            iconColor={themeColors.tintColor}
                        />
                    )}

                    {/* Nombre de voyageurs */}
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
                    <SearchButton loading={loadingDepartures} onPress={performSearch} />
                </View>
            </ScrollView>

            {/* BottomSheets */}
            <BottomSheet
                visible={modals.departure}
                onClose={() => setModal('departure', false)}
                title="Ville de départ"
                data={availableDepartureCities}
                loading={loadingCities}
                keyExtractor={cityKeyExtractor}
                renderItem={renderCityItem}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={cityFilterFunction}
            />

            <BottomSheet
                visible={modals.arrival}
                onClose={() => setModal('arrival', false)}
                title="Ville d'arrivée"
                data={availableArrivalCities}
                loading={loadingCities}
                keyExtractor={cityKeyExtractor}
                renderItem={renderArrivalCityItem}
                emptyText="Aucune ville disponible"
                searchable={true}
                searchPlaceholder="Rechercher une ville..."
                filterFunction={cityFilterFunction}
            />

            <BottomSheet
                visible={modals.typeDeparture}
                onClose={() => setModal('typeDeparture', false)}
                title="Type de départ"
                data={TYPE_DEPARTURE_OPTIONS}
                loading={false}
                keyExtractor={typeKeyExtractor}
                renderItem={renderTypeItem}
                emptyText="Aucun type disponible"
            />

            <BottomSheet
                visible={modals.passenger}
                onClose={() => setModal('passenger', false)}
                title="Nombre de voyageurs"
                data={PASSENGER_OPTIONS}
                loading={false}
                keyExtractor={passengerKeyExtractor}
                renderItem={renderPassengerItem}
                emptyText="Aucune option disponible"
            />

            {/* DatePickers iOS */}
            <DatePickerModal
                visible={modals.datePicker && Platform.OS === 'ios'}
                title="Date de départ"
                value={tempDepartureDate}
                minimumDate={new Date()}
                onConfirm={handleDepartureDateConfirm}
                onCancel={() => setModal('datePicker', false)}
                backgroundColor={themeColors.datePickerBackgroundColor}
                borderColor={themeColors.borderColor}
                textColor={themeColors.textColor}
                cancelTextColor={themeColors.cancelTextColor}
                confirmTextColor={themeColors.confirmTextColor}
                insetsBottom={insets.bottom}
                colorScheme={colorScheme}
            />

            {typeDeparture === 'ROUND_TRIP' && (
                <DatePickerModal
                    visible={modals.returnDatePicker && Platform.OS === 'ios'}
                    title="Date de retour"
                    value={tempReturnDate}
                    minimumDate={departureDate || new Date()}
                    onConfirm={handleReturnDateConfirm}
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

            {/* DatePickers Android */}
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

/**
 * =================================================================
 * STYLES
 * =================================================================
 */

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
        overflow: 'hidden',
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
    datePickerContent: {
        height: 216,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
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
        overflow: 'hidden',
    },
    searchButtonLoading: {
        opacity: 0.7,
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
        flex: 1,
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
        flex: 1,
    },
});

export default TripSearch;