// @ts-nocheck
import { getFeesAndTaxesQuote } from '@/api/booking';
import { FixedButton, Header, ProgressBar, SeatSelectionButton, SelectedSeatsDisplay } from '@/components/passengers-info';
import { EmergencyContactBlock } from '@/components/passengers/EmergencyContactBlock';
import { ErrorModal } from '@/components/passengers/ErrorModal';
import { PassengersInfoBlock } from '@/components/passengers/PassengersInfoBlock';
import { PaymentMethodBlock } from '@/components/passengers/PaymentMethodBlock';
import { NoPaymentRequiredBlock, RebookingCodeBlock } from '@/components/passengers/RebookingCodeBlock';
import { SelectionBottomSheet } from '@/components/passengers/SelectionBottomSheet';
import { SummaryBlock } from '@/components/passengers/SummaryBlock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBottomSheetSelection } from '@/hooks/useBottomSheetSelection';
import { useKeyboardVisibility } from '@/hooks/useKeyboardVisibility';
import { usePassengersForm } from '@/hooks/usePassengersForm';
import { usePaymentManagement } from '@/hooks/usePaymentManagement';
import { useRebookingCode } from '@/hooks/useRebookingCode';
import { useSeatsManagement } from '@/hooks/useSeatsManagement';
import { SearchParams, Trip } from '@/types';
import { getAuthToken } from '@/utils/storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


/**
 * Écran de saisie des informations passagers et paiement
 */
const PassengersInfo = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    const themeColors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        progressBarBackgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
    }), [colorScheme]);

    const routeParams = useMemo(() => (route.params as {
        trip?: Trip,
        returnTrip?: Trip,
        searchParams?: SearchParams
    }) || {}, [route.params]);

    const { trip, returnTrip, searchParams } = routeParams;
    const numberOfPersons = useMemo(() => searchParams?.numberOfPersons || 1, [searchParams?.numberOfPersons]);
    const isRoundTrip = useMemo(() => !!returnTrip, [returnTrip]);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [feesTotal, setFeesTotal] = useState<number>(Number((route.params as any)?.feesAndTaxes?.feesTotal || 0));
    const [taxesTotal, setTaxesTotal] = useState<number>(Number((route.params as any)?.feesAndTaxes?.taxesTotal || 0));
    const [apiTotalAmount, setApiTotalAmount] = useState<number>(Number((route.params as any)?.feesAndTaxes?.totalAmount || 0));

    // Hooks personnalisés
    const isKeyboardVisible = useKeyboardVisibility();
    
    const {
        passengers,
        setPassengers,
        emergencyContact,
        isLoading,
        setIsLoading,
        defaultCountryCode,
        updatePassenger,
        updateEmergencyContact,
        validateForm
    } = usePassengersForm(numberOfPersons, isRoundTrip, returnTrip);

    const { openSeatSelection } = useSeatsManagement(
        trip,
        returnTrip,
        passengers,
        setPassengers,
        isRoundTrip,
        navigation
    );

    const {
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
    } = usePaymentManagement(defaultCountryCode);

    const {
        showSelectionBottomSheet,
        selectionTitle,
        selectionOptions,
        currentSelectionValue,
        openSelectionBottomSheet,
        closeSelectionBottomSheet,
        handleSelection
    } = useBottomSheetSelection();

    const {
        rebookingCode,
        setRebookingCode,
        isVerifying,
        isCodeValid,
        discount,
        rebookingTokenData,
        verifyRebookingCode
    } = useRebookingCode();

    const totalPrice = useMemo(() => {
        if (!trip) return 0;
        const outboundPrice = trip.price * numberOfPersons;
        const returnPrice = returnTrip ? returnTrip.price * numberOfPersons : 0;
        return outboundPrice + returnPrice;
    }, [trip?.price, returnTrip?.price, numberOfPersons]);

    /**
     * Mappe la méthode de paiement UI vers les champs attendus par l'API de frais/taxes.
     */
    const getFeesPaymentConfig = useCallback((method: string | null) => {
        switch (method) {
            // case 'credit-card':
            //     return { method: 'CREDIT_CARD', provider: null };
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

    /**
     * Construit le tableau passagers requis par l'API frais/taxes.
     */
    const buildFeesPassengersPayload = useCallback(() => {
        const payload: Array<{ price: number; leg: 'OUTBOUND' | 'RETURN' }> = [];
        for (let i = 0; i < numberOfPersons; i += 1) {
            payload.push({ price: trip.price, leg: 'OUTBOUND' });
            if (isRoundTrip && returnTrip) {
                payload.push({ price: returnTrip.price, leg: 'RETURN' });
            }
        }
        return payload;
    }, [numberOfPersons, trip?.price, isRoundTrip, returnTrip?.price]);

    /**
     * Charge les frais/taxes pour calculer le total final de réservation.
     */
    const fetchFeesAndTaxes = useCallback(async () => {
        if (!trip?.id || !trip?.companyId) return;
        try {
            const { method, provider } = getFeesPaymentConfig(selectedPaymentMethod);
            const token = await getAuthToken();
            const response = await getFeesAndTaxesQuote(
                {
                    companyId: trip.companyId,
                    channel: 'MOBILE_APP',
                    paymentMethod: method,
                    paymentChannel: 'MOBILE_APP',
                    // ...(provider ? { provider } : {}),
                    passengers: buildFeesPassengersPayload(),
                    outboundDepartureId: trip.id,
                    ...(isRoundTrip && returnTrip?.id ? { returnDepartureId: returnTrip.id } : {}),
                },
                token || undefined
            );
            setFeesTotal(Number(response.data?.feesTotal || 0));
            setTaxesTotal(Number(response.data?.taxesTotal || 0));
            setApiTotalAmount(Number(response.data?.totalAmount || 0));
        } catch (error) {
            console.log('error response data', (error as any).response.data);
            console.log('error response status', (error as any).response.status);
            console.log('error response headers', (error as any).response.headers);
            console.log('error response config', (error as any).response.config);
            console.log('error response request', (error as any).response.request);
            console.log('error response data', (error as any).response.data);
            console.log('error response status', (error as any).response.status);
            console.log('error response headers', (error as any).response.headers);
            console.log('error response config', (error as any).response.config);
            console.log('error response request', (error as any).response.request);
            console.error('Erreur fees-and-taxes (passengers-info):', error);
        }
    }, [trip?.id, trip?.companyId, returnTrip?.id, isRoundTrip, buildFeesPassengersPayload, selectedPaymentMethod, getFeesPaymentConfig]);

    useEffect(() => {
        fetchFeesAndTaxes();
    }, [fetchFeesAndTaxes]);

    const pricing = useMemo(() => {
        const taxes = taxesTotal;
        const fees = feesTotal;
        const rebookingDiscount = isCodeValid ? discount : 0;
        const computedTotal = totalPrice + taxes + fees - rebookingDiscount;
        const totalAmount = Math.max(0, apiTotalAmount > 0 ? apiTotalAmount - rebookingDiscount : computedTotal);
        const totalAmountWithoutFees = totalAmount;
        return { 
            taxes, 
            fees,
            totalAmount, 
            totalAmountWithoutFees,
            rebookingDiscount
        };
    }, [totalPrice, discount, isCodeValid, taxesTotal, feesTotal, apiTotalAmount]);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /**
     * Gère la confirmation et le paiement
     */
    const handleConfirmAndPay = useCallback(async () => {
        const errors = validateForm(selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber, pricing.totalAmount);

        if (errors) {
            setValidationErrors(errors);
            setShowErrorModal(true);
            return;
        }

        try {
            setIsLoading(true);
            await processBookingAndPayment(
                trip,
                returnTrip,
                isRoundTrip,
                passengers,
                emergencyContact,
                pricing,
                navigation,
                searchParams,
                isCodeValid ? rebookingCode : undefined
            );
        } finally {
            setIsLoading(false);
        }
    }, [validateForm, selectedPaymentMethod, cardName, cardNumber, expirationDate, cardCvv, paymentNumber, processBookingAndPayment, trip, returnTrip, isRoundTrip, passengers, emergencyContact, pricing, navigation, searchParams, setIsLoading, isCodeValid, rebookingCode]);

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

                    <RebookingCodeBlock
                        rebookingCode={rebookingCode}
                        onRebookingCodeChange={setRebookingCode}
                        onVerifyCode={verifyRebookingCode}
                        isVerifying={isVerifying}
                        isCodeValid={isCodeValid}
                        rebookingTokenData={rebookingTokenData}
                    />

                    {isCodeValid && pricing.totalAmount === 0 && <NoPaymentRequiredBlock />}

                    {(!isCodeValid || pricing.totalAmount > 0) && (
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
                            countryCode={paymentCountryCode}
                            onCountryCodeChange={setPaymentCountryCode}
                            onOpenBottomSheet={openSelectionBottomSheet}
                        />
                    )}
                </View>

                <SummaryBlock
                    totalPrice={totalPrice}
                    taxes={pricing.taxes}
                    fees={pricing.fees}
                    totalAmount={pricing.totalAmount}
                    rebookingDiscount={pricing.rebookingDiscount}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    seatSelectionButtonSpacing: {
        marginTop: 12,
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