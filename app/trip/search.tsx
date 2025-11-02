// @ts-nocheck
import { getCities } from "@/api/city";
import { BottomSheet } from "@/components/bottom-sheet";
import { City } from "@/types";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from 'react';
import {
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

    // États pour les champs du formulaire
    const [departureCity, setDepartureCity] = useState<City | null>(null);
    const [arrivalCity, setArrivalCity] = useState<City | null>(null);
    const [departureType, setDepartureType] = useState('');
    const [departureDate, setDepartureDate] = useState<Date | null>(null);
    const [returnDate, setReturnDate] = useState<Date | null>(null);
    const [tempDepartureDate, setTempDepartureDate] = useState<Date>(new Date());
    const [tempReturnDate, setTempReturnDate] = useState<Date>(new Date());
    const [numberOfPersons, setNumberOfPersons] = useState<number>(1);

    const [cities, setCities] = useState<Array<City>>([]);
    const [loadingCities, setLoadingCities] = useState<boolean>(false);

    // États pour les modals
    const [showDepartureModal, setShowDepartureModal] = useState(false);
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
    const [currentDatePickerType, setCurrentDatePickerType] = useState<'departure' | 'return'>('departure');
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
     */
    const getCitiesFunction = async () => {
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
    }

    useEffect(() => {
        getCitiesFunction();
    }, []);

    /**
     * Gère la sélection d'une ville de départ
     */
    const handleSelectDepartureCity = (city: City) => {
        setDepartureCity(city);
        setShowDepartureModal(false);
    };

    /**
     * Gère la sélection d'une ville d'arrivée
     */
    const handleSelectArrivalCity = (city: City) => {
        setArrivalCity(city);
        setShowArrivalModal(false);
    };

    /**
     * Gère la sélection du type de départ
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
     */
    const handleDateChange = (event: any, selectedDate?: Date) => {
        // Sur Android, fermer immédiatement après sélection
        if (Platform.OS === 'android') {
            if (selectedDate) {
                if (currentDatePickerType === 'departure') {
                    setDepartureDate(selectedDate);
                    setShowDatePicker(false);
                } else {
                    setReturnDate(selectedDate);
                    setShowReturnDatePicker(false);
                }
            } else {
                if (currentDatePickerType === 'departure') {
                    setShowDatePicker(false);
                } else {
                    setShowReturnDatePicker(false);
                }
            }
            return;
        }
        
        // Sur iOS, mettre à jour l'état temporaire pour afficher dans le picker
        if (selectedDate) {
            if (currentDatePickerType === 'departure') {
                setTempDepartureDate(selectedDate);
            } else {
                setTempReturnDate(selectedDate);
            }
        }
    };

    /**
     * Confirme la sélection de la date (iOS uniquement)
     */
    const handleConfirmDate = () => {
        if (currentDatePickerType === 'departure') {
            setDepartureDate(tempDepartureDate);
            setShowDatePicker(false);
        } else {
            setReturnDate(tempReturnDate);
            setShowReturnDatePicker(false);
        }
    };

    /**
     * Annule la sélection de la date (iOS uniquement)
     */
    const handleCancelDate = () => {
        // Réinitialiser les dates temporaires avec les dates actuelles
        if (currentDatePickerType === 'departure') {
            setTempDepartureDate(departureDate || new Date());
            setShowDatePicker(false);
        } else {
            setTempReturnDate(returnDate || departureDate || new Date());
            setShowReturnDatePicker(false);
        }
    };

    /**
     * Gère la sélection du nombre de voyageurs
     */
    const handleSelectPassenger = (value: number) => {
        setNumberOfPersons(value);
        setShowPassengerModal(false);
    };

    /**
     * Gère la recherche de trajet
     */
    const handleSearch = () => {
        // TODO: Implémenter la logique de recherche
        console.log('Recherche:', {
            departureCity: departureCity?.name,
            arrivalCity: arrivalCity?.name,
            typeDeparture: typeDepartureOptions.find(opt => opt.id === typeDeparture)?.label,
            departureDate: departureDate?.toISOString(),
            returnDate: returnDate?.toISOString(),
            numberOfPersons
        });
    };

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

    return (
        <View style={styles.container}>
            {/* Header avec bouton retour */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={20} color="#000" />
                    <Text style={styles.backButtonText}>Retour</Text>
                </Pressable>
            </View>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Rechercher un trajet</Text>
                {/* Formulaire de recherche */}
                <View style={styles.formContainer}>
                    {/* Ville de départ */}
                    <Pressable
                        style={styles.field}
                        onPress={() => setShowDepartureModal(true)}
                    >
                        <Icon name="map-marker" size={20} color="#1776ba" />
                        <Text style={[
                            styles.fieldText,
                            !departureCity && styles.fieldPlaceholder
                        ]}>
                            {departureCity ? departureCity.name : 'Ville de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color="#000" />
                    </Pressable>

                    {/* Ville d'arrivée */}
                    <Pressable
                        style={styles.field}
                        onPress={() => setShowArrivalModal(true)}
                    >
                        <Icon name="map-marker" size={20} color="#1776ba" />
                        <Text style={[
                            styles.fieldText,
                            !arrivalCity && styles.fieldPlaceholder
                        ]}>
                            {arrivalCity ? arrivalCity.name : 'Ville d\'arrivée'}
                        </Text>
                        <Icon name="chevron-down" size={20} color="#000" />
                    </Pressable>

                    {/* Type de départ */}
                    <Pressable style={styles.field} onPress={() => setShowTypeDepartureModal(true)}>
                        <Icon name="bus" size={20} color="#1776ba" />
                        <Text style={[
                            styles.fieldText,
                            !typeDeparture && styles.fieldPlaceholder
                        ]}>
                            {typeDeparture
                                ? typeDepartureOptions.find(opt => opt.id === typeDeparture)?.label
                                : 'Type de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color="#000" />
                    </Pressable>

                    {/* Départ (date) */}
                    <Pressable 
                        style={styles.field}
                        onPress={() => {
                            setCurrentDatePickerType('departure');
                            // Initialiser la date temporaire avec la date actuelle ou aujourd'hui
                            setTempDepartureDate(departureDate || new Date());
                            setShowDatePicker(true);
                        }}
                    >
                        <Icon name="calendar" size={20} color="#1776ba" />
                        <Text style={[
                            styles.fieldText,
                            !departureDate && styles.fieldPlaceholder
                        ]}>
                            {departureDate
                                ? departureDate.toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })
                                : 'Date de départ'}
                        </Text>
                        <Icon name="chevron-down" size={20} color="#000" />
                    </Pressable>

                    {/* Date de retour - Affiché uniquement si Aller-retour */}
                    {typeDeparture === 'ROUND_TRIP' && (
                        <Pressable 
                            style={styles.field}
                            onPress={() => {
                                setCurrentDatePickerType('return');
                                // Initialiser la date temporaire avec la date actuelle ou la date de départ
                                setTempReturnDate(returnDate || departureDate || new Date());
                                setShowReturnDatePicker(true);
                            }}
                        >
                            <Icon name="calendar" size={20} color="#1776ba" />
                            <Text style={[
                                styles.fieldText,
                                !returnDate && styles.fieldPlaceholder
                            ]}>
                                {returnDate
                                    ? returnDate.toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })
                                    : 'Date de retour'}
                            </Text>
                            <Icon name="chevron-down" size={20} color="#000" />
                        </Pressable>
                    )}

                    {/* Nombre de personnes */}
                    <Pressable style={styles.field} onPress={() => setShowPassengerModal(true)}>
                        <Icon name="account-group" size={20} color="#1776ba" />
                        <Text style={[
                            styles.fieldText,
                            !numberOfPersons && styles.fieldPlaceholder
                        ]}>
                            {numberOfPersons 
                                ? passengerOptions.find(opt => opt.value === numberOfPersons)?.label 
                                : 'Nombre de voyageurs'}
                        </Text>
                        <Icon name="chevron-down" size={20} color="#000" />
                    </Pressable>

                    {/* Bouton Rechercher */}
                    <Pressable
                        style={styles.searchButton}
                        onPress={handleSearch}
                    >
                        <Text style={styles.searchButtonText}>Rechercher</Text>
                    </Pressable>
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
                            style={styles.cityItem}
                            onPress={() => {
                                handleSelectDepartureCity(item);
                                onClose();
                            }}
                        >
                            <Icon name="map-marker" size={20} color="#1776ba" />
                            <Text style={styles.cityItemText}>{item.name}</Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune ville disponible"
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
                            style={styles.cityItem}
                            onPress={() => {
                                handleSelectArrivalCity(item);
                                onClose();
                            }}
                        >
                            <Icon name="map-marker" size={20} color="#1776ba" />
                            <Text style={styles.cityItemText}>{item.name}</Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune ville disponible"
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
                            style={styles.typeItem}
                            onPress={() => {
                                handleSelectTypeDeparture(item.id);
                                onClose();
                            }}
                        >
                            <Icon 
                                name={isSelected ? "check-circle" : "circle-outline"} 
                                size={24} 
                                color={isSelected ? "#1776ba" : "#CCCCCC"} 
                            />
                            <Text style={[
                                styles.typeItemText,
                                isSelected && styles.typeItemTextSelected
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
                            style={styles.typeItem}
                            onPress={() => {
                                handleSelectPassenger(item.value);
                                onClose();
                            }}
                        >
                            <Icon 
                                name={isSelected ? "check-circle" : "circle-outline"} 
                                size={24} 
                                color={isSelected ? "#1776ba" : "#CCCCCC"} 
                            />
                            <Text style={[
                                styles.typeItemText,
                                isSelected && styles.typeItemTextSelected
                            ]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                }}
                emptyText="Aucune option disponible"
            />

            {/* DatePicker pour la date de départ */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        visible={showDatePicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={handleCancelDate}
                    >
                        <Pressable
                            style={styles.datePickerModal}
                            onPress={handleCancelDate}
                        >
                            <Pressable
                                style={styles.datePickerContainer}
                                onPress={(e) => e.stopPropagation()}
                            >
                                <View style={styles.datePickerHeader}>
                                    <Pressable onPress={handleCancelDate}>
                                        <Text style={styles.datePickerCancel}>Annuler</Text>
                                    </Pressable>
                                    <Text style={styles.datePickerTitle}>Sélectionner une date de départ</Text>
                                    <Pressable onPress={handleConfirmDate}>
                                        <Text style={styles.datePickerConfirm}>Confirmer</Text>
                                    </Pressable>
                                </View>
                                <DateTimePicker
                                    value={tempDepartureDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    locale="fr-FR"
                                />
                            </Pressable>
                        </Pressable>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={departureDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                )
            )}

            {/* DatePicker pour la date de retour */}
            {showReturnDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        visible={showReturnDatePicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={handleCancelDate}
                    >
                        <Pressable
                            style={styles.datePickerModal}
                            onPress={handleCancelDate}
                        >
                            <Pressable
                                style={styles.datePickerContainer}
                                onPress={(e) => e.stopPropagation()}
                            >
                                <View style={styles.datePickerHeader}>
                                    <Pressable onPress={handleCancelDate}>
                                        <Text style={styles.datePickerCancel}>Annuler</Text>
                                    </Pressable>
                                    <Text style={styles.datePickerTitle}>Sélectionner une date de retour</Text>
                                    <Pressable onPress={handleConfirmDate}>
                                        <Text style={styles.datePickerConfirm}>Confirmer</Text>
                                    </Pressable>
                                </View>
                                <DateTimePicker
                                    value={tempReturnDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    minimumDate={departureDate || new Date()}
                                    locale="fr-FR"
                                />
                            </Pressable>
                        </Pressable>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={returnDate || departureDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={departureDate || new Date()}
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        position: 'absolute',
        zIndex: 1000,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 20,
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
        paddingHorizontal: 20,
        // paddingTop: 80,
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        gap: 15,
    },
    field: {
        backgroundColor: '#F3F3F7',
        borderRadius: 15,
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 12,
    },
    fieldText: {
        flex: 1,
        fontSize: 15,
        color: '#1776ba',
        fontFamily: 'Ubuntu_Medium',
    },
    dateLabel: {
        flex: 1,
        fontSize: 15,
        color: '#666666',
    },
    datePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    datePickerCancel: {
        fontSize: 16,
        color: '#666666',
        fontFamily: 'Ubuntu_Regular',
    },
    datePickerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    datePickerConfirm: {
        fontSize: 16,
        color: '#1776ba',
        fontFamily: 'Ubuntu_Medium',
    },
    searchButton: {
        backgroundColor: '#1776ba',
        borderRadius: 15,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 5,
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
        borderBottomColor: '#F3F3F7',
        gap: 12,
    },
    cityItemText: {
        fontSize: 16,
        color: '#000',
        fontFamily: 'Ubuntu_Medium',
    },
    fieldPlaceholder: {
        color: '#A6A6AA',
    },
    typeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
        gap: 12,
    },
    typeItemText: {
        fontSize: 16,
        color: '#000',
        fontFamily: 'Ubuntu_Regular',
    },
    typeItemTextSelected: {
        color: '#1776ba',
        fontFamily: 'Ubuntu_Medium',
    },
});

export default TripSearch;