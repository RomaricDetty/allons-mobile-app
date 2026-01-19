// @ts-nocheck
import { authGetUserInfo } from '@/api/auth_register';
import { createBooking, createBookingPayment } from '@/api/booking';
import { getDepartureAvailableSeats } from '@/api/departure';
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
import { getAuthToken, getUserId } from '@/utils/storage';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * =================================================================
 * TYPES & INTERFACES
 * =================================================================
 */

interface Passenger {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    seatNumber: number | null;
    seatNumberReturn: number | null;
    passengerType: string;
}

interface EmergencyContactData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    relationship: string;
}

interface SeatSelectionButtonProps {
    leg: 'OUTBOUND' | 'RETURN';
    passengers: Passenger[];
    onPress: (leg: 'OUTBOUND' | 'RETURN') => void;
    cardBackgroundColor: string;
    borderColor: string;
    tintColor: string;
    textColor: string;
    secondaryTextColor: string;
    iconColor: string;
    style?: any;
}

interface SelectedSeatsDisplayProps {
    passengers: Passenger[];
    textColor: string;
    secondaryTextColor: string;
}

/**
 * =================================================================
 * UTILITAIRES
 * =================================================================
 */

/**
 * Retire le préfixe +225 d'un numéro de téléphone
 */
const removePhonePrefix = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/^\+225/, '').trim();
};

/**
 * Crée un passager vide
 */
const createEmptyPassenger = (): Passenger => ({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    seatNumber: null,
    seatNumberReturn: null,
    passengerType: 'adult',
});

/**
 * =================================================================
 * COMPOSANTS MÉMORISÉS
 * =================================================================
 */

/**
 * Bouton de sélection de sièges
 */
const SeatSelectionButton = memo<SeatSelectionButtonProps>(({
    leg,
    passengers,
    onPress,
    cardBackgroundColor,
    borderColor,
    tintColor,
    textColor,
    secondaryTextColor,
    iconColor,
    style
}) => {
    const seatCount = useMemo(() => {
        return leg === 'OUTBOUND'
            ? passengers.filter(p => p.seatNumber).length
            : passengers.filter(p => p.seatNumberReturn).length;
    }, [passengers, leg]);

    const legLabel = leg === 'OUTBOUND' ? 'aller' : 'retour';
    const seatText = seatCount > 0
        ? `${seatCount} siège(s) sélectionné(s)`
        : 'Aucun siège sélectionné';

    return (
        <Pressable
            style={[styles.seatSelectionButton, { backgroundColor: cardBackgroundColor, borderColor }, style]}
            onPress={() => onPress(leg)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
            <View style={styles.seatSelectionButtonContent}>
                <Icon name="seat" size={20} color={tintColor} />
                <View style={styles.seatSelectionButtonTextContainer}>
                    <Text style={[styles.seatSelectionButtonText, { color: textColor }]}>
                        Sièges {legLabel}
                    </Text>
                    <Text style={[styles.seatSelectionButtonSubtext, { color: secondaryTextColor }]}>
                        {seatText}
                    </Text>
                </View>
                <Icon name="chevron-right" size={20} color={iconColor} />
            </View>
        </Pressable>
    );
});

SeatSelectionButton.displayName = 'SeatSelectionButton';

/**
 * Affichage des sièges sélectionnés
 */
const SelectedSeatsDisplay = memo<SelectedSeatsDisplayProps>(({
    passengers,
    textColor,
    secondaryTextColor
}) => {
    const hasSelectedSeats = useMemo(() => {
        return passengers.some(p => p.seatNumber) || passengers.some(p => p.seatNumberReturn);
    }, [passengers]);

    if (!hasSelectedSeats) return null;

    return (
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
    );
});

SelectedSeatsDisplay.displayName = 'SelectedSeatsDisplay';

/**
 * Header de l'écran
 */
interface HeaderProps {
    onBack: () => void;
    trip: Trip;
    returnTrip?: Trip;
    isRoundTrip: boolean;
    isKeyboardVisible: boolean;
    paddingTop: number;
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    tintColor: string;
    secondaryTextColor: string;
}

const Header = memo<HeaderProps>(({
    onBack,
    trip,
    returnTrip,
    isRoundTrip,
    isKeyboardVisible,
    paddingTop,
    backgroundColor,
    borderColor,
    iconColor,
    tintColor,
    secondaryTextColor
}) => (
    <View style={[
        styles.header,
        isKeyboardVisible && styles.headerReduced,
        { paddingTop, backgroundColor, borderBottomColor: borderColor }
    ]}>
        <Pressable
            onPress={onBack}
            style={styles.backButton}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true, radius: 25 }}
        >
            <Icon name="arrow-left" size={isKeyboardVisible ? 20 : 25} color={iconColor} />
        </Pressable>

        <View style={styles.routeBadge}>
            <Text style={[
                styles.routeBadgeText,
                isKeyboardVisible && styles.routeBadgeTextReduced,
                { color: tintColor }
            ]} numberOfLines={1}>
                {trip.departureCity} <Icon name="chevron-right" size={isKeyboardVisible ? 12 : 15} color={tintColor} /> {trip.arrivalCity}
                {isRoundTrip && returnTrip && (
                    <> <Icon name="chevron-right" size={isKeyboardVisible ? 12 : 15} color={tintColor} /> {returnTrip.arrivalCity}</>
                )}
            </Text>
        </View>

        {!isKeyboardVisible && (
            <Text style={[styles.stepIndicator, { color: secondaryTextColor }]}>
                Étape 2/3
            </Text>
        )}
    </View>
));

Header.displayName = 'Header';

/**
 * Barre de progression
 */
interface ProgressBarProps {
    textColor: string;
    secondaryTextColor: string;
    backgroundColor: string;
    barBackgroundColor: string;
    tintColor: string;
}

const ProgressBar = memo<ProgressBarProps>(({
    textColor,
    secondaryTextColor,
    backgroundColor,
    barBackgroundColor,
    tintColor
}) => (
    <>
        <View style={[styles.progressContainer, { backgroundColor }]}>
            <Text style={[styles.progressTitle, { color: textColor }]}>
                Vérifier et payer
            </Text>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { backgroundColor: barBackgroundColor }]}>
                    <View style={[styles.progressFill, { width: '67%', backgroundColor: tintColor }]} />
                </View>
                <Text style={[styles.progressText, { color: secondaryTextColor }]}>
                    67%
                </Text>
            </View>
        </View>

        <View style={[styles.progressIndicators, { backgroundColor }]}>
            <View style={[styles.progressDot, styles.progressDotCompleted]}>
                <Icon name="check" size={12} color="#FFFFFF" />
            </View>
            <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
            <View style={[styles.progressDot, { backgroundColor: barBackgroundColor }]} />
        </View>
    </>
));

ProgressBar.displayName = 'ProgressBar';

/**
 * Bouton de confirmation fixe
 */
interface FixedButtonProps {
    onPress: () => void;
    loading: boolean;
    backgroundColor: string;
    borderColor: string;
    paddingBottom: number;
}

const FixedButton = memo<FixedButtonProps>(({
    onPress,
    loading,
    backgroundColor,
    borderColor,
    paddingBottom
}) => (
    <View style={[
        styles.fixedButtonContainer,
        { paddingBottom: paddingBottom + 8, backgroundColor, borderTopColor: borderColor }
    ]}>
        <Pressable
            style={[styles.confirmButton, styles.confirmButtonWidth]}
            onPress={onPress}
            disabled={loading}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
                <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
            )}
        </Pressable>
    </View>
));

FixedButton.displayName = 'FixedButton';

/**
 * =================================================================
 * COMPOSANT PRINCIPAL
 * =================================================================
 */

const PassengersInfo = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Hooks de couleurs AVANT useMemo
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Couleurs thématiques mémorisées
    const themeColors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        progressBarBackgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        progressDotBackgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
    }), [colorScheme]);

    // Paramètres de route mémorisés
    const routeParams = useMemo(() => (route.params as {
        trip?: Trip,
        returnTrip?: Trip,
        searchParams?: SearchParams
    }) || {}, [route.params]);

    const { trip, returnTrip, searchParams } = routeParams;
    const numberOfPersons = useMemo(() => searchParams?.numberOfPersons || 1, [searchParams?.numberOfPersons]);
    const isRoundTrip = useMemo(() => !!returnTrip, [returnTrip]);

    // États du composant
    const [passengers, setPassengers] = useState<Passenger[]>(() =>
        Array.from({ length: numberOfPersons }, () => createEmptyPassenger())
    );
    const [contactPhone, setContactPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emergencyContact, setEmergencyContact] = useState<EmergencyContactData>({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        relationship: ''
    });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [paymentNumber, setPaymentNumber] = useState('');
    const [showSelectionBottomSheet, setShowSelectionBottomSheet] = useState(false);
    const [selectionType, setSelectionType] = useState<'passengerType' | 'relation' | null>(null);
    const [selectionTitle, setSelectionTitle] = useState('');
    const [selectionOptions, setSelectionOptions] = useState<Array<{ value: string, label: string }>>([]);
    const [currentSelectionValue, setCurrentSelectionValue] = useState<string>('');
    const [onSelectionCallback, setOnSelectionCallback] = useState<((value: string) => void) | null>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [seatsAutoAssigned, setSeatsAutoAssigned] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Refs
    const hasLoadedUserInfo = useRef(false);

    /**
     * =================================================================
     * CALCULS MÉMORISÉS
     * =================================================================
     */

    const totalPrice = useMemo(() => {
        if (!trip) return 0;
        const outboundPrice = trip.price * numberOfPersons;
        const returnPrice = returnTrip ? returnTrip.price * numberOfPersons : 0;
        return outboundPrice + returnPrice;
    }, [trip?.price, returnTrip?.price, numberOfPersons]);

    const pricing = useMemo(() => {
        const fees = 500;
        const taxes = 0;
        const totalAmount = totalPrice + fees + taxes;
        const totalAmountWithoutFees = totalPrice + taxes;
        return { fees, taxes, totalAmount, totalAmountWithoutFees };
    }, [totalPrice]);

    /**
     * =================================================================
     * HANDLERS
     * =================================================================
     */

    const updatePassenger = useCallback((index: number, field: string, value: string | number) => {
        setPassengers(prev => {
            const updated = [...prev];
            if (updated[index]) {
                updated[index] = { ...updated[index], [field]: value };
            }
            return updated;
        });
    }, []);

    const updateEmergencyContact = useCallback((field: string, value: string) => {
        setEmergencyContact(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /**
     * =================================================================
     * SIÈGES
     * =================================================================
     */

    const assignSeatsAutomatically = useCallback(async (leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND'): Promise<boolean> => {
        const currentTripForLeg = leg === 'OUTBOUND' ? trip : returnTrip;

        if (!currentTripForLeg?.id || !passengers || passengers.length === 0) {
            return false;
        }

        try {
            const response = await getDepartureAvailableSeats(currentTripForLeg.id);

            if (response.status === 200 && response.data) {
                const seatsData = response.data.seats || response.data || [];
                const totalSeatsCount = response.data.totalSeats || currentTripForLeg.totalSeats || 50;

                const seatsArray: Array<{
                    number: number;
                    available: boolean;
                    booked: boolean;
                    blocked: boolean;
                    locked: boolean;
                }> = [];

                for (let i = 1; i <= totalSeatsCount; i++) {
                    const seatData = Array.isArray(seatsData)
                        ? seatsData.find((s: any) => s.number === i || s.seatNumber === i)
                        : seatsData[i];

                    const seatStatus = seatData?.status?.toUpperCase() || 'AVAILABLE';
                    const isAvailable = seatStatus === 'AVAILABLE';
                    const isBooked = seatStatus === 'BOOKED';
                    const isLocked = seatStatus === 'LOCKED';
                    const isBlocked = seatStatus === 'BLOCKED';

                    seatsArray.push({
                        number: i,
                        available: isAvailable,
                        booked: isBooked,
                        locked: isLocked,
                        blocked: isBlocked
                    });
                }

                let seatsAssigned = false;

                setPassengers(currentPassengers => {
                    if (currentPassengers.length === 0) {
                        return currentPassengers;
                    }

                    const initialSelections = new Map<number, number>();
                    let lastBookedSeatNumber = 0;

                    seatsArray.forEach(seat => {
                        if (seat.booked && seat.number > lastBookedSeatNumber) {
                            lastBookedSeatNumber = seat.number;
                        }
                    });

                    let nextAvailableSeatNumber = lastBookedSeatNumber + 1;

                    for (let index = 0; index < currentPassengers.length; index++) {
                        const passenger = currentPassengers[index];
                        const passengerSeatNumber = leg === 'OUTBOUND'
                            ? passenger?.seatNumber
                            : passenger?.seatNumberReturn;

                        if (!passengerSeatNumber) {
                            while (nextAvailableSeatNumber <= totalSeatsCount) {
                                const seat = seatsArray.find(s => s.number === nextAvailableSeatNumber);
                                if (seat && seat.available && !initialSelections.has(seat.number)) {
                                    initialSelections.set(seat.number, index);
                                    nextAvailableSeatNumber++;
                                    break;
                                }
                                nextAvailableSeatNumber++;
                            }
                        }
                    }

                    if (initialSelections.size > 0) {
                        seatsAssigned = true;
                        const updatedPassengers = [...currentPassengers];
                        initialSelections.forEach((passengerIndex, seatNumber) => {
                            if (updatedPassengers[passengerIndex]) {
                                if (leg === 'OUTBOUND') {
                                    updatedPassengers[passengerIndex].seatNumber = seatNumber;
                                } else {
                                    updatedPassengers[passengerIndex].seatNumberReturn = seatNumber;
                                }
                            }
                        });
                        return updatedPassengers;
                    }

                    return currentPassengers;
                });

                return seatsAssigned;
            }
            return false;
        } catch (error: any) {
            console.error('Erreur attribution automatique sièges:', error);
            return false;
        }
    }, [trip, returnTrip, passengers]);

    const openSeatSelection = useCallback((leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND') => {
        if (!passengers || passengers.length === 0) {
            Alert.alert('Erreur', 'Aucun passager à assigner');
            return;
        }

        const passengersForLeg = passengers.map(p => ({
            ...p,
            seatNumber: leg === 'OUTBOUND' ? p.seatNumber : p.seatNumberReturn
        }));

        navigation.navigate('trip/seat-selection' as any, {
            trip,
            returnTrip,
            passengers: passengersForLeg,
            numberOfPassengers: passengers.length,
            currentLeg: leg,
            onSeatsSelected: (seatsData: Array<{ passengerIndex: number; seatNumber: number; leg: 'OUTBOUND' | 'RETURN' }>) => {
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
    }, [trip, returnTrip, passengers, navigation]);

    /**
     * =================================================================
     * VALIDATION & SOUMISSION
     * =================================================================
     */

    const validateForm = useCallback(() => {
        const errors: string[] = [];

        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';

            if (!passenger.firstName?.trim()) {
                errors.push(`Le prénom du passager${passengerNumber} est requis`);
            }

            if (!passenger.lastName?.trim()) {
                errors.push(`Le nom du passager${passengerNumber} est requis`);
            }

            const phoneTrimmed = passenger.phone?.trim() || '';
            if (!phoneTrimmed) {
                errors.push(`Le téléphone du passager${passengerNumber} est requis`);
            } else if (!isValidPhone(phoneTrimmed)) {
                errors.push(`Format téléphone invalide pour passager${passengerNumber}`);
            }

            const emailTrimmed = passenger.email?.trim() || '';
            if (emailTrimmed && !isValidEmail(emailTrimmed)) {
                errors.push(`Format email invalide pour passager${passengerNumber}`);
            }

            if (!passenger.passengerType?.trim()) {
                errors.push(`Type de passager${passengerNumber} requis`);
            }

            if (!passenger.seatNumber) {
                errors.push(`Siège aller requis pour passager${passengerNumber}`);
            }

            if (isRoundTrip && returnTrip && !passenger.seatNumberReturn) {
                errors.push(`Siège retour requis pour passager${passengerNumber}`);
            }
        });

        if (!selectedPaymentMethod) {
            errors.push('Méthode de paiement requise');
        }

        if (selectedPaymentMethod === 'credit-card') {
            if (!cardName?.trim()) {
                errors.push('Nom sur la carte requis');
            }

            const cleanedCardNumber = cardNumber.replace(/\s/g, '');
            if (cleanedCardNumber.length !== 16 || !/^\d+$/.test(cleanedCardNumber)) {
                errors.push('Numéro de carte invalide (16 chiffres)');
            }

            if (!expirationDate?.trim() || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDate)) {
                errors.push('Date expiration invalide (MM/YY)');
            }

            if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
                errors.push('CVV invalide (3 chiffres)');
            }
        } else if (selectedPaymentMethod && selectedPaymentMethod !== 'credit-card') {
            if (!paymentNumber?.trim() || !isValidPhone(paymentNumber)) {
                errors.push('Numéro de paiement invalide');
            }
        }

        return errors.length > 0 ? errors : null;
    }, [passengers, selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber, isRoundTrip, returnTrip]);

    const mapPaymentMethod = useCallback((method: string | null): { method: string; provider: string | null } => {
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
    }, []);

    const handleConfirmAndPay = useCallback(async () => {
        const validationErrors = validateForm();

        if (validationErrors) {
            setValidationErrors(validationErrors);
            setShowErrorModal(true);
            return;
        }

        try {
            setIsLoading(true);

            const tripType = isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY';

            const contact = {
                firstName: emergencyContact.firstName.trim() || '',
                lastName: emergencyContact.lastName.trim() || '',
                phone: emergencyContact.phone.trim() || '',
                email: emergencyContact.email.trim() || '',
                relationship: emergencyContact.relationship.trim().toLowerCase() || 'autre'
            };

            const passengersData: Array<any> = [];

            passengers.forEach((passenger, index) => {
                const isMainPassenger = index === 0;

                passengersData.push({
                    seatNumber: passenger.seatNumber,
                    firstName: passenger.firstName.trim(),
                    lastName: passenger.lastName.trim(),
                    email: passenger.email?.trim() || '',
                    phone: passenger.phone.trim(),
                    passengerType: passenger.passengerType,
                    isMainPassenger,
                    userId: null,
                    price: trip.price,
                    leg: 'OUTBOUND'
                });

                if (isRoundTrip && returnTrip) {
                    passengersData.push({
                        seatNumber: passenger.seatNumberReturn || passenger.seatNumber,
                        firstName: passenger.firstName.trim(),
                        lastName: passenger.lastName.trim(),
                        email: passenger.email?.trim() || '',
                        phone: passenger.phone.trim(),
                        passengerType: passenger.passengerType,
                        isMainPassenger,
                        userId: null,
                        price: returnTrip.price,
                        leg: 'RETURN'
                    });
                }
            });


            const userId = await getUserId() || null;
            console.log('userId ==> ', userId);

            const bookingData = {
                companyId: trip.companyId,
                customerId: userId,
                departureId: trip.id,
                ...(isRoundTrip && returnTrip ? { returnDepartureId: returnTrip.id } : {}),
                type: tripType,
                channel: 'MOBILE_APP',
                contact,
                passengers: passengersData,
                totalAmount: pricing.totalAmountWithoutFees
            };

            const token = await getAuthToken();

            if (!token?.trim()) {
                throw new Error('Token manquant');
            }

            const bookingResponse = await createBooking(bookingData, token);

            if (bookingResponse.status === 200 || bookingResponse.status === 201) {
                const bookingId = bookingResponse.data?.bookingId || bookingResponse.data?.id;

                if (!bookingId) {
                    throw new Error('Booking ID non trouvé');
                }

                const { method: paymentMethod, provider } = mapPaymentMethod(selectedPaymentMethod);
                const phoneNumber = passengers[0]?.phone?.trim() || emergencyContact.phone.trim();

                const paymentData = {
                    bookingId,
                    method: paymentMethod,
                    provider,
                    amount: pricing.totalAmount,
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

                const paymentResponse = await createBookingPayment(paymentData, token);

                if (paymentResponse.status === 200 || paymentResponse.status === 201) {
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [{
                                name: 'trip/booking-confirmation' as any,
                                params: {
                                    bookingResponse,
                                    paymentResponse,
                                    trip,
                                    returnTrip,
                                    passengers,
                                    searchParams
                                }
                            }]
                        })
                    );
                } else {
                    throw new Error('Erreur paiement');
                }
            } else {
                throw new Error('Erreur réservation');
            }
        } catch (error: any) {
            console.error('Erreur réservation:', error);
            Alert.alert('Erreur', error?.response?.data?.message || error?.message || 'Erreur lors de la réservation');
        } finally {
            setIsLoading(false);
        }
    }, [validateForm, isRoundTrip, returnTrip, trip, emergencyContact, passengers, selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber, pricing, mapPaymentMethod, navigation, searchParams]);

    /**
     * =================================================================
     * BOTTOM SHEET
     * =================================================================
     */

    const openSelectionBottomSheet = useCallback((
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
    }, []);

    const closeSelectionBottomSheet = useCallback(() => {
        setShowSelectionBottomSheet(false);
        setSelectionType(null);
        setSelectionTitle('');
        setSelectionOptions([]);
        setCurrentSelectionValue('');
        setOnSelectionCallback(null);
    }, []);

    const handleSelection = useCallback((value: string) => {
        if (onSelectionCallback) {
            onSelectionCallback(value);
        }
        closeSelectionBottomSheet();
    }, [onSelectionCallback, closeSelectionBottomSheet]);

    /**
     * =================================================================
     * EFFETS
     * =================================================================
     */

    // Chargement des infos utilisateur
    const loadUserInfo = useCallback(async () => {
        const token = await getAuthToken();
        const userId = await getUserId();

        if (token && userId && !hasLoadedUserInfo.current) {
            try {
                setIsLoading(true);
                hasLoadedUserInfo.current = true;

                const response = await authGetUserInfo(userId, token);

                if (response.status === 200) {
                    setPassengers(prev => {
                        const updated = [...prev];
                        if (updated[0]) {
                            updated[0] = {
                                ...updated[0],
                                firstName: response?.data?.firstName || '',
                                lastName: response?.data?.lastName || '',
                                phone: removePhonePrefix(response?.data?.phones[0]?.digits) || '',
                                email: response?.data?.email || '',
                                passengerType: 'adult',
                            };
                        }
                        return updated;
                    });

                    setContactPhone(removePhonePrefix(response?.data?.phones[0]?.digits) || '');
                    setEmergencyContact({
                        firstName: response?.data?.contactUrgent?.firstName || '',
                        lastName: response?.data?.contactUrgent?.lastName || '',
                        phone: removePhonePrefix(response?.data?.contactUrgent?.phone) || '',
                        email: response?.data?.email || '',
                        relationship: response?.data?.contactUrgent?.relationship || 'Autre'
                    });
                }
            } catch (error) {
                console.error('Erreur chargement user info:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadUserInfo();
    }, [loadUserInfo]);

    // Attribution automatique des sièges
    useEffect(() => {
        if (passengers && passengers.length > 0 && trip && !seatsAutoAssigned) {
            const hasSeatsAssigned = passengers.some(p =>
                p.seatNumber !== null || p.seatNumberReturn !== null
            );

            if (!hasSeatsAssigned) {
                const timer = setTimeout(async () => {
                    const outboundAssigned = await assignSeatsAutomatically('OUTBOUND');

                    if (isRoundTrip && returnTrip) {
                        await assignSeatsAutomatically('RETURN');
                    }

                    if (outboundAssigned) {
                        setSeatsAutoAssigned(true);
                    }
                }, 500);

                return () => clearTimeout(timer);
            } else {
                setSeatsAutoAssigned(true);
            }
        }
    }, [passengers, trip, seatsAutoAssigned, assignSeatsAutomatically, isRoundTrip, returnTrip]);

    // Reset champs paiement
    useEffect(() => {
        setCardName('');
        setCardNumber('');
        setCardCvv('');
        setExpirationDate('');
        setPaymentNumber('');
    }, [selectedPaymentMethod]);

    // Écoute du clavier
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    /**
     * =================================================================
     * RENDER
     * =================================================================
     */

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                </View>
            )}

            <Header
                onBack={handleGoBack}
                trip={trip}
                returnTrip={returnTrip}
                isRoundTrip={isRoundTrip}
                isKeyboardVisible={isKeyboardVisible}
                paddingTop={insets.top}
                backgroundColor={themeColors.headerBackgroundColor}
                borderColor={themeColors.headerBorderColor}
                iconColor={iconColor}
                tintColor={tintColor}
                secondaryTextColor={themeColors.secondaryTextColor}
            />

            {!isKeyboardVisible && (
                <ProgressBar
                    textColor={textColor}
                    secondaryTextColor={themeColors.secondaryTextColor}
                    backgroundColor={themeColors.headerBackgroundColor}
                    barBackgroundColor={themeColors.progressBarBackgroundColor}
                    tintColor={tintColor}
                />
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.titleSection, isKeyboardVisible && styles.titleSectionReduced]}>
                    <Text style={[
                        styles.mainTitle,
                        isKeyboardVisible && styles.mainTitleReduced,
                        { color: textColor }
                    ]}>
                        Vérifier et payer
                    </Text>
                    {!isKeyboardVisible && (
                        <Text style={[styles.subtitle, { color: themeColors.secondaryTextColor }]}>
                            Complétez vos informations et procédez au paiement
                        </Text>
                    )}
                </View>

                <View style={[styles.mainCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <PassengersInfoBlock
                        passengers={passengers}
                        onUpdatePassenger={updatePassenger}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

                    <View style={[styles.seatSelectionSection, { borderBottomColor: themeColors.borderColor }]}>
                        <View style={styles.seatSelectionHeader}>
                            <View>
                                <Text style={[styles.seatSelectionTitle, { color: textColor }]}>
                                    Sélection des sièges
                                </Text>
                                <Text style={[styles.seatSelectionSubtitle, { color: themeColors.secondaryTextColor }]}>
                                    Choisissez les sièges pour chaque passager
                                </Text>
                            </View>
                        </View>

                        <SeatSelectionButton
                            leg="OUTBOUND"
                            passengers={passengers}
                            onPress={openSeatSelection}
                            cardBackgroundColor={themeColors.cardBackgroundColor}
                            borderColor={themeColors.borderColor}
                            tintColor={tintColor}
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            iconColor={iconColor}
                        />

                        {isRoundTrip && returnTrip && (
                            <SeatSelectionButton
                                leg="RETURN"
                                passengers={passengers}
                                onPress={openSeatSelection}
                                cardBackgroundColor={themeColors.cardBackgroundColor}
                                borderColor={themeColors.borderColor}
                                tintColor={tintColor}
                                textColor={textColor}
                                secondaryTextColor={themeColors.secondaryTextColor}
                                iconColor={iconColor}
                                style={styles.seatSelectionButtonSpacing}
                            />
                        )}

                        <SelectedSeatsDisplay
                            passengers={passengers}
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                        />
                    </View>

                    <EmergencyContactBlock
                        emergencyContact={emergencyContact}
                        onUpdateEmergencyContact={updateEmergencyContact}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

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

                <SummaryBlock
                    totalPrice={totalPrice}
                    taxes={pricing.taxes}
                    fees={pricing.fees}
                    totalAmount={pricing.totalAmount}
                />
            </ScrollView>

            <FixedButton
                onPress={handleConfirmAndPay}
                loading={isLoading}
                backgroundColor={themeColors.headerBackgroundColor}
                borderColor={themeColors.headerBorderColor}
                paddingBottom={insets.bottom}
            />

            <SelectionBottomSheet
                visible={showSelectionBottomSheet}
                title={selectionTitle}
                options={selectionOptions}
                currentValue={currentSelectionValue}
                onSelect={handleSelection}
                onClose={closeSelectionBottomSheet}
            />

            <ErrorModal
                visible={showErrorModal}
                title="Attention !"
                errors={validationErrors}
                onClose={() => setShowErrorModal(false)}
            />
        </KeyboardAvoidingView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerReduced: {
        paddingBottom: 8,
    },
    backButton: {
        padding: 8,
    },
    routeBadge: {
        flex: 1,
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
    routeBadgeTextReduced: {
        fontSize: 13,
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
    progressDotCompleted: {
        backgroundColor: '#4CAF50',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: 20,
    },
    titleSectionReduced: {
        marginBottom: 12,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    mainTitleReduced: {
        fontSize: 20,
        marginBottom: 4,
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
        paddingTop: 15,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
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
        overflow: 'hidden',
    },
    confirmButtonWidth: {
        width: '60%',
        alignSelf: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    seatSelectionSection: {
        marginTop: 24,
        marginBottom: 24,
        paddingBottom: 24,
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
        overflow: 'hidden',
    },
    seatSelectionButtonSpacing: {
        marginTop: 12,
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