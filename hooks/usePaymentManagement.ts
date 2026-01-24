import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { createBooking, createBookingPayment } from '@/api/booking';
import { getAuthToken, getUserId } from '@/utils/storage';

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
     * Traite la réservation et le paiement
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
            const token = await getAuthToken() || null;

            const bookingData = {
                companyId: trip.companyId,
                customerId: userId,
                departureId: trip.id,
                ...(isRoundTrip && returnTrip ? { returnDepartureId: returnTrip.id } : {}),
                type: tripType,
                channel: 'MOBILE_APP',
                contact,
                passengers: passengersData,
                totalAmount: pricing.totalAmountWithoutFees,
                ...(rebookingCode ? { rebookingTokenCode: rebookingCode } : {})
            };

            const bookingResponse = await createBooking(bookingData, token || '');

            if (bookingResponse.status === 200 || bookingResponse.status === 201) {
                const bookingId = bookingResponse.data?.bookingId || bookingResponse.data?.id;

                if (!bookingId) throw new Error('Booking ID non trouvé');

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
            throw error;
        }
    }, [selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber]);

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
