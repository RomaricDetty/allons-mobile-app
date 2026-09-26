import {
    createBooking,
    createBookingPayment,
    createRebookingBooking,
    RebookingPassengerPayload,
} from '@/api/booking';
import { mapUiPaymentMethod } from '@/constants/paymentMethods';
import { PayBookingRequest } from '@/interfaces/payment';
import { savePendingPayment } from '@/utils/pendingPayment';
import { isAllowedPaymentRedirectUrl } from '@/utils/paymentRedirectUrl';
import { toInternationalPhone } from '@/utils/phoneFormat';
import { getAuthToken, getUserId } from '@/utils/storage';
import { showAlert } from '@/utils/alert';
import { CommonActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook pour gérer le paiement Mobile Money (checkout navigateur système + deeplink).
 */
export const usePaymentManagement = (defaultCountryCode: string = '+225') => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [paymentNumber, setPaymentNumber] = useState('');
    const [paymentCountryCode, setPaymentCountryCode] = useState(defaultCountryCode);

    useEffect(() => {
        setCardName('');
        setCardNumber('');
        setCardCvv('');
        setExpirationDate('');
        setPaymentNumber('');
    }, [selectedPaymentMethod]);

    useEffect(() => {
        setPaymentCountryCode(defaultCountryCode);
    }, [defaultCountryCode]);

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

    const navigateToConfirmation = useCallback((
        navigation: any,
        payload: {
            bookingResponse: any;
            paymentResponse: any;
            trip: any;
            returnTrip: any;
            passengers: any[];
            searchParams: any;
            rebookingCode?: string;
        }
    ) => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{
                    name: 'trip/booking-confirmation' as any,
                    params: payload,
                }]
            })
        );
    }, []);

    const navigatePaymentResult = useCallback((
        navigation: any,
        bookingId: string,
        kind: 'success' | 'error'
    ) => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{
                    name: kind === 'success' ? 'payment/success' as any : 'payment/error' as any,
                    params: kind === 'success'
                        ? { bookingId }
                        : { bookingId, reason: 'failed' },
                }],
            })
        );
    }, []);

    /**
     * Ouvre le checkout dans le navigateur système (hors app) pour que
     * le retour passe bien par Universal Links / App Links / custom scheme.
     * L’écran de vérification est affiché avant de quitter l’app.
     */
    const openCheckoutExternally = useCallback(async (
        redirectUrl: string,
        bookingId: string,
        navigation: any
    ) => {
        navigatePaymentResult(navigation, bookingId, 'success');

        try {
            if (!isAllowedPaymentRedirectUrl(redirectUrl)) {
                showAlert(
                    'Lien de paiement invalide',
                    'L’URL de checkout n’est pas sécurisée. Réessayez ou changez de wallet.'
                );
                return;
            }
            const supported = await Linking.canOpenURL(redirectUrl);
            if (!supported) {
                showAlert(
                    'Navigateur indisponible',
                    'Impossible d’ouvrir la page de paiement. Utilisez « Rouvrir le paiement » sur l’écran suivant.'
                );
                return;
            }
            // Laisse le temps à la navigation de peindre l’écran de vérif
            await new Promise((r) => setTimeout(r, 350));
            await Linking.openURL(redirectUrl);
        } catch (error) {
            console.warn('Ouverture checkout externe échouée', error);
            showAlert(
                'Erreur',
                'Impossible d’ouvrir le paiement dans le navigateur. Réessayez via « Rouvrir le paiement ».'
            );
        }
    }, [navigatePaymentResult]);

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
            const { method: paymentMethod, provider } = mapUiPaymentMethod(selectedPaymentMethod);

            let bookingResponse: any;

            if (rebookingCode?.trim()) {
                const rebookingPassengers = buildRebookingPassengers(passengers, trip, returnTrip, isRoundTrip, userId);
                const rebookingPayload = {
                    tokenCode: rebookingCode.trim(),
                    departureId: trip.id,
                    returnDepartureId: isRoundTrip && returnTrip ? returnTrip.id : null,
                    passengers: rebookingPassengers,
                    departureTripId: trip.departureTripId ?? null,
                    returnDepartureTripId: isRoundTrip && returnTrip ? returnTrip.departureTripId : null,
                };
                bookingResponse = await createRebookingBooking(rebookingPayload, token || '');
            } else {
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
                    departureTripId: trip.departureTripId ?? null,
                    returnDepartureTripId: isRoundTrip && returnTrip ? returnTrip.departureTripId : null,
                    ...(isRoundTrip && returnTrip ? { returnDepartureId: returnTrip.id } : {}),
                    type: tripType,
                    channel: 'MOBILE_APP',
                    paymentMethod,
                    paymentChannel: 'MOBILE_APP',
                    paymentProvider: provider,
                    currency: trip.currency || 'XOF',
                    contact,
                    passengers: passengersData,
                    totalAmount: pricing.totalAmount
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
                navigateToConfirmation(navigation, {
                    bookingResponse,
                    paymentResponse: {
                        data: {
                            status: 'PAID',
                            amount: 0,
                            currency: trip.currency || 'XOF',
                            bookingId,
                            method: 'REBOOKING',
                            provider: 'REBOOKING'
                        },
                        status: 200
                    },
                    trip,
                    returnTrip,
                    passengers,
                    searchParams,
                    rebookingCode
                });
                return;
            }

            if (paymentMethod === 'MOBILE_MONEY' && !provider) {
                throw new Error('Sélectionnez un wallet Mobile Money (Wave, Orange, MTN ou Moov).');
            }

            const rawPhone = paymentNumber.trim() || passengers[0]?.phone?.trim() || emergencyContact.phone.trim();
            const phoneNumber = toInternationalPhone(
                paymentCountryCode || passengers[0]?.countryCode || '+225',
                rawPhone
            );

            const paymentData: PayBookingRequest = {
                bookingId,
                method: paymentMethod,
                provider: provider || undefined,
                amount: pricing.totalAmount,
                channel: 'MOBILE_APP',
                currency: trip.currency || 'XOF',
                rawPayload: {
                    PaymentInfo: {
                        phoneNumber,
                    },
                },
            };

            const paymentResponse = await createBookingPayment(paymentData, token || '');

            if (paymentResponse.status !== 200 && paymentResponse.status !== 201) {
                throw new Error('Erreur paiement');
            }

            const payData = {
                ...paymentResponse.data,
                // L’API omet parfois provider : on conserve celui choisi à l’UI
                provider: paymentResponse.data?.provider || paymentResponse.data?.paymentProvider || provider || undefined,
                paymentProvider:
                    paymentResponse.data?.paymentProvider ||
                    paymentResponse.data?.provider ||
                    provider ||
                    undefined,
                method: paymentResponse.data?.method || paymentMethod,
            };
            const paymentStatus = (payData.paymentStatus || payData.status || '').toUpperCase();
            const redirectUrl = payData.redirectUrl;

            if (
                !redirectUrl &&
                (paymentStatus === 'SUCCEEDED' || paymentStatus === 'PAID')
            ) {
                navigateToConfirmation(navigation, {
                    bookingResponse,
                    paymentResponse: { ...paymentResponse, data: payData },
                    trip,
                    returnTrip,
                    passengers,
                    searchParams,
                    rebookingCode,
                });
                return;
            }

            if (!redirectUrl) {
                throw new Error('Pas d\'URL de checkout. Réessayez ou changez de wallet.');
            }

            await savePendingPayment({
                bookingId,
                paymentId: payData.paymentId,
                expiresAt: payData.expiresAt,
                bookingResponse: bookingResponse.data,
                paymentInitResponse: payData,
                trip,
                returnTrip,
                passengers,
                searchParams,
                rebookingCode,
                emergencyContact,
                feesAndTaxes: {
                    feesTotal: pricing.feesTotal,
                    taxesTotal: pricing.taxesTotal,
                    totalAmount: pricing.totalAmount,
                },
                createdAt: new Date().toISOString(),
                phase: 'checkout',
            });

            await openCheckoutExternally(redirectUrl, bookingId, navigation);
        } catch (error: any) {
            console.error('Erreur réservation:', error);
            showAlert('Erreur', error?.response?.data?.message || error?.message || 'Erreur lors de la réservation');
            throw error;
        }
    }, [
        selectedPaymentMethod,
        paymentNumber,
        paymentCountryCode,
        buildRebookingPassengers,
        navigateToConfirmation,
        openCheckoutExternally,
    ]);

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
