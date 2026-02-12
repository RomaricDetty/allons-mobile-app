// @ts-nocheck
import { payBusRentalRequest, PayDto } from '@/api/auth_register';
import { PaymentMethodBlock } from '@/components/passengers/PaymentMethodBlock';
import { SectionHeader } from '@/components/passengers/SectionHeader';
import { SelectionBottomSheet } from '@/components/passengers/SelectionBottomSheet';
import { useAppColors } from '@/hooks/use-app-colors';
import { usePaymentManagement } from '@/hooks/usePaymentManagement';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/** Mappe la méthode UI vers PaymentMethod + PaymentProvider (enums backend) */
function mapToPayMethodAndProvider(uiMethod: string | null): { method: string; provider?: string } {
    switch (uiMethod) {
        case 'credit-card':
            return { method: 'OTHER', provider: 'CREDIT_CARD' };
        case 'wave':
            return { method: 'MOBILE_MONEY', provider: 'WAVE' };
        case 'orange-money':
            return { method: 'MOBILE_MONEY', provider: 'ORANGE_MONEY' };
        case 'mtn-money':
            return { method: 'MOBILE_MONEY', provider: 'MTN_MONEY' };
        default:
            return { method: 'OTHER', provider: undefined };
    }
}

/** Parse sécurisé de l’item passé en paramètre (JSON stringifié) */
function parseRequestItem(param: string | undefined): Record<string, any> {
    if (param == null || typeof param !== 'string') return {};
    try {
        return JSON.parse(param) || {};
    } catch {
        return {};
    }
}

/**
 * Écran de paiement pour une demande de location de bus (statut ACCEPTED).
 * Réutilise le bloc de méthode de paiement comme sur passengers-info.
 */
export default function BusRentalPaymentScreen() {
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const { item: itemParam } = useLocalSearchParams<{ item?: string }>();
    const requestItem = useMemo(() => parseRequestItem(itemParam), [itemParam]);

    const [showSelectSheet, setShowSelectSheet] = useState(false);
    const [selectTitle, setSelectTitle] = useState('');
    const [selectOptions, setSelectOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [selectValue, setSelectValue] = useState('');
    const selectCallbackRef = useRef<((value: string) => void) | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    } = usePaymentManagement('+225');

    const departureName = requestItem?.departureCity?.name ?? '—';
    const arrivalName = requestItem?.arrivalCity?.name ?? '—';
    const amount = requestItem?.quoteAmount ?? requestItem?.amount ?? requestItem?.totalAmount ?? 0;
    const amountFormatted = amount ? `${Number(amount).toLocaleString('fr-FR')} XOF` : '—';

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

    const handleSelect = useCallback((value: string) => {
        const apply = selectCallbackRef.current;
        if (typeof apply === 'function') apply(value);
        selectCallbackRef.current = null;
        setShowSelectSheet(false);
    }, []);

    const handleOpenBottomSheet = useCallback(
        (
            _type: string,
            title: string,
            options: Array<{ value: string; label: string }>,
            currentValue: string,
            onSelect: (value: string) => void
        ) => {
            openSelect(title, options, currentValue, onSelect);
        },
        [openSelect]
    );

    const handleCancel = useCallback(() => {
        router.back();
    }, []);

    const handleConfirmAndPay = useCallback(async () => {
        if (!selectedPaymentMethod) {
            Alert.alert('Attention', 'Veuillez choisir une méthode de paiement');
            return;
        }
        const referenceId = requestItem?.id;
        if (!referenceId) {
            Alert.alert('Erreur', 'Demande de location introuvable');
            return;
        }
        const amountNum = Number(requestItem?.quotedAmount ?? requestItem?.quoteAmount ?? requestItem?.amount ?? requestItem?.totalAmount ?? 0);
        if (!amountNum || amountNum <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }
        const { method, provider } = mapToPayMethodAndProvider(selectedPaymentMethod);
        const rawPayload: Record<string, unknown> = {};
        if (selectedPaymentMethod === 'credit-card') {
            rawPayload.cardName = cardName;
            rawPayload.cardNumber = cardNumber?.replace(/\s/g, '');
            rawPayload.expirationDate = expirationDate;
            rawPayload.cvv = cardCvv;
        } else {
            rawPayload.phoneNumber = paymentNumber;
            rawPayload.countryCode = paymentCountryCode;
        }
        const payData: PayDto = {
            referenceId,
            method,
            amount: amountNum,
            channel: 'MOBILE_APP',
            currency: 'XOF',
            provider: provider ?? undefined,
            rawPayload: Object.keys(rawPayload).length > 0 ? rawPayload : undefined,
        };
        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
                return;
            }
            const response = await payBusRentalRequest(payData, token);
            if (response.status >= 200 && response.status < 300) {
                Alert.alert('Paiement effectué', 'Votre paiement a bien été enregistré.', [{ text: 'OK', onPress: () => router.back() }]);
            } else {
                Alert.alert('Erreur', response?.data?.message ?? 'Le paiement a échoué.');
            }
        } catch (error: any) {
            const message = error?.response?.data?.message ?? error?.message ?? 'Une erreur est survenue lors du paiement';
            Alert.alert('Erreur', message);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        selectedPaymentMethod,
        requestItem,
        cardName,
        cardNumber,
        expirationDate,
        cardCvv,
        paymentNumber,
        paymentCountryCode,
    ]);

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={25} color={colors.icon} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                    Location de bus – {departureName} → {arrivalName}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>Montant de la location</Text>
                        <Text style={[styles.amountValue, { color: colors.activeTabColor }]}>
                            {
                                requestItem.quotedAmount ? `${requestItem.quotedAmount} XOF` : '—'
                            }
                        </Text>
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
                            onOpenBottomSheet={handleOpenBottomSheet}
                        />
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 8, backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                    <Pressable style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleCancel}>
                        <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.confirmButton, { backgroundColor: colors.activeTabColor, opacity: isSubmitting ? 0.7 : 1 }]}
                        onPress={handleConfirmAndPay}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <SelectionBottomSheet
                visible={showSelectSheet}
                title={selectTitle}
                options={selectOptions}
                currentValue={selectValue}
                onSelect={handleSelect}
                onClose={closeSelect}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    card: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    amountLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: { fontSize: 16, fontFamily: 'Ubuntu_Bold' },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: { fontSize: 16, fontFamily: 'Ubuntu_Bold', color: '#FFFFFF' },
});
