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

/**
 * Reprend une vérification de paiement interrompue.
 * Si l’utilisateur a volontairement quitté l’écran, on vérifie en silence
 * (push) sans le forcer à revenir sur /payment/success.
 */
export function usePendingPaymentRecovery(enabled: boolean = true) {
    const router = useRouter();
    const pathname = usePathname();
    const navigatingRef = useRef(false);
    const silentCheckRef = useRef(false);

    const silentCheckDismissed = useCallback(async () => {
        if (silentCheckRef.current) return;
        silentCheckRef.current = true;
        try {
            const pending = await getPendingPayment();
            if (!pending?.bookingId || pending.phase !== 'dismissed') return;
            if (!isPendingPaymentRecoverable(pending)) {
                await clearPendingPayment();
                return;
            }

            const token = (await getAuthToken()) || undefined;
            const outcome = await fetchBookingPaymentOutcome(pending.bookingId, token);

            if (outcome.kind === 'succeeded') {
                await notifyPaymentStatusLocally('success', pending.bookingId);
                await clearPendingPayment();
                return;
            }
            if (outcome.kind === 'failed' || outcome.kind === 'expired') {
                await notifyPaymentStatusLocally(outcome.kind, pending.bookingId);
                await clearPendingPayment();
            }
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
        if (!isPendingPaymentRecoverable(pending) || !pending?.bookingId) return;

        // Quit volontaire : pas de redirection forcée, seulement check + push
        if (pending.phase === 'dismissed' || pending.dismissedAt) {
            await silentCheckDismissed();
            return;
        }

        const path = pathname || '';
        const alreadyOnPaymentScreen =
            path.includes('/payment/success') ||
            path.includes('/payment/error') ||
            path.includes('payment/success') ||
            path.includes('payment/error');

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
 * Marque la session comme quittée volontairement (retour accueil).
 */
export async function dismissPendingPaymentVerification(): Promise<void> {
    await updatePendingPayment({
        phase: 'dismissed',
        dismissedAt: new Date().toISOString(),
    });
}
