// @ts-nocheck
import {
    getBookingDetails } from '@/api/booking';
import { useAppColors } from '@/hooks/use-app-colors';
import {
    clearPendingPayment,
    getPendingPayment,
    updatePendingPayment,
    } from '@/utils/pendingPayment';
import { notifyPaymentStatusLocally } from '@/utils/notifyPaymentStatus';
import {
    fetchBookingPaymentOutcome,
    pollBookingPaymentStatus,
    } from '@/utils/paymentPolling';
import { getAuthToken } from '@/utils/storage';
import { CommonActions,
    useNavigation } from '@react-navigation/native';
import { router,
    useLocalSearchParams } from 'expo-router';
import React,
    { useCallback,
    useEffect,
    useRef,
    useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton } from '@/components/ui/AppButton';

type Phase = 'checking' | 'success' | 'awaiting_confirmation';

/**
 * Écran de confirmation de paiement.
 * Source de vérité = API payment-status (jamais le seul deep link).
 * Reprend le polling au retour foreground / recovery.
 */
export default function PaymentSuccessScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ bookingId?: string; recovered?: string }>();

    const [phase, setPhase] = useState<Phase>('checking');
    const [statusLabel, setStatusLabel] = useState(
        params.recovered === '1'
            ? 'Reprise de la vérification de votre paiement…'
            : 'Nous confirmons votre paiement…'
    );
    const [sessionBundle, setSessionBundle] = useState<any>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const cancelRef = useRef({ cancelled: false });
    const pollingRef = useRef(false);
    const generationRef = useRef(0);
    const bookingIdRef = useRef<string | null>(null);
    const notifiedRef = useRef(false);

    const primaryBlue = colors.activeTabColor;

    const notifyOnce = useCallback(async (status: 'success' | 'failed' | 'expired', bookingId: string) => {
        if (notifiedRef.current) return;
        notifiedRef.current = true;
        await notifyPaymentStatusLocally(status, bookingId);
    }, []);

    const resolveBookingId = useCallback(async () => {
        const pending = await getPendingPayment();
        setSessionBundle(pending);
        const bookingId = (params.bookingId as string) || pending?.bookingId || null;
        bookingIdRef.current = bookingId;
        return { bookingId, pending };
    }, [params.bookingId]);

    const runVerification = useCallback(async (options?: { continuous?: boolean }) => {
        if (pollingRef.current) return;
        const generation = ++generationRef.current;
        pollingRef.current = true;
        cancelRef.current = { cancelled: false };
        setPhase('checking');

        try {
            const { bookingId, pending } = await resolveBookingId();

            if (!bookingId) {
                router.replace({
                    pathname: '/payment/error',
                    params: { reason: 'missing_booking' },
                });
                return;
            }

            await updatePendingPayment({ phase: 'verifying' });
            const token = (await getAuthToken()) || undefined;

            if (options?.continuous === false) {
                setStatusLabel('Vérification en cours…');
                const outcome = await fetchBookingPaymentOutcome(bookingId, token);
                if (cancelRef.current.cancelled || generation !== generationRef.current) return;

                if (outcome.kind === 'succeeded') {
                    await notifyOnce('success', bookingId);
                    setPhase('success');
                    return;
                }
                if (outcome.kind === 'failed' || outcome.kind === 'expired') {
                    await notifyOnce(outcome.kind, bookingId);
                    router.replace({
                        pathname: '/payment/error',
                        params: { bookingId, reason: outcome.kind },
                    });
                    return;
                }
                setPhase('awaiting_confirmation');
                setStatusLabel(
                    'Si vous avez validé le paiement sur Wave / Orange / MTN, votre billet sera confirmé sous peu.'
                );
                return;
            }

            const outcome = await pollBookingPaymentStatus(bookingId, {
                token,
                expiresAt: pending?.expiresAt,
                signal: cancelRef.current,
                onTick: () => {
                    if (generation === generationRef.current) {
                        setStatusLabel('Paiement en cours de confirmation…');
                    }
                },
            });

            if (cancelRef.current.cancelled || outcome.kind === 'cancelled' || generation !== generationRef.current) {
                return;
            }

            if (outcome.kind === 'succeeded') {
                await notifyOnce('success', bookingId);
                setPhase('success');
                return;
            }

            if (outcome.kind === 'failed' || outcome.kind === 'expired') {
                await notifyOnce(outcome.kind, bookingId);
                router.replace({
                    pathname: '/payment/error',
                    params: { bookingId, reason: outcome.kind },
                });
                return;
            }

            setPhase('awaiting_confirmation');
            setStatusLabel(
                'La confirmation prend un peu plus de temps. Si vous avez été débité, ne repayez pas — retentez la vérification.'
            );
        } finally {
            if (generation === generationRef.current) {
                pollingRef.current = false;
            }
        }
    }, [resolveBookingId, notifyOnce]);

    useEffect(() => {
        runVerification({ continuous: true });
        return () => {
            cancelRef.current.cancelled = true;
            generationRef.current += 1;
            pollingRef.current = false;
        };
    }, [runVerification]);

    useEffect(() => {
        const onChange = (next: AppStateStatus) => {
            if (next !== 'active') return;
            if (phase === 'success') return;

            cancelRef.current.cancelled = true;
            generationRef.current += 1;
            pollingRef.current = false;

            if (phase === 'awaiting_confirmation') {
                runVerification({ continuous: false });
            } else {
                runVerification({ continuous: true });
            }
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [phase, runVerification]);

    const handleRetryCheck = useCallback(async () => {
        setIsRetrying(true);
        try {
            await runVerification({ continuous: false });
        } finally {
            setIsRetrying(false);
        }
    }, [runVerification]);

    const goToTicketRecap = useCallback(async () => {
        const pending = sessionBundle || (await getPendingPayment());
        const bookingId = bookingIdRef.current || (params.bookingId as string) || pending?.bookingId;
        if (!bookingId || !pending) {
            router.replace('/(tabs)');
            return;
        }

        const token = await getAuthToken();
        let bookingResponse = { data: pending.bookingResponse, status: 200 };
        let paymentResponse = {
            data: {
                ...pending.paymentInitResponse,
                status: 'PAID',
                paymentStatus: 'SUCCEEDED',
                bookingStatus: 'PAID',
                bookingId,
            },
            status: 200,
        };

        if (token) {
            try {
                const details = await getBookingDetails(bookingId, token);
                bookingResponse = details;
            } catch (error) {
                console.warn('Impossible de rafraîchir le booking, session locale utilisée', error);
            }
        }

        await clearPendingPayment();

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    {
                        name: 'trip/booking-confirmation' as any,
                        params: {
                            bookingResponse,
                            paymentResponse,
                            trip: pending.trip,
                            returnTrip: pending.returnTrip,
                            passengers: pending.passengers,
                            searchParams: pending.searchParams,
                            rebookingCode: pending.rebookingCode,
                        },
                    },
                ],
            })
        );
    }, [params.bookingId, sessionBundle, navigation]);

    const goHomeKeepPending = useCallback(() => {
        router.replace('/(tabs)');
    }, []);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 16,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.body}>
                {phase === 'checking' ? (
                    <View style={styles.statusBlock}>
                        <View style={styles.iconSlot}>
                            <Icon name="clock" size={32} color={primaryBlue} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Vérification du paiement
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                            {statusLabel}
                        </Text>
                        <Text style={[styles.hint, { color: colors.secondaryText }]}>
                            Vous pouvez recevoir un appel ou quitter l’app : la vérification reprendra automatiquement.
                        </Text>
                        <ActivityIndicator style={styles.spinner} size="small" color={primaryBlue} />
                    </View>
                ) : null}

                {phase === 'awaiting_confirmation' ? (
                    <View style={styles.statusBlock}>
                        <View style={styles.iconSlot}>
                            <Icon name="cellphone-check" size={32} color={primaryBlue} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Confirmation en attente
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                            {statusLabel}
                        </Text>
                        <Text style={[styles.hint, { color: colors.secondaryText }]}>
                            Ne lancez pas un nouveau paiement. Utilisez « Vérifier à nouveau » ci-dessous.
                        </Text>
                    </View>
                ) : null}

                {phase === 'success' ? (
                    <View style={styles.statusBlock}>
                        <View style={styles.iconSlot}>
                            <Icon name="check" size={32} color={colors.success} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Paiement réussi
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                            Votre réservation est confirmée. Consultez votre récapitulatif et votre ticket.
                        </Text>
                    </View>
                ) : null}
            </View>

            {phase === 'success' ? (
                <AppButton
                    title="Voir le récapitulatif et le ticket"
                    onPress={goToTicketRecap}
                    style={{ backgroundColor: primaryBlue }}
                />
            ) : null}

            {phase === 'awaiting_confirmation' ? (
                <View style={styles.actions}>
                    <AppButton
                        title="Vérifier à nouveau"
                        onPress={handleRetryCheck}
                        loading={isRetrying}
                        disabled={isRetrying}
                        style={{ backgroundColor: primaryBlue }}
                    />
                    <AppButton
                        title="Continuer plus tard"
                        onPress={goHomeKeepPending}
                        variant="secondary"
                    />
                </View>
            ) : null}

            {phase === 'checking' ? <View style={styles.footerSpacer} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBlock: {
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        gap: 12,
    },
    iconSlot: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 22,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    hint: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.85,
    },
    spinner: {
        marginTop: 16,
    },
    footerSpacer: {
        height: 48,
    },
    actions: {
        gap: 4,
    },
});
