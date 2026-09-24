import {
    getPendingPayment,
    isPendingPaymentRecoverable,
    } from '@/utils/pendingPayment';
import { usePathname,
    useRouter } from 'expo-router';
import { useCallback,
    useEffect,
    useRef } from 'react';
import { AppState,
    AppStateStatus,
} from 'react-native';

/**
 * Reprend automatiquement une vérification de paiement si l'app a été
 * interrompue (appel, kill, hot reload, extinction) pendant le checkout.
 */
export function usePendingPaymentRecovery(enabled: boolean = true) {
    const router = useRouter();
    const pathname = usePathname();
    const navigatingRef = useRef(false);

    const resumeIfNeeded = useCallback(async () => {
        if (!enabled || navigatingRef.current) return;

        const pending = await getPendingPayment();
        if (!isPendingPaymentRecoverable(pending) || !pending?.bookingId) return;

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
    }, [enabled, pathname, router]);

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
