// @ts-nocheck
import { getCities } from "@/api/city";
import { getAvailableDepartures } from "@/api/departure";
import { BottomSheet } from "@/components/bottom-sheet";
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
    FORM_FIELD_HEIGHT,
    FORM_FIELD_RADIUS,
} from '@/constants/formField';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { City, PopularTrip } from "@/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { showAlert } from '@/utils/alert';

const BRAND_BLUE = '#1776BA';

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
    label: string;
    placeholder: string;
    value: string;
    onPress: () => void;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    labelColor: string;
    placeholderColor: string;
    iconColor: string;
    compact?: boolean;
}

const SearchField = memo<SearchFieldProps>(({
    icon,
    label,
    placeholder,
    value,
    onPress,
    backgroundColor,
    borderColor,
    textColor,
    labelColor,
    placeholderColor,
    iconColor,
    compact = false,
}) => (
    <Pressable
        style={[
            styles.field,
            compact && styles.fieldCompact,
            { backgroundColor, borderColor: 'transparent' },
        ]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.06)' }}
    >
        <View style={styles.fieldIconBlock}>
            <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: labelColor }]} numberOfLines={1}>
                {label}
            </Text>
            <Text
                style={[
                    styles.fieldText,
                    { color: value ? textColor : placeholderColor },
                ]}
                numberOfLines={1}
            >
                {value || placeholder}
            </Text>
        </View>
        <Icon name="chevron-down" size={18} color={placeholderColor} />
    </Pressable>
));

SearchField.displayName = 'SearchField';

/**
 * Sélecteur aller simple / aller-retour
 */
interface TripTypeToggleProps {
    value: string;
    onChange: (id: string) => void;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    secondaryText: string;
}

const TripTypeToggle = memo<TripTypeToggleProps>(({
    value,
    onChange,
    backgroundColor,
    borderColor,
    textColor,
    secondaryText,
}) => (
    <View style={[styles.tripTypeRow, { backgroundColor, borderColor }]}>
        {TYPE_DEPARTURE_OPTIONS.map((option) => {
            const selected = value === option.id;
            return (
                <Pressable
                    key={option.id}
                    style={[
                        styles.tripTypeChip,
                        selected && styles.tripTypeChipSelected,
                    ]}
                    onPress={() => onChange(option.id)}
                    android_ripple={{ color: 'rgba(23, 118, 186, 0.12)' }}
                >
                    <Icon
                        name={option.id === 'ROUND_TRIP' ? 'swap-horizontal' : 'arrow-right'}
                        size={16}
                        color={selected ? '#FFFFFF' : secondaryText}
                    />
                    <Text
                        style={[
                            styles.tripTypeChipText,
                            { color: selected ? '#FFFFFF' : textColor },
                        ]}
                    >
                        {option.label}
                    </Text>
                </Pressable>
            );
        })}
    </View>
));

TripTypeToggle.displayName = 'TripTypeToggle';

/**
 * Bouton de recherche pleine largeur
 */
interface SearchButtonProps {
    loading: boolean;
    onPress: () => void;
}

const SearchButton = memo<SearchButtonProps>(({ loading, onPress }) => (
    <AppButton
        title="Rechercher"
        onPress={onPress}
        loading={loading}
        icon={<MaterialIcons name="search" size={22} color="#FFFFFF" />}
        style={styles.searchButton}
    />
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
            name={isSelected ? "check-circle" : "circle"}
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
    const colors = useAppColors();

    // Couleurs thématiques mémorisées
    const themeColors = useMemo(() => ({
        backgroundColor: colors.scrollBackground,
        cardBackground: colors.cardBackground,
        textColor: colors.text,
        secondaryText: colors.secondaryText,
        iconColor: colors.icon,
        tintColor: colors.activeTabColor,
        fieldBackgroundColor: colors.inputBackground,
        fieldTextColor: colors.text,
        fieldPlaceholderColor: colors.placeholder,
        borderColor: colors.border,
        headerBackground: colors.headerBackground,
        headerBorder: colors.headerBorder,
        datePickerBackgroundColor: colors.modalBackground,
        cancelTextColor: colors.danger,
        confirmTextColor: colors.activeTabColor,
    }), [colors]);

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
            showAlert('Erreur', 'Impossible de charger les villes');
        } finally {
            setLoadingCities(false);
        }
    }, []);

    /**
     * Effectue la recherche de départs
     */
    const performSearch = useCallback(async () => {
        if (!departureCity || !arrivalCity || !departureDate) {
            showAlert('Attention', 'Veuillez sélectionner une ville de départ, d\'arrivée et une date');
            return;
        }

        if (typeDeparture === 'ROUND_TRIP' && !returnDate) {
            showAlert('Attention', 'Veuillez sélectionner une date de retour');
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
                showAlert('Information', 'Aucun départ disponible, ajustez vos critères de recherche');
            }
        } catch (error: any) {
            console.error('Erreur recherche départs:', error);
            showAlert('Erreur', 'Une erreur est survenue lors de la recherche');
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

    const handleSwapCities = useCallback(() => {
        setDepartureCity(arrivalCity);
        setArrivalCity(departureCity);
    }, [arrivalCity, departureCity]);

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
            <ScreenHeader
                onBack={() => navigation.goBack()}
                title="Rechercher un trajet"
                iconColor={themeColors.iconColor}
                textColor={themeColors.textColor}
                backgroundColor={themeColors.headerBackground}
                borderColor={themeColors.headerBorder}
                paddingTop={insets.top}
            />

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 24 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={[styles.heroSubtitle, { color: themeColors.secondaryText }]}>
                    Indiquez votre itinéraire pour trouver les prochains départs
                </Text>

                {/* Itinéraire */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: themeColors.cardBackground,
                            borderColor: themeColors.borderColor,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: themeColors.textColor }]}>
                        Itinéraire
                    </Text>

                    <SearchField
                        icon="map-marker"
                        label="Départ"
                        placeholder="Ville de départ"
                        value={displayValues.departureCityName}
                        onPress={() => setModal('departure', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        borderColor={themeColors.borderColor}
                        textColor={themeColors.fieldTextColor}
                        labelColor={themeColors.secondaryText}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />

                    <View style={styles.swapRow}>
                        <View style={[styles.swapDivider, { backgroundColor: themeColors.borderColor }]} />
                        <Pressable
                            style={[
                                styles.swapButton,
                                {
                                    backgroundColor: themeColors.cardBackground,
                                    borderColor: themeColors.borderColor,
                                },
                            ]}
                            onPress={handleSwapCities}
                            android_ripple={{ color: 'rgba(23, 118, 186, 0.12)', borderless: true, radius: 22 }}
                            hitSlop={6}
                        >
                            <Icon name="swap-vertical" size={20} color={themeColors.tintColor} />
                        </Pressable>
                        <View style={[styles.swapDivider, { backgroundColor: themeColors.borderColor }]} />
                    </View>

                    <SearchField
                        icon="map-marker"
                        label="Arrivée"
                        placeholder="Ville d'arrivée"
                        value={displayValues.arrivalCityName}
                        onPress={() => setModal('arrival', true)}
                        backgroundColor={themeColors.fieldBackgroundColor}
                        borderColor={themeColors.borderColor}
                        textColor={themeColors.fieldTextColor}
                        labelColor={themeColors.secondaryText}
                        placeholderColor={themeColors.fieldPlaceholderColor}
                        iconColor={themeColors.tintColor}
                    />
                </View>

                {/* Type de trajet */}
                <TripTypeToggle
                    value={typeDeparture}
                    onChange={handleSelectTypeDeparture}
                    backgroundColor={themeColors.cardBackground}
                    borderColor={themeColors.borderColor}
                    textColor={themeColors.textColor}
                    secondaryText={themeColors.secondaryText}
                />

                {/* Dates & voyageurs */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: themeColors.cardBackground,
                            borderColor: themeColors.borderColor,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: themeColors.textColor }]}>
                        Détails du voyage
                    </Text>

                    <SearchField
                            icon="calendar"
                            label="Date de départ"
                            placeholder="Choisir une date"
                            value={displayValues.departureDateFormatted}
                            onPress={() => {
                                setDepartureDate(tempDepartureDate);
                                setModal('datePicker', true);
                            }}
                            backgroundColor={themeColors.fieldBackgroundColor}
                            borderColor={themeColors.borderColor}
                            textColor={themeColors.fieldTextColor}
                            labelColor={themeColors.secondaryText}
                            placeholderColor={themeColors.fieldPlaceholderColor}
                            iconColor={themeColors.tintColor}
                        />

                        <SearchField
                            icon="account-group"
                            label="Voyageurs"
                            placeholder="1 voyageur"
                            value={displayValues.passengerLabel}
                            onPress={() => setModal('passenger', true)}
                            backgroundColor={themeColors.fieldBackgroundColor}
                            borderColor={themeColors.borderColor}
                            textColor={themeColors.fieldTextColor}
                            labelColor={themeColors.secondaryText}
                            placeholderColor={themeColors.fieldPlaceholderColor}
                            iconColor={themeColors.tintColor}
                        />

                    {typeDeparture === 'ROUND_TRIP' && (
                        <SearchField
                            icon="calendar-arrow-right"
                            label="Retour"
                            placeholder="Date de retour"
                            value={displayValues.returnDateFormatted}
                            onPress={() => {
                                setReturnDate(tempReturnDate);
                                setModal('returnDatePicker', true);
                            }}
                            backgroundColor={themeColors.fieldBackgroundColor}
                            borderColor={themeColors.borderColor}
                            textColor={themeColors.fieldTextColor}
                            labelColor={themeColors.secondaryText}
                            placeholderColor={themeColors.fieldPlaceholderColor}
                            iconColor={themeColors.tintColor}
                        />
                    )}
                </View>

                <SearchButton loading={loadingDepartures} onPress={performSearch} />
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
        gap: 14,
    },
    heroSubtitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 22,
        marginBottom: 4,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    field: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
        minHeight: FORM_FIELD_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 0,
        gap: 10,
        width: '100%',
        overflow: 'hidden',
    },
    fieldCompact: {
        flex: 1,
        width: undefined,
        minWidth: 0,
    },
    fieldIconBlock: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fieldContent: {
        flex: 1,
        minWidth: 0,
        gap: 0,
        justifyContent: 'center',
    },
    fieldLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    fieldText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    swapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        marginVertical: -2,
    },
    swapDivider: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    swapButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10,
    },
    tripTypeRow: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    tripTypeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 10,
        overflow: 'hidden',
    },
    tripTypeChipSelected: {
        backgroundColor: BRAND_BLUE,
    },
    tripTypeChipText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 10,
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
    searchButton: {
        marginTop: 6,
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