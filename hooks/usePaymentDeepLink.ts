import { getPendingPayment } from '@/utils/pendingPayment';
import { parsePaymentDeepLink } from '@/utils/paymentDeepLink';
import * as Linking from 'expo-linking';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Écoute les deeplinks paiement (retour navigateur externe / Universal Links)
 * et oriente vers l’écran de vérif ou d’échec avec le bon bookingId.
 */
export function usePaymentDeepLink() {
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const handlingRef = useRef(false);
    const lastUrlRef = useRef<string | null>(null);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        const openPaymentUrl = async (url: string | null) => {
            if (!url) return;

            const parsed = parsePaymentDeepLink(url);
            if (parsed.kind === 'unknown') return;

            const path = pathnameRef.current || '';
            if (parsed.kind === 'success' && path.includes('payment/success')) return;
            if (parsed.kind === 'error' && path.includes('payment/error')) return;
            if (path.includes('ticket-details') || path.includes('booking-confirmation')) return;

            if (lastUrlRef.current === url && handlingRef.current) return;
            lastUrlRef.current = url;
            handlingRef.current = true;

            try {
                const pending = await getPendingPayment();
                // Session pending = source de vérité ; ignore un bookingId URL différent
                let bookingId: string | null = pending?.bookingId || null;
                if (
                    parsed.bookingId &&
                    pending?.bookingId &&
                    parsed.bookingId !== pending.bookingId
                ) {
                    console.warn(
                        '[payment-deeplink] bookingId URL ≠ pending — ignore URL id'
                    );
                } else if (!pending && parsed.bookingId) {
                    // Pas de session : on n’accepte pas un id URL seul (anti-probing)
                    bookingId = null;
                }

                if (parsed.kind === 'success') {
                    router.replace({
                        pathname: '/payment/success',
                        params: bookingId ? { bookingId, recovered: '1' } : { recovered: '1' },
                    });
                    return;
                }

                router.replace({
                    pathname: '/payment/error',
                    params: {
                        reason: 'failed',
                        ...(bookingId ? { bookingId } : {}),
                    },
                });
            } finally {
                setTimeout(() => {
                    handlingRef.current = false;
                }, 1200);
            }
        };

        Linking.getInitialURL().then(openPaymentUrl);
        const sub = Linking.addEventListener('url', ({ url }) => {
            openPaymentUrl(url);
        });
        return () => sub.remove();
    }, [router]);
}
