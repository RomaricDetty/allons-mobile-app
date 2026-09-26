import { notifyPaymentStatusLocally } from '@/utils/notifyPaymentStatus';
import {
    clearPendingPayment,
    getPendingPayment,
    isPendingPaymentRecoverable,
    updatePendingPayment,
} from '@/utils/pendingPayment';
import {
    fetchBookingPaymentOutcome,
} from '@/utils/paymentPolling';
import { getAuthToken } from '@/utils/storage';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/** Quit volontaires (sync) — évite une course avant l’écriture AsyncStorage. */
const voluntaryDismissals = new Set<string>();

/**
 * Reprend une vérification de paiement interrompue.
 * Si l’utilisateur a volontairement quitté l’écran, on vérifie en silence
 * (push) sans le forcer à revenir sur /payment/success.
 * Une session déjà réussie n’est jamais relancée.
 */
export function usePendingPaymentRecovery(enabled: boolean = true) {
    const router = useRouter();
    const pathname = usePathname();
    const navigatingRef = useRef(false);
    const silentCheckRef = useRef(false);
    const resolvedBookingIdsRef = useRef<Set<string>>(new Set());

    const silentCheckDismissed = useCallback(async () => {
        if (silentCheckRef.current) return;
        silentCheckRef.current = true;
        try {
            const pending = await getPendingPayment();
            if (!pending?.bookingId) return;

            const isDismissed =
                pending.phase === 'dismissed' ||
                !!pending.dismissedAt ||
                voluntaryDismissals.has(pending.bookingId);

            if (!isDismissed) return;

            if (resolvedBookingIdsRef.current.has(pending.bookingId)) {
                voluntaryDismissals.delete(pending.bookingId);
                await clearPendingPayment();
                return;
            }
            if (!isPendingPaymentRecoverable(pending)) {
                voluntaryDismissals.delete(pending.bookingId);
                await clearPendingPayment();
                return;
            }

            const token = (await getAuthToken()) || undefined;
            const outcome = await fetchBookingPaymentOutcome(pending.bookingId, token);

            if (outcome.kind === 'succeeded') {
                resolvedBookingIdsRef.current.add(pending.bookingId);
                voluntaryDismissals.delete(pending.bookingId);
                await notifyPaymentStatusLocally('success', pending.bookingId);
                await clearPendingPayment();
                return;
            }
            if (outcome.kind === 'failed' || outcome.kind === 'expired') {
                resolvedBookingIdsRef.current.add(pending.bookingId);
                voluntaryDismissals.delete(pending.bookingId);
                await notifyPaymentStatusLocally(outcome.kind, pending.bookingId);
                await clearPendingPayment();
            }
            // still_pending : on laisse la session dismissed, prochain AppState recheckera
        } catch (error) {
            console.warn('Vérification silencieuse paiement échouée', error);
        } finally {
            setTimeout(() => {
                silentCheckRef.current = false;
            }, 4000);
        }
    }, []);

    const resumeIfNeeded = useCallback(async () => {
        if (!enabled || navigatingRef.current) return;

        const pending = await getPendingPayment();
        if (!pending?.bookingId) return;

        // Déjà confirmé localement : ne jamais réouvrir l’écran de vérif
        if (
            pending.phase === 'succeeded' ||
            resolvedBookingIdsRef.current.has(pending.bookingId)
        ) {
            voluntaryDismissals.delete(pending.bookingId);
            await clearPendingPayment();
            return;
        }

        if (!isPendingPaymentRecoverable(pending)) {
            voluntaryDismissals.delete(pending.bookingId);
            await clearPendingPayment();
            return;
        }

        // Quit volontaire : jamais de redirection forcée, seulement check + push
        if (
            pending.phase === 'dismissed' ||
            pending.dismissedAt ||
            voluntaryDismissals.has(pending.bookingId)
        ) {
            await silentCheckDismissed();
            return;
        }

        const path = pathname || '';
        const alreadyOnPaymentScreen =
            path.includes('/payment/success') ||
            path.includes('/payment/error') ||
            path.includes('payment/success') ||
            path.includes('payment/error') ||
            path.includes('booking-confirmation') ||
            path.includes('ticket-details') ||
            path.includes('notification/payment-status');

        if (alreadyOnPaymentScreen) return;

        navigatingRef.current = true;
        try {
            router.replace({
                pathname: '/payment/success',
                params: { bookingId: pending.bookingId, recovered: '1' },
            });
        } finally {
            setTimeout(() => {
                navigatingRef.current = false;
            }, 1500);
        }
    }, [enabled, pathname, router, silentCheckDismissed]);

    useEffect(() => {
        if (!enabled) return;
        const timer = setTimeout(() => {
            resumeIfNeeded();
        }, 600);
        return () => clearTimeout(timer);
    }, [enabled, resumeIfNeeded]);

    useEffect(() => {
        if (!enabled) return;

        const onChange = (next: AppStateStatus) => {
            if (next === 'active') {
                resumeIfNeeded();
            }
        };

        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [enabled, resumeIfNeeded]);
}

/**
 * Marque la session comme quittée volontairement (retour accueil pendant checking).
 * Enregistre aussi un garde synchrone pour bloquer toute redirection recovery.
 */
export async function dismissPendingPaymentVerification(): Promise<void> {
    const pending = await getPendingPayment();
    if (pending?.bookingId) {
        voluntaryDismissals.add(pending.bookingId);
    }
    await updatePendingPayment({
        phase: 'dismissed',
        dismissedAt: new Date().toISOString(),
    });
}

/**
 * Marque la session comme payée pour bloquer toute reprise / boucle.
 */
export async function markPendingPaymentSucceeded(): Promise<void> {
    const pending = await getPendingPayment();
    if (pending?.bookingId) {
        voluntaryDismissals.delete(pending.bookingId);
    }
    await updatePendingPayment({
        phase: 'succeeded',
        dismissedAt: null,
    });
}
