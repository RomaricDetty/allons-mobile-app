import { createBooking, createBookingPayment, createRebookingBooking, RebookingPassengerPayload } from '@/api/booking';
import { getAuthToken, getUserId } from '@/utils/storage';
import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Mapper pour les méthodes de paiement
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
 * Hook pour gérer le paiement
 */
export const usePaymentManagement = (defaultCountryCode: string = '+225') => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [paymentNumber, setPaymentNumber] = useState('');
    const [paymentCountryCode, setPaymentCountryCode] = useState(defaultCountryCode);

    // Reset des champs lors du changement de méthode
    useEffect(() => {
        setCardName('');
        setCardNumber('');
        setCardCvv('');
        setExpirationDate('');
        setPaymentNumber('');
    }, [selectedPaymentMethod]);

    // Mettre à jour le code pays du paiement quand le code par défaut change
    useEffect(() => {
        setPaymentCountryCode(defaultCountryCode);
    }, [defaultCountryCode]);

    /**
     * Construit le tableau passagers au format rebooking (phone en objet, leg, price).
     */
    const buildRebookingPassengers = useCallback((
        passengers: any[],
        trip: any,
        returnTrip: any | null,
        isRoundTrip: boolean,
        userId: string | null
    ): RebookingPassengerPayload[] => {
        const list: RebookingPassengerPayload[] = [];
        passengers.forEach((p, index) => {
            const digits = (p.phone || '').replace(/\D/g, '');
            const countryCode = p.countryCode || '+225';
            const phoneObj = { digits, countryCode, type: 'mobile' as const, isPrimary: index === 0 };

            list.push({
                seatNumber: p.seatNumber,
                firstName: p.firstName?.trim() || '',
                lastName: p.lastName?.trim() || '',
                email: p.email?.trim() || '',
                phone: phoneObj,
                age: 0,
                passengerType: p.passengerType || 'adult',
                isMainPassenger: index === 0,
                userId,
                price: trip.price,
                leg: 'OUTBOUND'
            });
            if (isRoundTrip && returnTrip) {
                list.push({
                    seatNumber: p.seatNumberReturn ?? p.seatNumber,
                    firstName: p.firstName?.trim() || '',
                    lastName: p.lastName?.trim() || '',
                    email: p.email?.trim() || '',
                    phone: phoneObj,
                    age: 0,
                    passengerType: p.passengerType || 'adult',
                    isMainPassenger: index === 0,
                    userId,
                    price: returnTrip.price,
                    leg: 'RETURN'
                });
            }
        });
        return list;
    }, []);

    /**
     * Traite la réservation et le paiement (flux classique ou rebooking selon rebookingCode).
     */
    const processBookingAndPayment = useCallback(async (
        trip: any,
        returnTrip: any,
        isRoundTrip: boolean,
        passengers: any[],
        emergencyContact: any,
        pricing: any,
        navigation: any,
        searchParams: any,
        rebookingCode?: string
    ) => {
        try {
            const userId = await getUserId() || null;
            const token = await getAuthToken() || null;

            let bookingResponse: any;

            if (rebookingCode?.trim()) {
                console.log("rebookingCode ==>, ", rebookingCode)
                const rebookingPassengers = buildRebookingPassengers(passengers, trip, returnTrip, isRoundTrip, userId);
                const rebookingPayload = {
                    tokenCode: rebookingCode.trim(),
                    departureId: trip.id,
                    returnDepartureId: isRoundTrip && returnTrip ? returnTrip.id : null,
                    passengers: rebookingPassengers
                };
                bookingResponse = await createRebookingBooking(rebookingPayload, token || '');
                console.log("bookingResponse ==>, ", bookingResponse.data)
            } else {
                console.log("rebookingCode non trouvé ==>, ", rebookingCode)
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
                bookingResponse = await createBooking(bookingData, token || '');
            }

            if (bookingResponse.status !== 200 && bookingResponse.status !== 201) {
                throw new Error('Erreur réservation');
            }

            const bookingId = bookingResponse.data?.bookingId ?? bookingResponse.data?.id ?? bookingResponse.data?.newBooking?.id;
            if (!bookingId) throw new Error('Booking ID non trouvé');

            const noPaymentRequired = pricing.totalAmount === 0;

            if (noPaymentRequired) {
                const paymentResponse = {
                    data: {
                        status: 'PAID',
                        amount: 0,
                        currency: trip.currency || 'XOF',
                        bookingId,
                        method: 'REBOOKING',
                        provider: 'REBOOKING'
                    },
                    status: 200
                };
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
                                searchParams,
                                rebookingCode
                            }
                        }]
                    })
                );
                return;
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
            const paymentResponse = await createBookingPayment(paymentData, token || '');

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
                                searchParams,
                                rebookingCode
                            }
                        }]
                    })
                );
            } else {
                throw new Error('Erreur paiement');
            }
        } catch (error: any) {
            console.error('Erreur réservation:', error);
            Alert.alert('Erreur', error?.response?.data?.message || error?.message || 'Erreur lors de la réservation');
            throw error;
        }
    }, [selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber, buildRebookingPassengers]);

    return {
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        cardName,
        setCardName,
        cardNumber,
        setCardNumber,
        cardCvv,
        setCardCvv,
        expirationDate,
        setExpirationDate,
        paymentNumber,
        setPaymentNumber,
        paymentCountryCode,
        setPaymentCountryCode,
        processBookingAndPayment
    };
};
