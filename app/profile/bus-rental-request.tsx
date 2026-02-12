// @ts-nocheck
import { authGetUserInfo, createBusRentalRequest, getCompanyList } from '@/api/auth_register';
import { getCities } from "@/api/city";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { COUNTRY_CODES } from '@/interfaces';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/** Options pour les listes de sélection */
const TRIP_TYPE_OPTIONS = [
    { value: 'ONE_WAY', label: 'Aller simple' },
    { value: 'ROUND_TRIP', label: 'Aller-retour' },
];
const PASSENGER_TYPE_OPTIONS = [
    { value: 'ADULTS', label: 'Adultes' },
    { value: 'CHILDREN', label: 'Enfants' },
    { value: 'MIXED', label: 'Mixte' },
];
const BUS_TYPE_OPTIONS = [
    { value: 'BUS', label: 'Bus standard' },
    { value: 'LUXURY_BUS', label: 'Bus de luxe' },
    { value: 'MINIBUS', label: 'Minibus' },
];
const LUGGAGE_OPTIONS = [
    { value: 'LOW', label: 'Faible' },
    { value: 'MEDIUM', label: 'Moyen' },
    { value: 'HIGH', label: 'Élevé' },
    { value: 'NONE', label: 'Aucun' },
];
const ACCESSIBILITY_OPTIONS = [
    { value: 'NONE', label: 'Aucune' },
    { value: 'ELDERLY_FRIENDLY', label: 'Adapté aux seniors' },
    { value: 'WHEELCHAIR', label: 'Fauteuil roulant' },
];
const OBJECTIVE_OPTIONS = [
    { value: 'CORPORATE', label: 'Entreprise' },
    { value: 'SCHOOL', label: 'Scolaire' },
    { value: 'RELIGIOUS', label: 'Religieux' },
    { value: 'WEDDING', label: 'Mariage' },
    { value: 'TOUR', label: 'Tour / Excursion' },
    { value: 'OTHER', label: 'Autre' },
];
const CITY_OPTIONS: Array<{ value: string; label: string }> = [];
/** Services supplémentaires : value = enum backend BusRentalAdditionalService */
const EXTRA_SERVICE_OPTIONS = [
    { value: 'AIR_CONDITIONING', label: 'Climatisation' },
    { value: 'WIFI', label: 'WiFi' },
    { value: 'TOILET', label: 'Toilettes' },
    { value: 'BOARDING_SERVICE', label: "Service d'embarquement" },
    { value: 'ENTERTAINMENT', label: 'Divertissement' },
    { value: 'BRANDING', label: 'Marquage / Branding' },
];

/** Convertit une date jj/mm/aaaa en chaîne ISO (YYYY-MM-DD) pour l’API */
function dateToISO(ddMmYyyy: string): string {
    if (!ddMmYyyy?.trim()) return '';
    const parts = ddMmYyyy.trim().split('/');
    if (parts.length !== 3) return '';
    const [d, m, y] = parts;
    const day = d!.padStart(2, '0');
    const month = m!.padStart(2, '0');
    return `${y}-${month}-${day}`;
}

/**
 * Écran de demande de location de bus.
 * Formulaire autonome (sans composants FormField, PhoneField, etc.), garde l’appel API compagnies et log toutes les données.
 */
export default function BusRentalRequestScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    const scrollBg = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const cardBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const headerBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const inputBg = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const modalBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const optionBorder = colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7';
    const accentColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    const [isLoading, setIsLoading] = useState(true);
    const [company, setCompany] = useState('');
    const [companyError, setCompanyError] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('+225');
    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [departureCity, setDepartureCity] = useState('');
    const [departureDetail, setDepartureDetail] = useState('');
    const [arrivalCity, setArrivalCity] = useState('');
    const [arrivalDetail, setArrivalDetail] = useState('');
    const [tripType, setTripType] = useState('ONE_WAY');
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [duration, setDuration] = useState('');
    const [passengerCount, setPassengerCount] = useState(1);
    const [passengerType, setPassengerType] = useState('ADULTS');
    const [busType, setBusType] = useState('BUS');
    const [capacity, setCapacity] = useState(30);
    const [luggage, setLuggage] = useState('MEDIUM');
    const [accessibility, setAccessibility] = useState('NONE');
    const [travelObjective, setTravelObjective] = useState('OTHER');
    const [objectiveDetail, setObjectiveDetail] = useState('');
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
    const [budgetMin, setBudgetMin] = useState('');
    const [budgetMax, setBudgetMax] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    /** 'departure' | 'return' pour savoir quel champ date est en cours d’édition */
    const [activeDatePicker, setActiveDatePicker] = useState<'departure' | 'return' | null>(null);
    const [showSelectSheet, setShowSelectSheet] = useState(false);
    const [selectTitle, setSelectTitle] = useState('');
    const [selectOptions, setSelectOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [selectValue, setSelectValue] = useState('');
    const [companyOptions, setCompanyOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedCompanyLabel, setSelectedCompanyLabel] = useState('');
    const [cities, setCities] = useState<Array<City>>([]);
    const [loadingCities, setLoadingCities] = useState<boolean>(false);
    /** Ref pour le callback de sélection (évite les soucis de closure / état asynchrone) */
    const selectCallbackRef = useRef<((value: string) => void) | null>(null);

    const countryCodeOptions = COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }));

    /** Ouvre le bottom sheet de sélection et enregistre le callback dans la ref */
    const openSelect = useCallback(
        (
            title: string,
            options: Array<{ value: string; label: string }>,
            currentValue: string,
            onSelect: (value: string) => void
        ) => {
            selectCallbackRef.current = onSelect;
            setSelectTitle(title);
            setSelectOptions(options.length ? options : [{ value: '', label: '-- Choisir --' }]);
            setSelectValue(String(currentValue ?? ''));
            setShowSelectSheet(true);
        },
        []
    );

    const closeSelect = useCallback(() => {
        setShowSelectSheet(false);
        selectCallbackRef.current = null;
    }, []);

    /** Applique la valeur choisie via la ref puis ferme le sheet */
    const handleSelect = useCallback((value: string) => {
        const apply = selectCallbackRef.current;
        if (typeof apply === 'function') {
            apply(value);
        }
        selectCallbackRef.current = null;
        setShowSelectSheet(false);
    }, []);

    /**
     * Récupère les villes disponibles
     */
    const fetchCities = useCallback(async () => {
        try {
            setLoadingCities(true);
            const response = await getCities();
            console.log("fetchCities response ==>, ", response.data);
            const normalized = response.data.map(
                (c: { id?: string; value?: string; name?: string; label?: string }) => ({
                    value: String(c.id ?? c.value ?? c.name ?? ''),
                    label: String(c.name ?? c.label ?? ''),
                })
            );
            console.log("fetchCities normalized ==>, ", normalized);
            setCities(normalized ?? []);
        } catch (error: any) {
            console.error('Erreur récupération villes:', error);
            setCities([]);
            Alert.alert('Erreur', 'Impossible de charger les villes');
        } finally {
            setLoadingCities(false);
        }
    }, []);

    /** Préremplit avec les infos utilisateur */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const userId = await AsyncStorage.getItem('user_id');
                if (!userId || !token) {
                    setIsLoading(false);
                    return;
                }
                const res = await authGetUserInfo(userId, token);
                if (cancelled || res.status !== 200) {
                    setIsLoading(false);
                    return;
                }
                const u = res.data;
                setFirstName(u.firstName ?? '');
                setLastName(u.lastName ?? '');
                setEmail(u.email ?? '');
                setCompanyName(u.company ?? '');
                const mainPhone = u.phones?.[0];
                if (mainPhone) {
                    setPhone(mainPhone.digits ?? mainPhone.number ?? '');
                    setPhoneCountryCode(mainPhone.countryCode ?? '+225');
                }
                fetchCities();
            } catch {
                // ignore
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    /** Récupère la liste des compagnies */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) return;
                const res = await getCompanyList(token);
                if (cancelled) return;
                if (!Array.isArray(res.data)) {
                    Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération de la liste des compagnies');
                    return;
                }
                const normalized = res.data.map(
                    (c: { id?: string; value?: string; name?: string; label?: string }) => ({
                        value: String(c.id ?? c.value ?? c.name ?? ''),
                        label: String(c.name ?? c.label ?? ''),
                    })
                );
                setCompanyOptions(normalized);
            } catch (error) {
                if (!cancelled) console.error('Erreur liste compagnies:', error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
    };

    /** Gère le changement de date (départ ou retour). Sur Android on ferme après sélection ; sur iOS la modal se ferme au tap sur Valider. */
    const handleDateChange = useCallback((_: any, selectedDate?: Date) => {
        const picker = activeDatePicker;
        if (Platform.OS === 'android') setActiveDatePicker(null);
        if (selectedDate) {
            const formatted = formatDateForInput(selectedDate.toISOString());
            if (picker === 'return') setReturnDate(formatted);
            else setDepartureDate(formatted);
        }
    }, [activeDatePicker]);

    const toggleService = useCallback((name: string) => {
        setSelectedServices((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }, []);

    /** Construit le payload conforme à CreateBusRentalRequestDto et soumet */
    const handleSubmit = useCallback(async () => {
        try {
            if (!String(company ?? '').trim()) {
                setCompanyError('Veuillez sélectionner une compagnie');
                return;
            }
            setCompanyError('');
            if (!acceptTerms) {
                Alert.alert('Attention', 'Veuillez accepter les conditions générales de location');
                return;
            }
            const token = await AsyncStorage.getItem('token');
            const customerId = await AsyncStorage.getItem('user_id') ?? undefined;
            const payload: Record<string, unknown> = {
                firstName,
                lastName,
                phone: { countryCode: phoneCountryCode, digits: phone.trim(), type: 'mobile' },
                email,
                companyName: companyName.trim() || undefined,
                departureCityId: departureCity,
                departureCityDetail: departureDetail.trim(),
                arrivalCityId: arrivalCity,
                arrivalCityDetail: arrivalDetail.trim(),
                tripType,
                departureDate: dateToISO(departureDate),
                returnDate: returnDate ? dateToISO(returnDate) : undefined,
                estimatedDuration: duration.trim() || undefined,
                passengerCount,
                passengerType,
                busType,
                requiredCapacity: capacity,
                luggageNeeds: luggage,
                accessibilityNeeds: accessibility,
                tripPurpose: travelObjective,
                tripPurposeOther: objectiveDetail.trim() || undefined,
                additionalServices: Array.from(selectedServices).length > 0 ? Array.from(selectedServices) : undefined,
                budgetMin: budgetMin.trim() ? Number(budgetMin) : undefined,
                budgetMax: budgetMax.trim() ? Number(budgetMax) : undefined,
                specialInstructions: specialInstructions.trim() || undefined,
                termsAccepted: acceptTerms,
                companyId: company || undefined,
                customerId: customerId || undefined,
            };
            setIsLoading(true);
            console.log('Bus rental payload (CreateBusRentalRequestDto):', payload);
            const response = await createBusRentalRequest(payload, token);
            console.log("createBusRentalRequest response ==>, ", response);
            if (response.status !== 200 && response.status !== 201) {
                setIsLoading(false);
                Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement de la demande');
                return;
            }
            setIsLoading(false);
            Alert.alert('Demande envoyée', 'Votre demande de location a bien été enregistrée.');  
            router.back();
        } catch (error: any) {
            setIsLoading(false);
            Alert.alert('Erreur', error?.response?.data?.message || error?.message || 'Une erreur est survenue lors de l\'enregistrement de la demande');
            return;
        }
    }, [company, firstName, lastName, phone, phoneCountryCode, email, companyName, departureCity, departureDetail, arrivalCity, arrivalDetail, tripType, departureDate, returnDate, duration, passengerCount, passengerType, busType, capacity, luggage, accessibility, travelObjective, objectiveDetail, selectedServices, budgetMin, budgetMax, specialInstructions, acceptTerms]);
    

    const selectCompany = (v: string) => {
        setCompany(v);
        if (!v) {
            setSelectedCompanyLabel('');
            return;
        }
        const opt = companyOptions.find((o) => String(o.value) === String(v));
        setSelectedCompanyLabel(opt?.label ?? v);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBg }]}>
                <ActivityIndicator size="large" color={accentColor} style={styles.loader} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: scrollBg }]}>
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: headerBg, borderBottomColor: borderColor }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={25} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>Demande de location de bus</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
                        {/* Section 1 - Compagnie */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Compagnie de bus</Text>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>
                                Compagnie <Text style={styles.required}>*</Text>
                            </Text>
                            <Pressable
                                style={[
                                    styles.selectInput,
                                    { backgroundColor: inputBg, borderColor: companyError ? '#DC3545' : borderColor },
                                ]}
                                onPress={() =>
                                    openSelect(
                                        'Choisir une compagnie',
                                        companyOptions.length ? companyOptions : [{ value: '', label: 'Aucune compagnie' }],
                                        String(company ?? ''),
                                        selectCompany
                                    )
                                }
                            >
                                <Text style={[styles.selectText, { color: company ? textColor : placeholderColor }]}>
                                    {company
                                        ? selectedCompanyLabel ||
                                        companyOptions.find((o) => String(o.value) === String(company))?.label ||
                                        company
                                        : '-- Choisir une compagnie --'}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                            </Pressable>
                            {companyError ? <Text style={styles.errorText}>{companyError}</Text> : null}
                        </View>

                        {/* Section 2 - Informations client */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informations client</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Prénom</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="Prénom"
                                        placeholderTextColor={placeholderColor}
                                    />
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Nom</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Nom"
                                        placeholderTextColor={placeholderColor}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Téléphone</Text>
                            <View style={styles.phoneRow}>
                                <Pressable
                                    style={[styles.countryCodeBtn, { backgroundColor: inputBg, borderColor }]}
                                    onPress={() => openSelect('Code pays', countryCodeOptions, phoneCountryCode, setPhoneCountryCode)}
                                >
                                    <Text style={[styles.countryCodeText, { color: textColor }]}>{phoneCountryCode}</Text>
                                    <MaterialCommunityIcons name="chevron-down" size={16} color={iconColor} />
                                </Pressable>
                                <TextInput
                                    style={[styles.phoneInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="XX XX XX XX"
                                    placeholderTextColor={placeholderColor}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Email</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Email"
                                placeholderTextColor={placeholderColor}
                                keyboardType="email-address"
                            />
                        </View>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Nom de l'entreprise (optionnel)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                value={companyName}
                                onChangeText={setCompanyName}
                                placeholder="Nom de l'entreprise"
                                placeholderTextColor={placeholderColor}
                            />
                        </View>

                        {/* Section 3 - Détails du trajet */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du trajet</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Ville de départ</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() =>
                                            openSelect(
                                                'Ville de départ',
                                                cities.length ? cities : [],
                                                departureCity,
                                                setDepartureCity
                                            )
                                        }
                                    >
                                        <Text style={[styles.selectText, { color: departureCity ? textColor : placeholderColor }]}>
                                            {cities.find((c) => String((c as { value?: string }).value ?? '') === String(departureCity))?.label ?? (departureCity || '-- Choisir --')}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Ville d'arrivée</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() =>
                                            openSelect(
                                                "Ville d'arrivée",
                                                cities.length ? cities : [],
                                                arrivalCity,
                                                setArrivalCity
                                            )
                                        }
                                    >
                                        <Text style={[styles.selectText, { color: arrivalCity ? textColor : placeholderColor }]}>
                                            {cities.find((c) => String((c as { value?: string }).value ?? '') === String(arrivalCity))?.label ?? (arrivalCity || '-- Choisir --')}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Détail lieu de départ</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                value={departureDetail}
                                onChangeText={setDepartureDetail}
                                placeholder="Adresse, gare, etc."
                                placeholderTextColor={placeholderColor}
                            />
                        </View>
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Détail lieu d'arrivée</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                value={arrivalDetail}
                                onChangeText={setArrivalDetail}
                                placeholder="Adresse, gare, etc."
                                placeholderTextColor={placeholderColor}
                            />
                        </View>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Type de trajet</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() => openSelect('Type de trajet', TRIP_TYPE_OPTIONS, tripType, setTripType)}
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>{TRIP_TYPE_OPTIONS.find((o) => o.value === tripType)?.label ?? tripType}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Date de départ</Text>
                                    <Pressable
                                        style={[styles.dateInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() => setActiveDatePicker('departure')}
                                    >
                                        <Text style={[styles.dateInputText, { color: departureDate ? textColor : placeholderColor }]}>
                                            {departureDate || 'jj/mm/aaaa'}
                                        </Text>
                                        <MaterialCommunityIcons name="calendar" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                        {tripType === 'ROUND_TRIP' && (
                            <View style={styles.formField}>
                                <Text style={[styles.formLabel, { color: textColor }]}>Date de retour</Text>
                                <Pressable
                                    style={[styles.dateInput, { backgroundColor: inputBg, borderColor }]}
                                    onPress={() => setActiveDatePicker('return')}
                                >
                                    <Text style={[styles.dateInputText, { color: returnDate ? textColor : placeholderColor }]}>
                                        {returnDate || 'jj/mm/aaaa'}
                                    </Text>
                                    <MaterialCommunityIcons name="calendar" size={20} color={iconColor} />
                                </Pressable>
                            </View>
                        )}
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Durée estimée (optionnel)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                value={duration}
                                onChangeText={setDuration}
                                placeholder="Ex: 2h30"
                                placeholderTextColor={placeholderColor}
                            />
                        </View>

                        {/* Section 4 - Passagers */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Passagers</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Nombre de passagers</Text>
                                    <View style={[styles.stepperRow, { backgroundColor: inputBg, borderColor }]}>
                                        <Pressable onPress={() => setPassengerCount((c) => Math.max(1, c - 1))}>
                                            <MaterialCommunityIcons name="chevron-down" size={24} color={iconColor} />
                                        </Pressable>
                                        <Text style={[styles.stepperValue, { color: textColor }]}>{passengerCount}</Text>
                                        <Pressable onPress={() => setPassengerCount((c) => c + 1)}>
                                            <MaterialCommunityIcons name="chevron-up" size={24} color={iconColor} />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Type de passagers</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() =>
                                            openSelect('Type de passagers', PASSENGER_TYPE_OPTIONS, passengerType, setPassengerType)
                                        }
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>
                                            {PASSENGER_TYPE_OPTIONS.find((o) => o.value === passengerType)?.label ?? passengerType}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        {/* Section 5 - Exigences bus */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Exigences bus</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Type de bus</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() => openSelect('Type de bus', BUS_TYPE_OPTIONS, busType, setBusType)}
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>
                                            {BUS_TYPE_OPTIONS.find((o) => o.value === busType)?.label ?? busType}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Capacité requise</Text>
                                    <View style={[styles.stepperRow, { backgroundColor: inputBg, borderColor }]}>
                                        <Pressable onPress={() => setCapacity((c) => Math.max(1, c - 1))}>
                                            <MaterialCommunityIcons name="chevron-down" size={24} color={iconColor} />
                                        </Pressable>
                                        <Text style={[styles.stepperValue, { color: textColor }]}>{capacity}</Text>
                                        <Pressable onPress={() => setCapacity((c) => c + 1)}>
                                            <MaterialCommunityIcons name="chevron-up" size={24} color={iconColor} />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Bagages</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() => openSelect('Bagages', LUGGAGE_OPTIONS, luggage, setLuggage)}
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>
                                            {LUGGAGE_OPTIONS.find((o) => o.value === luggage)?.label ?? luggage}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Accessibilité</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() =>
                                            openSelect('Accessibilité', ACCESSIBILITY_OPTIONS, accessibility, setAccessibility)
                                        }
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>
                                            {ACCESSIBILITY_OPTIONS.find((o) => o.value === accessibility)?.label ?? accessibility}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        {/* Section 6 - Objet du voyage */}
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Objet du voyage</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <View style={styles.formField}>
                                    <Text style={[styles.formLabel, { color: textColor }]}>Objectif</Text>
                                    <Pressable
                                        style={[styles.selectInput, { backgroundColor: inputBg, borderColor }]}
                                        onPress={() =>
                                            openSelect('Objectif', OBJECTIVE_OPTIONS, travelObjective, setTravelObjective)
                                        }
                                    >
                                        <Text style={[styles.selectText, { color: textColor }]}>
                                            {OBJECTIVE_OPTIONS.find((o) => o.value === travelObjective)?.label ?? travelObjective}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                    </Pressable>
                                </View>
                            </View>
                            {travelObjective === 'OTHER' && (
                                <View style={styles.half}>
                                    <View style={styles.formField}>
                                        <Text style={[styles.formLabel, { color: textColor }]}>Précision</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                            value={objectiveDetail}
                                            onChangeText={setObjectiveDetail}
                                            placeholder="Précision"
                                            placeholderTextColor={placeholderColor}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Services supplémentaires */}
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Services supplémentaires</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.tagsContent}
                            >
                                {EXTRA_SERVICE_OPTIONS.map((opt) => (
                                    <Pressable
                                        key={opt.value}
                                        style={[
                                            styles.tag,
                                            {
                                                borderColor,
                                                backgroundColor: selectedServices.has(opt.value) ? accentColor : 'transparent',
                                            },
                                        ]}
                                        onPress={() => toggleService(opt.value)}
                                    >
                                        <Text style={[styles.tagText, { color: selectedServices.has(opt.value) ? '#FFFFFF' : textColor }]}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Budget */}
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Budget (optionnel)</Text>
                            <View style={styles.row}>
                                <View style={styles.half}>
                                    <View style={styles.formField}>
                                        <Text style={[styles.formLabel, { color: textColor }]}>Min (FCFA)</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                            value={budgetMin}
                                            onChangeText={setBudgetMin}
                                            placeholder="Min"
                                            placeholderTextColor={placeholderColor}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <View style={styles.half}>
                                    <View style={styles.formField}>
                                        <Text style={[styles.formLabel, { color: textColor }]}>Max (FCFA)</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                                            value={budgetMax}
                                            onChangeText={setBudgetMax}
                                            placeholder="Max"
                                            placeholderTextColor={placeholderColor}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Instructions spéciales */}
                        <View style={styles.formField}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Instructions spéciales</Text>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    { backgroundColor: inputBg, borderColor, color: textColor },
                                ]}
                                value={specialInstructions}
                                onChangeText={setSpecialInstructions}
                                placeholder="Demandes particulières..."
                                placeholderTextColor={placeholderColor}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* CGU */}
                        <Pressable style={styles.checkRow} onPress={() => setAcceptTerms((a) => !a)}>
                            <MaterialCommunityIcons
                                name={acceptTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={24}
                                color={acceptTerms ? accentColor : iconColor}
                            />
                            <Text style={[styles.checkLabel, { color: textColor }]}>
                                J'accepte les conditions générales de location
                            </Text>
                        </Pressable>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <Pressable style={[styles.cancelButton, { borderColor }]} onPress={() => router.back()}>
                                <Text style={[styles.cancelButtonText, { color: textColor }]}>Annuler</Text>
                            </Pressable>
                            <Pressable style={[styles.submitButton, { backgroundColor: accentColor }]} onPress={handleSubmit} disabled={isLoading}>
                                <Text style={styles.submitButtonText}>{isLoading ? 'Envoi en cours...' : 'Envoyer la demande'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date picker Android : affiché inline */}
            {activeDatePicker !== null && Platform.OS === 'android' && (
                <DateTimePicker
                    value={(() => {
                        const dateStr = activeDatePicker === 'return' ? returnDate : departureDate;
                        if (!dateStr) return activeDatePicker === 'return' && departureDate ? (() => {
                            const [d, m, y] = departureDate.split('/');
                            return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                        })() : new Date();
                        const [d, m, y] = dateStr.split('/');
                        return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                    })()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={
                        activeDatePicker === 'return' && departureDate
                            ? (() => {
                                const [d, m, y] = departureDate.split('/');
                                return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                            })()
                            : new Date()
                    }
                />
            )}

            {/* Date picker iOS : dans une Modal avec en-tête pour un affichage correct */}
            {activeDatePicker !== null && Platform.OS === 'ios' && (
                <Modal
                    visible={true}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setActiveDatePicker(null)}
                >
                    <Pressable style={styles.datePickerOverlay} onPress={() => setActiveDatePicker(null)}>
                        <View
                            style={[
                                styles.datePickerContainer,
                                { backgroundColor: modalBg, paddingBottom: Math.max(insets.bottom, 20) },
                            ]}
                            onStartShouldSetResponder={() => true}
                        >
                            <View style={[styles.datePickerHeader, { borderBottomColor: borderColor }]}>
                                <Text style={[styles.datePickerTitle, { color: textColor }]}>
                                    {activeDatePicker === 'return' ? 'Date de retour' : 'Date de départ'}
                                </Text>
                                <Pressable onPress={() => setActiveDatePicker(null)} hitSlop={12}>
                                    <MaterialCommunityIcons name="check" size={24} color={accentColor} />
                                </Pressable>
                            </View>
                            <View style={styles.datePickerContent}>
                                <DateTimePicker
                                    value={(() => {
                                        const dateStr = activeDatePicker === 'return' ? returnDate : departureDate;
                                        if (!dateStr) return activeDatePicker === 'return' && departureDate ? (() => {
                                            const [d, m, y] = departureDate.split('/');
                                            return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                                        })() : new Date();
                                        const [d, m, y] = dateStr.split('/');
                                        return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                                    })()}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    minimumDate={
                                        activeDatePicker === 'return' && departureDate
                                            ? (() => {
                                                const [d, m, y] = departureDate.split('/');
                                                return new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
                                            })()
                                            : new Date()
                                    }
                                    locale="fr-FR"
                                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                />
                            </View>
                        </View>
                    </Pressable>
                </Modal>
            )}

            {/* Modal de sélection (équivalent inline à SelectionBottomSheet) */}
            <Modal visible={showSelectSheet} transparent animationType="slide" onRequestClose={closeSelect}>
                <Pressable style={styles.modalOverlay} onPress={closeSelect}>
                    <Pressable
                        style={[
                            styles.modalContent,
                            { backgroundColor: modalBg, paddingBottom: Math.max(insets.bottom, 20) },
                        ]}
                        onPress={() => { }}
                    >
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>{selectTitle}</Text>
                            <Pressable onPress={closeSelect} style={styles.modalCloseBtn}>
                                <MaterialCommunityIcons name="close" size={24} color={iconColor} />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            {selectOptions.map((option, index) => (
                                <Pressable
                                    key={option.value !== '' ? option.value : `opt-${index}`}
                                    style={[styles.modalOption, { borderBottomColor: optionBorder }]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    <Text style={[styles.modalOptionText, { color: textColor }]}>{option.label}</Text>
                                    {String(selectValue) === String(option.value) && (
                                        <MaterialCommunityIcons name="check" size={20} color={accentColor} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontFamily: 'Ubuntu_Bold', flex: 1, textAlign: 'center' },
    headerSpacer: { width: 40 },
    keyboardView: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    mainCard: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
    sectionTitle: { fontSize: 22, fontFamily: 'Ubuntu_Bold', marginBottom: 16, marginTop: 8 },
    formField: { marginBottom: 16 },
    formLabel: { fontSize: 14, fontFamily: 'Ubuntu_Medium', marginBottom: 8 },
    required: { color: '#FF0000' },
    errorText: { color: '#DC3545', fontSize: 12, marginTop: 4, fontFamily: 'Ubuntu_Regular' },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    input: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
        height: 50,
    },
    selectInput: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    selectText: { fontSize: 14, fontFamily: 'Ubuntu_Regular' },
    dateInput: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        minHeight: 50,
    },
    dateInputText: { fontSize: 14, fontFamily: 'Ubuntu_Regular', flex: 1 },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    datePickerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    datePickerContent: {
        padding: 20,
        alignItems: 'center',
    },
    phoneRow: { flexDirection: 'row', gap: 8 },
    countryCodeBtn: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 4,
    },
    countryCodeText: { fontSize: 14, fontFamily: 'Ubuntu_Medium' },
    phoneInput: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
        height: 50,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        height: 50,
    },
    stepperValue: { fontSize: 14, fontFamily: 'Ubuntu_Bold' },
    textArea: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
        minHeight: 100,
    },
    tagsContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    tag: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    tagText: { fontSize: 13, fontFamily: 'Ubuntu_Regular' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
    checkLabel: { fontSize: 14, fontFamily: 'Ubuntu_Regular', flex: 1 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1 },
    cancelButtonText: { fontSize: 14, fontFamily: 'Ubuntu_Bold' },
    submitButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
    submitButtonText: { fontSize: 14, fontFamily: 'Ubuntu_Bold', color: '#FFFFFF' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 18, fontFamily: 'Ubuntu_Bold' },
    modalCloseBtn: { padding: 4 },
    modalScroll: { maxHeight: 400 },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalOptionText: { fontSize: 16, fontFamily: 'Ubuntu_Regular' },
});
