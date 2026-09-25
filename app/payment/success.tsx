// @ts-nocheck
import { getBookingDetails } from '@/api/booking';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatFullDate, formatStatus, getStatusColor } from '@/constants/functions';
import { formatPaymentMethod } from '@/constants/paymentMethods';
import { useAppColors } from '@/hooks/use-app-colors';
import { dismissPendingPaymentVerification } from '@/hooks/usePendingPaymentRecovery';
import { transformBookingData } from '@/utils/bookingDataTransformer';
import { notifyPaymentStatusLocally } from '@/utils/notifyPaymentStatus';
import {
    clearPendingPayment,
    getPendingPayment,
    updatePendingPayment,
} from '@/utils/pendingPayment';
import {
    fetchBookingPaymentOutcome,
    pollBookingPaymentStatus,
} from '@/utils/paymentPolling';
import { getAuthToken } from '@/utils/storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Phase = 'checking' | 'success' | 'awaiting_confirmation';

WebBrowser.maybeCompleteAuthSession();

const PENDING_ACCENT = '#B86E00';

const formatRemaining = (ms: number): string => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Écran de vérification paiement — UI alignée ticket / confirmation AllOn.
 */
export default function PaymentSuccessScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ bookingId?: string; recovered?: string }>();

    const [phase, setPhase] = useState<Phase>('checking');
    const [sessionBundle, setSessionBundle] = useState<any>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [remainingMs, setRemainingMs] = useState<number | null>(null);
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

    const recap = useMemo(() => {
        if (!sessionBundle) return null;
        return transformBookingData({
            bookingResponse: { data: sessionBundle.bookingResponse },
            paymentResponse: { data: sessionBundle.paymentInitResponse },
            trip: sessionBundle.trip,
            returnTrip: sessionBundle.returnTrip,
            passengers: sessionBundle.passengers,
        });
    }, [sessionBundle]);

    const providerLabel = useMemo(() => {
        const pay = sessionBundle?.paymentInitResponse || {};
        const rawCandidates = [
            pay.provider,
            pay.paymentProvider,
            pay.wallet,
            pay.method,
            recap?.provider,
            recap?.paymentProvider,
            recap?.method,
        ];

        for (const raw of rawCandidates) {
            const value = String(raw ?? '').trim();
            if (!value || /^n\/?a$/i.test(value)) continue;
            const label = formatPaymentMethod(value);
            if (!label || /^n\/?a$/i.test(label)) continue;
            if (label.toUpperCase() === 'MOBILE MONEY' || value.toUpperCase() === 'MOBILE_MONEY') {
                continue;
            }
            return label;
        }
        return '';
    }, [sessionBundle, recap]);

    const pendingHintText = useMemo(() => {
        if (phase === 'success') return '';
        if (phase === 'awaiting_confirmation') {
            return providerLabel
                ? `Si vous avez validé le paiement sur ${providerLabel}, votre billet sera confirmé sous peu.`
                : 'Si vous avez validé le paiement dans votre application Mobile Money, votre billet sera confirmé sous peu.';
        }
        return providerLabel
            ? `Validez le paiement dans ${providerLabel}. Vous pouvez quitter cet écran : on vous préviendra.`
            : 'Validez le paiement dans votre application Mobile Money. Vous pouvez quitter cet écran : on vous préviendra.';
    }, [phase, providerLabel]);

    const checkoutUrl = useMemo(() => {
        const pay = sessionBundle?.paymentInitResponse || {};
        return pay.redirectUrl || pay.paymentUrl || null;
    }, [sessionBundle]);

    useEffect(() => {
        const expiresAt = sessionBundle?.expiresAt ? Date.parse(sessionBundle.expiresAt) : NaN;
        if (Number.isNaN(expiresAt)) {
            setRemainingMs(null);
            return;
        }
        const tick = () => setRemainingMs(Math.max(0, expiresAt - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [sessionBundle?.expiresAt]);

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

            await updatePendingPayment({ phase: 'verifying', dismissedAt: null });
            const token = (await getAuthToken()) || undefined;

            if (options?.continuous === false) {
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
                return;
            }

            const outcome = await pollBookingPaymentStatus(bookingId, {
                token,
                expiresAt: pending?.expiresAt,
                signal: cancelRef.current,
            });

            if (
                cancelRef.current.cancelled ||
                outcome.kind === 'cancelled' ||
                generation !== generationRef.current
            ) {
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

    const handleReopenPayment = useCallback(async () => {
        if (!checkoutUrl) return;
        try {
            await WebBrowser.openBrowserAsync(String(checkoutUrl));
        } catch (error) {
            console.warn('Impossible de rouvrir le paiement', error);
        }
    }, [checkoutUrl]);

    const goToTicketRecap = useCallback(async () => {
        const pending = sessionBundle || (await getPendingPayment());
        const bookingId =
            bookingIdRef.current || (params.bookingId as string) || pending?.bookingId;
        if (!bookingId || !pending) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: '(tabs)' as any }],
                })
            );
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
                bookingResponse = await getBookingDetails(bookingId, token);
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

    const goHomeKeepPending = useCallback(async () => {
        cancelRef.current.cancelled = true;
        generationRef.current += 1;
        pollingRef.current = false;
        await dismissPendingPaymentVerification();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: '(tabs)' as any }],
            })
        );
    }, [navigation]);

    const statusBadgeColor = phase === 'success' ? getStatusColor('PAID') : PENDING_ACCENT;
    const statusBadgeLabel = phase === 'success' ? formatStatus('PAID') : 'En attente';

    const formatAmount = (amount: any, currency = 'XOF') => {
        const n = Number(amount);
        if (!Number.isFinite(n)) return `${amount ?? '—'} ${currency}`;
        return `${n.toLocaleString('fr-FR')} ${currency}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            <ScreenHeader
                title="Vérification paiement"
                onBack={goHomeKeepPending}
                iconColor={colors.icon}
                textColor={colors.text}
                backgroundColor={colors.headerBackground}
                borderColor={colors.border}
                paddingTop={insets.top}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Statut paiement */}
                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.iconBlock}>
                            <Icon
                                name={phase === 'success' ? 'check-circle' : 'timer-sand'}
                                size={22}
                                color={phase === 'success' ? colors.success : primaryBlue}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {phase === 'success'
                                    ? 'Paiement confirmé'
                                    : 'En attente de paiement'}
                            </Text>
                            {phase !== 'success' && remainingMs != null ? (
                                <Text style={[styles.timerValue, { color: primaryBlue }]}>
                                    Temps restant {formatRemaining(remainingMs)}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    {phase !== 'success' ? (
                        <Text style={[styles.hint, { color: colors.secondaryText }]}>
                            {pendingHintText}
                        </Text>
                    ) : (
                        <Text style={[styles.hint, { color: colors.secondaryText }]}>
                            Votre réservation est confirmée. Consultez votre ticket ci-dessous.
                        </Text>
                    )}

                    {phase === 'checking' ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="small" color={primaryBlue} />
                        </View>
                    ) : null}

                    {phase !== 'success' && checkoutUrl ? (
                        <AppButton
                            title="Rouvrir le paiement"
                            onPress={handleReopenPayment}
                            style={{ marginTop: 12 }}
                            icon={<Icon name="open-in-new" size={18} color="#FFFFFF" />}
                        />
                    ) : null}
                </View>

                {/* Hero trajet */}
                {recap ? (
                    <>
                        <View style={[styles.heroCard, { backgroundColor: primaryBlue }]}>
                            <View style={styles.heroTop}>
                                <View style={styles.heroRouteWrap}>
                                    <Text style={styles.heroRoute}>
                                        {recap.trip?.stationFrom?.city || '—'} →{' '}
                                        {recap.trip?.stationTo?.city || '—'}
                                    </Text>
                                    <Text style={styles.heroReference}>
                                        Réf. {recap.code || '—'}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: statusBadgeColor },
                                    ]}
                                >
                                    <Text style={styles.statusBadgeText}>{statusBadgeLabel}</Text>
                                </View>
                            </View>

                            <View style={styles.heroMetaRow}>
                                <View style={[styles.heroMetaItem, styles.heroMetaDateItem]}>
                                    <Text style={styles.heroMetaLabel}>Date</Text>
                                    <Text style={styles.heroMetaValue}>
                                        {recap.departureDateTime
                                            ? formatFullDate(recap.departureDateTime)
                                            : '—'}
                                    </Text>
                                </View>
                                <View style={styles.heroMetaDivider} />
                                <View style={styles.heroMetaItem}>
                                    <Text style={styles.heroMetaLabel}>Départ</Text>
                                    <Text style={styles.heroMetaValue}>
                                        {recap.departureTime || '—'}
                                    </Text>
                                </View>
                                <View style={styles.heroMetaDivider} />
                                <View style={styles.heroMetaItem}>
                                    <Text style={styles.heroMetaLabel}>Durée</Text>
                                    <Text style={styles.heroMetaValue}>
                                        {recap.duration || '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Détails voyage */}
                        <View
                            style={[
                                styles.sectionCard,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <View style={styles.iconBlock}>
                                    <Icon name="bus" size={22} color={primaryBlue} />
                                </View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Détails du voyage
                                </Text>
                            </View>

                            <RecapRow
                                label="Compagnie"
                                value={recap.companyName || '—'}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />
                            <RecapRow
                                label="Arrivée estimée"
                                value={recap.arrivalTime || '—'}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />

                            <View style={[styles.stationsBlock, { borderTopColor: colors.border }]}>
                                <View style={styles.stationRow}>
                                    <View
                                        style={[styles.stationDot, { backgroundColor: colors.success }]}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.stationLabel,
                                                { color: colors.secondaryText },
                                            ]}
                                        >
                                            Départ
                                        </Text>
                                        <Text style={[styles.stationValue, { color: colors.text }]}>
                                            {recap.trip?.stationFrom?.name ||
                                                recap.trip?.stationFrom?.city ||
                                                '—'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.stationRow}>
                                    <View
                                        style={[styles.stationDot, { backgroundColor: colors.danger }]}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.stationLabel,
                                                { color: colors.secondaryText },
                                            ]}
                                        >
                                            Arrivée
                                        </Text>
                                        <Text style={[styles.stationValue, { color: colors.text }]}>
                                            {recap.trip?.stationTo?.name ||
                                                recap.trip?.stationTo?.city ||
                                                '—'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Passagers */}
                        <View
                            style={[
                                styles.sectionCard,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <View style={styles.iconBlock}>
                                    <Icon name="account-group" size={22} color={primaryBlue} />
                                </View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Passagers ({recap.passengers?.length || 0})
                                </Text>
                            </View>

                            {(recap.passengers || []).map((p: any, idx: number) => (
                                <View
                                    key={`${p.firstName}-${p.lastName}-${idx}`}
                                    style={[
                                        styles.passengerCard,
                                        {
                                            backgroundColor: colors.inputBackground,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.passengerName, { color: colors.text }]}>
                                        {p.firstName} {p.lastName}
                                    </Text>
                                    {p.email ? (
                                        <Text
                                            style={{
                                                color: colors.secondaryText,
                                                fontSize: 13,
                                                fontFamily: 'Ubuntu_Regular',
                                            }}
                                        >
                                            {p.email}
                                        </Text>
                                    ) : null}
                                    {p.phone ? (
                                        <Text
                                            style={{
                                                color: colors.secondaryText,
                                                fontSize: 13,
                                                fontFamily: 'Ubuntu_Regular',
                                            }}
                                        >
                                            {p.phone}
                                        </Text>
                                    ) : null}
                                    {p.seatNumber ? (
                                        <View style={styles.seatRow}>
                                            <Icon name="seat-passenger" size={16} color={primaryBlue} />
                                            <Text
                                                style={{
                                                    color: colors.text,
                                                    fontFamily: 'Ubuntu_Medium',
                                                    fontSize: 13,
                                                }}
                                            >
                                                Siège {p.seatNumber}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ))}
                        </View>

                        {/* Paiement */}
                        <View
                            style={[
                                styles.sectionCard,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <View style={styles.iconBlock}>
                                    <Icon name="wallet" size={22} color={primaryBlue} />
                                </View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    Détails du paiement
                                </Text>
                            </View>

                            <RecapRow
                                label="Prix par personne"
                                value={formatAmount(
                                    recap.prices?.outboundPricePerPerson,
                                    recap.currency
                                )}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />
                            <RecapRow
                                label="Passagers"
                                value={String(recap.prices?.numberOfPassengers || 1)}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />
                            <RecapRow
                                label={phase === 'success' ? 'Total payé' : 'Total à payer'}
                                value={formatAmount(recap.totalAmount, recap.currency)}
                                textColor={primaryBlue}
                                secondaryColor={colors.secondaryText}
                                strong
                            />
                            <RecapRow
                                label="Méthode"
                                value={providerLabel || 'Mobile Money'}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />
                            <RecapRow
                                label="Réservé le"
                                value={recap.createdAt ? formatFullDate(recap.createdAt) : '—'}
                                textColor={colors.text}
                                secondaryColor={colors.secondaryText}
                            />
                        </View>
                    </>
                ) : (
                    <View style={styles.loadingRecap}>
                        <ActivityIndicator color={primaryBlue} />
                        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
                            Chargement du récapitulatif…
                        </Text>
                    </View>
                )}

                <View style={styles.footerActions}>
                    {phase === 'success' ? (
                        <AppButton
                            title="Voir le récapitulatif et le ticket"
                            onPress={goToTicketRecap}
                            icon={<Icon name="ticket-confirmation" size={18} color="#FFFFFF" />}
                        />
                    ) : null}

                    {phase === 'awaiting_confirmation' ? (
                        <AppButton
                            title="Vérifier à nouveau"
                            onPress={handleRetryCheck}
                            loading={isRetrying}
                            disabled={isRetrying}
                        />
                    ) : null}

                    <AppButton
                        title="Retour à l'accueil"
                        onPress={goHomeKeepPending}
                        variant="secondary"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function RecapRow({
    label,
    value,
    textColor,
    secondaryColor,
    strong,
}: {
    label: string;
    value: string;
    textColor: string;
    secondaryColor: string;
    strong?: boolean;
}) {
    return (
        <View style={styles.recapRow}>
            <Text style={[styles.recapLabel, { color: secondaryColor }]}>{label}</Text>
            <Text
                style={[
                    styles.recapValue,
                    {
                        color: textColor,
                        fontFamily: strong ? 'Ubuntu_Bold' : 'Ubuntu_Medium',
                    },
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    sectionCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 16,
    },
    timerValue: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 18,
        marginTop: 4,
    },
    hint: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 13,
        lineHeight: 19,
    },
    loaderWrap: {
        marginTop: 16,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCard: {
        borderRadius: 12,
        padding: 16,
        gap: 14,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    heroRouteWrap: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    heroRoute: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        lineHeight: 26,
    },
    heroReference: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        color: 'rgba(255,255,255,0.9)',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    heroMetaRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.28)',
        paddingTop: 14,
    },
    heroMetaItem: {
        flex: 1,
        gap: 4,
    },
    heroMetaDateItem: {
        flex: 1.6,
    },
    heroMetaDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.28)',
        marginHorizontal: 10,
    },
    heroMetaLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        color: 'rgba(255,255,255,0.75)',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    heroMetaValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    recapRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 7,
    },
    recapLabel: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 13,
        flex: 1,
    },
    recapValue: {
        fontSize: 13,
        textAlign: 'right',
        flexShrink: 1,
        maxWidth: '55%',
    },
    stationsBlock: {
        marginTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        gap: 12,
    },
    stationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    stationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 5,
    },
    stationLabel: {
        fontFamily: 'Ubuntu_Medium',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    stationValue: {
        fontFamily: 'Ubuntu_Medium',
        fontSize: 14,
        marginTop: 2,
    },
    passengerCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        gap: 4,
    },
    passengerName: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 15,
    },
    seatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    loadingRecap: {
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 140,
    },
    loadingText: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 13,
    },
    footerActions: {
        gap: 8,
        marginTop: 4,
    },
});
