// @ts-nocheck
import { authGetUserInfo } from '@/api/auth_register';
import { createBooking, createBookingPayment } from '@/api/booking';
import { EmergencyContactBlock } from '@/components/passengers/EmergencyContactBlock';
import { ErrorModal } from '@/components/passengers/ErrorModal';
import { PassengersInfoBlock } from '@/components/passengers/PassengersInfoBlock';
import { PaymentMethodBlock } from '@/components/passengers/PaymentMethodBlock';
import { SelectionBottomSheet } from '@/components/passengers/SelectionBottomSheet';
import { SummaryBlock } from '@/components/passengers/SummaryBlock';
import { isValidEmail, isValidPhone } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SearchParams, Trip } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { getDepartureAvailableSeats } from '@/api/departure';

/**
 * Retire le préfixe +225 d'un numéro de téléphone si présent
 * @param phone - Le numéro de téléphone avec ou sans préfixe
 * @returns Le numéro de téléphone sans le préfixe +225
 */
const removePhonePrefix = (phone: string | null | undefined): string => {
    if (!phone) return '';
    // Retirer le préfixe +225 s'il existe
    const cleaned = phone.replace(/^\+225/, '').trim();
    return cleaned;
};

/**
 * Écran de vérification et paiement (Étape 2 sur 3)
 * Permet de compléter les informations des passagers et sélectionner la méthode de paiement
 */
const PassengersInfo = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const progressBarBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const progressDotBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    // Récupération des données passées en paramètre
    const { trip, returnTrip, searchParams } = (route.params as {
        trip?: Trip,
        returnTrip?: Trip,
        searchParams?: SearchParams
    }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;
    const isRoundTrip = !!returnTrip;

    console.log('trip info ===> : ', trip);

    // États pour les informations des passagers
    const [passengers, setPassengers] = useState(() => {
        const initial = [];
        for (let i = 0; i < numberOfPersons; i++) {
            initial.push({
                firstName: i === 0 ? '' : '',
                lastName: i === 0 ? '' : '',
                phone: i === 0 ? '' : '',
                email: i === 0 ? '' : '',
                seatNumber: null as number | null, // Siège pour l'aller (ou unique si aller simple)
                seatNumberReturn: null as number | null, // Siège pour le retour (si aller-retour)
                passengerType: 'adult' as string, // Type de passager par défaut
            });
        }
        return initial;
    });

    // États pour les informations de contact
    const [contactPhone, setContactPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // États pour le contact d'urgence
    const [emergencyContact, setEmergencyContact] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        relation: ''
    });

    // État pour la méthode de paiement
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

    // États pour les informations de paiement
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [paymentNumber, setPaymentNumber] = useState('');

    // État pour le bottom sheet de sélection
    const [showSelectionBottomSheet, setShowSelectionBottomSheet] = useState(false);
    const [selectionType, setSelectionType] = useState<'passengerType' | 'relation' | null>(null);
    const [selectionTitle, setSelectionTitle] = useState('');
    const [selectionOptions, setSelectionOptions] = useState<Array<{ value: string, label: string }>>([]);
    const [currentSelectionValue, setCurrentSelectionValue] = useState<string>('');
    const [onSelectionCallback, setOnSelectionCallback] = useState<((value: string) => void) | null>(null);

    // État pour le modal d'erreur
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    /**
     * Calcule le prix total pour tous les voyageurs
     * Inclut le prix du voyage retour si c'est un aller-retour
     */
    const totalPrice = useMemo(() => {
        const outboundPrice = trip.price * numberOfPersons;
        const returnPrice = returnTrip ? returnTrip.price * numberOfPersons : 0;
        return outboundPrice + returnPrice;
    }, [trip.price, returnTrip?.price, numberOfPersons]);

    /**
     * Calcule les frais
     */
    const fees = 500;
    const taxes = 0;
    const totalAmount = totalPrice + fees + taxes;
    const totalAmountWithoutFees = totalPrice + taxes;

    /**
     * Met à jour les informations d'un passager
     */
    const updatePassenger = (index: number, field: string, value: string | number) => {
        const updated = [...passengers];
        updated[index] = { ...updated[index], [field]: value };
        setPassengers(updated);
    };

    /**
     * Ouvre l'écran de sélection de sièges
     * La sélection est fonction du nombre de passagers
     */
    const openSeatSelection = (leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND') => {
        // Vérifier qu'il y a des passagers
        if (!passengers || passengers.length === 0) {
            Alert.alert('Erreur', 'Aucun passager à assigner');
            return;
        }

        // Préparer les passagers avec les sièges appropriés selon la légende
        const passengersForLeg = passengers.map(p => ({
            ...p,
            seatNumber: leg === 'OUTBOUND' ? p.seatNumber : p.seatNumberReturn
        }));

        // Passer explicitement le nombre de passagers pour garantir la cohérence
        navigation.navigate('trip/seat-selection' as any, {
            trip,
            returnTrip,
            passengers: passengersForLeg,
            numberOfPassengers: passengers.length, // Nombre explicite de passagers
            currentLeg: leg,
            onSeatsSelected: (seatsData: Array<{ passengerIndex: number; seatNumber: number; leg: 'OUTBOUND' | 'RETURN' }>) => {
                // Mettre à jour les sièges sélectionnés pour chaque passager selon la légende
                const updatedPassengers = [...passengers];
                seatsData.forEach(({ passengerIndex, seatNumber }) => {
                    if (updatedPassengers[passengerIndex]) {
                        if (leg === 'OUTBOUND') {
                            updatedPassengers[passengerIndex].seatNumber = seatNumber;
                        } else {
                            updatedPassengers[passengerIndex].seatNumberReturn = seatNumber;
                        }
                    }
                });
                setPassengers(updatedPassengers);
            }
        });
    };

    /**
     * Met à jour le contact d'urgence
     */
    const updateEmergencyContact = (field: string, value: string) => {
        setEmergencyContact(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Valide tous les champs requis du formulaire
     * @returns {string[]|null} Tableau contenant les erreurs ou null si tout est valide
     */
    const validateForm = () => {
        const errors: string[] = [];

        // Validation des passagers
        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';

            // Validation du prénom
            if (!passenger.firstName || passenger.firstName.trim() === '') {
                errors.push(`Le prénom du passager${passengerNumber} est requis`);
            }

            // Validation du nom
            if (!passenger.lastName || passenger.lastName.trim() === '') {
                errors.push(`Le nom du passager${passengerNumber} est requis`);
            }

            // Validation du téléphone
            const phoneTrimmed = passenger.phone?.trim() || '';
            if (!phoneTrimmed) {
                errors.push(`Le téléphone du passager${passengerNumber} est requis`);
            } else if (!isValidPhone(phoneTrimmed)) {
                errors.push(`Le format du téléphone du passager${passengerNumber} est invalide (Ex: 0123456789)`);
            }

            // Validation de l'email si renseigné
            const emailTrimmed = passenger.email?.trim() || '';
            if (emailTrimmed && !isValidEmail(emailTrimmed)) {
                errors.push(`Le format de l'email du passager${passengerNumber} est invalide`);
            }
        });

        // Validation du type de passager pour chaque passager
        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';
            if (!passenger.passengerType || passenger.passengerType.trim() === '') {
                errors.push(`Le type de passager${passengerNumber} est requis`);
            }
        });

        // Validation des emails distincts entre les passagers
        const emailMap = new Map<string, number[]>();
        passengers.forEach((passenger, index) => {
            const email = passenger.email?.trim();
            if (email && email !== '') {
                if (!emailMap.has(email)) {
                    emailMap.set(email, []);
                }
                emailMap.get(email)!.push(index);
            }
        });

        // Vérifier s'il y a des emails en double
        emailMap.forEach((indices, email) => {
            if (indices.length > 1) {
                const passengerNumbers = indices.map(i => passengers.length > 1 ? ` ${i + 1}` : '').join(', ');
                errors.push(`L'email "${email}" est utilisé par plusieurs passagers (${passengerNumbers})`);
            }
        });

        // Validation de la sélection des sièges
        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';
            
            // Vérifier le siège pour l'aller (obligatoire pour tous les trajets)
            if (passenger.seatNumber === null || passenger.seatNumber === undefined || typeof passenger.seatNumber !== 'number' || passenger.seatNumber <= 0) {
                errors.push(`Veuillez sélectionner un siège valide pour le passager${passengerNumber} (trajet aller)`);
            }
            
            // Vérifier le siège pour le retour (obligatoire uniquement pour les aller-retour)
            if (isRoundTrip && returnTrip) {
                if (passenger.seatNumberReturn === null || passenger.seatNumberReturn === undefined || typeof passenger.seatNumberReturn !== 'number' || passenger.seatNumberReturn <= 0) {
                    errors.push(`Veuillez sélectionner un siège valide pour le passager${passengerNumber} (trajet retour)`);
                }
            }
        });

        // Validation du contact d'urgence
        const emergencyFirstNameTrimmed = emergencyContact.firstName?.trim() || '';
        if (!emergencyFirstNameTrimmed) {
            errors.push('Le prénom du contact d\'urgence est requis');
        }

        const emergencyLastNameTrimmed = emergencyContact.lastName?.trim() || '';
        if (!emergencyLastNameTrimmed) {
            errors.push('Le nom du contact d\'urgence est requis');
        }

        const emergencyPhoneTrimmed = emergencyContact.phone?.trim() || '';
        if (!emergencyPhoneTrimmed) {
            errors.push('Le téléphone du contact d\'urgence est requis');
        } else if (!isValidPhone(emergencyPhoneTrimmed)) {
            errors.push('Le format du téléphone du contact d\'urgence est invalide (Ex: 0123456789)');
        }

        if (!emergencyContact.relation || emergencyContact.relation.trim() === '') {
            errors.push('La relation avec le contact d\'urgence est requise');
        }

        // Validation de l'email du contact d'urgence si renseigné
        const emergencyEmailTrimmed = emergencyContact.email?.trim() || '';
        if (emergencyEmailTrimmed && !isValidEmail(emergencyEmailTrimmed)) {
            errors.push('Le format de l\'email du contact d\'urgence est invalide');
        }

        // Validation de la méthode de paiement
        if (!selectedPaymentMethod) {
            errors.push('La méthode de paiement est requise');
        }

        // Validation des informations de paiement selon la méthode sélectionnée
        if (selectedPaymentMethod === 'credit-card') {
            // Validation pour carte bancaire
            const cardNameTrimmed = cardName?.trim() || '';
            if (!cardNameTrimmed) {
                errors.push('Le nom sur la carte est requis');
            }

            const cleanedCardNumber = cardNumber.replace(/\s/g, '');
            if (!cardNumber || cleanedCardNumber.length !== 16) {
                errors.push('Le numéro de carte doit contenir 16 chiffres');
            } else if (!/^\d+$/.test(cleanedCardNumber)) {
                errors.push('Le numéro de carte doit contenir uniquement des chiffres');
            }

            const expirationDateTrimmed = expirationDate?.trim() || '';
            if (!expirationDateTrimmed) {
                errors.push('La date d\'expiration est requise');
            } else {
                // Validation du format MM/YY
                const datePattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
                if (!datePattern.test(expirationDateTrimmed)) {
                    errors.push('La date d\'expiration doit être au format MM/YY');
                } else {
                    // Validation que la date n'est pas expirée
                    const [month, year] = expirationDateTrimmed.split('/');
                    const expiryDate = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (expiryDate < today) {
                        errors.push('La date d\'expiration de la carte est dépassée');
                    }
                }
            }

            if (!cardCvv || cardCvv.length !== 3) {
                errors.push('Le CVV doit contenir 3 chiffres');
            } else if (!/^\d+$/.test(cardCvv)) {
                errors.push('Le CVV doit contenir uniquement des chiffres');
            }
        } else if (selectedPaymentMethod && selectedPaymentMethod !== 'credit-card') {
            // Validation pour les autres méthodes de paiement (mobile money)
            const paymentNumberTrimmed = paymentNumber?.trim() || '';
            if (!paymentNumberTrimmed) {
                errors.push('Le numéro de paiement est requis');
            } else if (!isValidPhone(paymentNumberTrimmed)) {
                errors.push('Le format du numéro de paiement est invalide (Ex: 0123456789)');
            }
        }

        return errors.length > 0 ? errors : null;
    };

    /**
     * Mappe la méthode de paiement sélectionnée vers le format API
     * @param method - La méthode de paiement sélectionnée
     * @returns Un objet avec method et provider
     */
    const mapPaymentMethod = (method: string | null): { method: string; provider: string | null } => {
        switch (method) {
            case 'credit-card':
                return { method: 'CREDIT_CARD', provider: null };
            case 'wave':
                return { method: 'MOBILE_MONEY', provider: 'WAVE' };
            case 'orange-money':
                return { method: 'MOBILE_MONEY', provider: 'ORANGE_MONEY' };
            case 'mtn-money':
                return { method: 'MOBILE_MONEY', provider: 'MTN_MONEY' };
            default:
                return { method: 'MOBILE_MONEY', provider: null };
        }
    };

    /**
     * Gère la soumission du formulaire
     * Formate les données selon le format attendu par l'API de réservation
     */
    const handleConfirmAndPay = async () => {
        // Validation des champs requis
        const validationErrors = validateForm();

        if (validationErrors) {
            console.warn('Erreurs de validation:', validationErrors);
            setValidationErrors(validationErrors);
            setShowErrorModal(true);
            return;
        }

        try {
            setIsLoading(true);

            // Détermination du type de trajet
            const tripType = isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY';

            // Formatage du contact d'urgence
            const contact = {
                firstName: emergencyContact.firstName.trim(),
                lastName: emergencyContact.lastName.trim(),
                phone: emergencyContact.phone.trim(),
                email: emergencyContact.email.trim() || '',
                relationship: emergencyContact.relation.trim().toLowerCase() || 'autre'
            };

            // Formatage des passagers selon le type de trajet
            const passengersData: Array<{
                seatNumber: number | null;
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
                passengerType: string;
                isMainPassenger: boolean;
                userId: string | null;
                price: number;
                leg: 'OUTBOUND' | 'RETURN';
            }> = [];

            // Pour chaque passager, créer les entrées nécessaires
            passengers.forEach((passenger, index) => {
                const isMainPassenger = index === 0;
                const passengerEmail = passenger.email?.trim() || '';
                const passengerPhone = passenger.phone.trim();

                // Passager pour le trajet aller (OUTBOUND)
                passengersData.push({
                    seatNumber: passenger.seatNumber,
                    firstName: passenger.firstName.trim(),
                    lastName: passenger.lastName.trim(),
                    email: passengerEmail,
                    phone: passengerPhone,
                    passengerType: passenger.passengerType,
                    isMainPassenger: isMainPassenger,
                    userId: null,
                    price: trip.price,
                    leg: 'OUTBOUND'
                });

                // Si c'est un aller-retour, ajouter aussi le passager pour le retour (RETURN)
                if (isRoundTrip && returnTrip) {
                    passengersData.push({
                        seatNumber: passenger.seatNumberReturn || passenger.seatNumber, // Utilise le siège retour si disponible, sinon le siège aller
                        firstName: passenger.firstName.trim(),
                        lastName: passenger.lastName.trim(),
                        email: passengerEmail,
                        phone: passengerPhone,
                        passengerType: passenger.passengerType,
                        isMainPassenger: isMainPassenger,
                        userId: null,
                        price: returnTrip.price,
                        leg: 'RETURN'
                    });
                }
            });

            // Formatage des données pour l'API de réservation
            const bookingData = {
                companyId: trip.companyId,
                departureId: trip.id,
                ...(isRoundTrip && returnTrip ? { returnDepartureId: returnTrip.id } : {}),
                type: tripType,
                channel: 'MOBILE_APP',
                contact: contact,
                passengers: passengersData,
                totalAmount: totalAmountWithoutFees
            };

            // Affichage des données formatées dans la console
            console.log('=== ============================================');
            console.log('=== DONNÉES FORMATÉES POUR L\'API ===');
            console.log('=== ============================================');
            console.log('\n--- DONNÉES BOOKING (JSON) ---');
            console.log(JSON.stringify(bookingData, null, 2));

            const token = await AsyncStorage.getItem('token');

            // Création de la réservation
            const bookingResponse = await createBooking(bookingData, token || '');

            if (bookingResponse.status === 200 || bookingResponse.status === 201) {
                const bookingId = bookingResponse.data?.bookingId || bookingResponse.data?.id;

                if (!bookingId) {
                    throw new Error('Booking ID non trouvé dans la réponse');
                }

                console.log('\n--- RÉPONSE BOOKING ---');
                console.log('Booking ID:', bookingId);

                // Mapper la méthode de paiement
                const { method: paymentMethod, provider } = mapPaymentMethod(selectedPaymentMethod);

                // Récupérer le numéro de téléphone (priorité au passager principal, sinon contact d'urgence)
                const phoneNumber = passengers[0]?.phone?.trim() || emergencyContact.phone.trim();

                // Formatage des données de paiement
                const paymentData = {
                    bookingId: bookingId,
                    method: paymentMethod,
                    provider: provider,
                    amount: totalAmount,
                    channel: 'MOBILE_APP',
                    currency: trip.currency || 'XOF',
                    rawPayload: {
                        cardNumber: selectedPaymentMethod === 'credit-card' ? cardNumber.replace(/\s/g, '') : null,
                        cardName: selectedPaymentMethod === 'credit-card' ? cardName.trim() : null,
                        expiryDate: selectedPaymentMethod === 'credit-card' ? expirationDate.trim() : null,
                        cvv: selectedPaymentMethod === 'credit-card' ? cardCvv : null,
                        phoneNumber: selectedPaymentMethod !== 'credit-card' ? (paymentNumber.trim() || phoneNumber) : null
                    }
                };

                console.log('\n--- DONNÉES PAYMENT (JSON) ---');
                console.log(JSON.stringify(paymentData, null, 2));

                // Création du paiement
                const paymentResponse = await createBookingPayment(paymentData, token || '');

                console.log('\n--- RÉPONSE PAYMENT ---');
                console.log(JSON.stringify(paymentResponse.data, null, 2));

                if (paymentResponse.status === 200 || paymentResponse.status === 201) {
                    // Rediriger vers l'écran de confirmation avec les données de réservation
                    // Utilisation de reset pour empêcher le retour en arrière
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: 'trip/booking-confirmation' as any,
                                    params: {
                                        bookingResponse,
                                        paymentResponse,
                                        trip,
                                        returnTrip,
                                        passengers,
                                        searchParams
                                    }
                                }
                            ]
                        })
                    );
                } else {
                    throw new Error('Erreur lors du paiement');
                }
            } else {
                throw new Error('Erreur lors de la création de la réservation');
            }
        } catch (error: any) {
            console.error('Erreur lors de la création de la réservation:', error);
            Alert.alert(
                'Erreur',
                error?.response?.data?.message || error?.message || 'Une erreur est survenue lors de la création de la réservation'
            );
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Ouvre le bottom sheet de sélection
     */
    const openSelectionBottomSheet = (
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{ value: string, label: string }>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => {
        setSelectionType(type);
        setSelectionTitle(title);
        setSelectionOptions(options);
        setCurrentSelectionValue(currentValue);
        setOnSelectionCallback(() => onSelect);
        setShowSelectionBottomSheet(true);
    };

    /**
     * Ferme le bottom sheet de sélection
     */
    const closeSelectionBottomSheet = () => {
        setShowSelectionBottomSheet(false);
        setSelectionType(null);
        setSelectionTitle('');
        setSelectionOptions([]);
        setCurrentSelectionValue('');
        setOnSelectionCallback(null);
    };

    /**
     * Gère la sélection d'une valeur
     */
    const handleSelection = (value: string) => {
        if (onSelectionCallback) {
            onSelectionCallback(value);
        }
        closeSelectionBottomSheet();
    };

    const userCheckSession = async () => {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('user_id');
        // console.log('response user info: ', response);

        if (token && userId) {
            try {
                setIsLoading(true);
                const response = await authGetUserInfo(userId, token);
                console.log('response user info firstName: ', response.data.firstName);
                if (response.status === 200) {
                    // Mettre à jour uniquement les informations du passager principal (index 0) avec les informations de l'utilisateur
                    setPassengers(prev => {
                        const updated = prev.map((passenger, index) => {
                            if (index === 0) {
                                return {
                                    firstName: response?.data?.firstName || '',
                                    lastName: response?.data?.lastName || '',
                                    phone: removePhonePrefix(response?.data?.phones[0]?.digits) || '',
                                    email: response?.data?.email || '',
                                    passengerType: 'adult',
                                    seatNumber: null,
                                    seatNumberReturn: null
                                };
                            }
                            return { ...passenger };
                        });
                        return updated;
                    });
                    setContactPhone(removePhonePrefix(response?.data?.phones[0]?.digits) || '');
                    setEmergencyContact({
                        firstName: response?.data?.contactUrgent?.fullName?.split(' ')[0] || '',
                        lastName: response?.data?.contactUrgent?.fullName?.split(' ')[1] || '',
                        phone: removePhonePrefix(response?.data?.contactUrgent?.phone) || '',
                        email: response?.data?.email || '',
                        // relation: response?.data?.contactUrgent?.relation || 'Autre'
                    });
                    setIsLoading(false);
                    return false;
                }

                console.log('Erreur lors de la récupération des informations de l\'utilisateur');
                setIsLoading(false);
                // Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
            } catch (error) {
                console.log('Erreur lors de la récupération des informations de l\'utilisateur ==> ,', error);
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        userCheckSession();
    }, []);

    /**
     * Réinitialise les champs de paiement quand la méthode change
     */
    useEffect(() => {
        // Réinitialiser les champs quand on change de méthode de paiement
        setCardName('');
        setCardNumber('');
        setCardCvv('');
        setExpirationDate('');
        setPaymentNumber('');
    }, [selectedPaymentMethod]);


    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                </View>
            )}

            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>

                <View style={[styles.routeBadge, { width: '250' }]}>
                    <Text style={[styles.routeBadgeText, { color: tintColor }]}>
                        {trip.departureCity} <Icon name="chevron-right" size={15} color={tintColor} /> {trip.arrivalCity}
                        {isRoundTrip && returnTrip && (
                            <> <Icon name="chevron-right" size={15} color={tintColor} /> {returnTrip.arrivalCity}</>
                        )}
                    </Text>
                </View>

                <Text style={[styles.stepIndicator, { color: secondaryTextColor }]}>Étape 2 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressContainer, { backgroundColor: headerBackgroundColor }]}>
                <Text style={[styles.progressTitle, { color: textColor }]}>Vérifier et payer</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { backgroundColor: progressBarBackgroundColor }]}>
                        <View style={[styles.progressFill, { width: '67%', backgroundColor: tintColor }]} />
                    </View>
                    <Text style={[styles.progressText, { color: secondaryTextColor }]}>67%</Text>
                </View>
            </View>

            {/* Indicateurs de progression */}
            <View style={[styles.progressIndicators, { backgroundColor: headerBackgroundColor }]}>
                <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
                <View style={[styles.progressDot, { backgroundColor: progressDotBackgroundColor }]} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={[styles.mainTitle, { color: textColor }]}>Vérifier et payer</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        Complétez vos informations et procédez au paiement
                    </Text>
                </View>

                {/* Carte principale */}
                <View style={[styles.mainCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    {/* Section 1 : Informations du passager */}
                    <PassengersInfoBlock
                        passengers={passengers}
                        onUpdatePassenger={updatePassenger}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

                    {/* Section 1.5 : Sélection des sièges */}
                    <View style={[styles.seatSelectionSection, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
                        <View style={styles.seatSelectionHeader}>
                            <View>
                                <Text style={[styles.seatSelectionTitle, { color: textColor }]}>
                                    Sélection des sièges
                                </Text>
                                <Text style={[styles.seatSelectionSubtitle, { color: secondaryTextColor }]}>
                                    Choisissez les sièges pour chaque passager
                                </Text>
                            </View>
                        </View>

                        {/* Bouton pour sélectionner les sièges aller */}
                        <Pressable
                            style={[styles.seatSelectionButton, { backgroundColor: cardBackgroundColor, borderColor }]}
                            onPress={() => openSeatSelection('OUTBOUND')}
                        >
                            <View style={styles.seatSelectionButtonContent}>
                                <Icon name="seat" size={20} color={tintColor} />
                                <View style={styles.seatSelectionButtonTextContainer}>
                                    <Text style={[styles.seatSelectionButtonText, { color: textColor }]}>
                                        Sièges aller
                                    </Text>
                                    <Text style={[styles.seatSelectionButtonSubtext, { color: secondaryTextColor }]}>
                                        {passengers.filter(p => p.seatNumber).length > 0 
                                            ? `${passengers.filter(p => p.seatNumber).length} siège(s) sélectionné(s)`
                                            : 'Aucun siège sélectionné'}
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={20} color={iconColor} />
                            </View>
                        </Pressable>

                        {/* Bouton pour sélectionner les sièges retour (si aller-retour) */}
                        {isRoundTrip && returnTrip && (
                            <Pressable
                                style={[styles.seatSelectionButton, { backgroundColor: cardBackgroundColor, borderColor, marginTop: 12 }]}
                                onPress={() => openSeatSelection('RETURN')}
                            >
                                <View style={styles.seatSelectionButtonContent}>
                                    <Icon name="seat" size={20} color={tintColor} />
                                    <View style={styles.seatSelectionButtonTextContainer}>
                                        <Text style={[styles.seatSelectionButtonText, { color: textColor }]}>
                                            Sièges retour
                                        </Text>
                                        <Text style={[styles.seatSelectionButtonSubtext, { color: secondaryTextColor }]}>
                                            {passengers.filter(p => p.seatNumberReturn).length > 0 
                                                ? `${passengers.filter(p => p.seatNumberReturn).length} siège(s) sélectionné(s)`
                                                : 'Aucun siège sélectionné'}
                                        </Text>
                                    </View>
                                    <Icon name="chevron-right" size={20} color={iconColor} />
                                </View>
                            </Pressable>
                        )}

                        {/* Affichage des sièges sélectionnés */}
                        {(passengers.some(p => p.seatNumber) || passengers.some(p => p.seatNumberReturn)) && (
                            <View style={styles.selectedSeatsContainer}>
                                <Text style={[styles.selectedSeatsTitle, { color: textColor }]}>
                                    Sièges sélectionnés :
                                </Text>
                                {passengers.map((passenger, index) => {
                                    const hasOutboundSeat = passenger.seatNumber !== null;
                                    const hasReturnSeat = passenger.seatNumberReturn !== null;
                                    
                                    if (hasOutboundSeat || hasReturnSeat) {
                                        return (
                                            <View key={index} style={styles.selectedSeatItem}>
                                                <Text style={[styles.selectedSeatText, { color: secondaryTextColor }]}>
                                                    Passager {index + 1}: 
                                                    {hasOutboundSeat && ` Aller: Siège ${passenger.seatNumber}`}
                                                    {hasOutboundSeat && hasReturnSeat && ' |'}
                                                    {hasReturnSeat && ` Retour: Siège ${passenger.seatNumberReturn}`}
                                                </Text>
                                            </View>
                                        );
                                    }
                                    return null;
                                })}
                            </View>
                        )}
                    </View>

                    {/* Section 2 : Contact d'urgence */}
                    <EmergencyContactBlock
                        emergencyContact={emergencyContact}
                        onUpdateEmergencyContact={updateEmergencyContact}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

                    {/* Section 3 : Méthode de paiement */}
                    <PaymentMethodBlock
                        selectedPaymentMethod={selectedPaymentMethod}
                        onSelectPaymentMethod={setSelectedPaymentMethod}
                        cardName={cardName}
                        onCardNameChange={setCardName}
                        cardNumber={cardNumber}
                        onCardNumberChange={setCardNumber}
                        expirationDate={expirationDate}
                        onExpirationDateChange={setExpirationDate}
                        cardCvv={cardCvv}
                        onCardCvvChange={setCardCvv}
                        paymentNumber={paymentNumber}
                        onPaymentNumberChange={setPaymentNumber}
                    />
                </View>

                {/* Récapitulatif */}
                <SummaryBlock
                    totalPrice={totalPrice}
                    taxes={taxes}
                    fees={fees}
                    totalAmount={totalAmount}
                />
            </ScrollView>

            {/* Bouton fixe en bas de l'écran */}
            <View style={[
                styles.fixedButtonContainer,
                {
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 15,
                    backgroundColor: headerBackgroundColor,
                    borderTopColor: headerBorderColor
                }
            ]}>
                <Pressable
                    style={[styles.confirmButton, { width: '60%', alignSelf: 'center' }]}
                    onPress={handleConfirmAndPay}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={'#FFFFFF'} />
                    ) : (
                        <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
                    )}
                </Pressable>
            </View>

            {/* Bottom sheet de sélection */}
            <SelectionBottomSheet
                visible={showSelectionBottomSheet}
                title={selectionTitle}
                options={selectionOptions}
                currentValue={currentSelectionValue}
                onSelect={handleSelection}
                onClose={closeSelectionBottomSheet}
            />

            {/* Modal d'erreur de validation */}
            <ErrorModal
                visible={showErrorModal}
                title="Attention !"
                errors={validationErrors}
                onClose={() => setShowErrorModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    routeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    routeBadgeText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 12,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 12,
    },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Espace pour le bouton fixe en bas
    },
    titleSection: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    mainCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    fixedButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    confirmButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    seatSelectionSection: {
        marginTop: 24,
        marginBottom: 24,
        paddingTop: 24,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    seatSelectionHeader: {
        marginBottom: 16,
    },
    seatSelectionTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    seatSelectionSubtitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    seatSelectionButton: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 16,
    },
    seatSelectionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    seatSelectionButtonTextContainer: {
        flex: 1,
    },
    seatSelectionButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 2,
    },
    seatSelectionButtonSubtext: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    selectedSeatsContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    selectedSeatsTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    selectedSeatItem: {
        marginBottom: 4,
    },
    selectedSeatText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
    },
});

export default PassengersInfo;