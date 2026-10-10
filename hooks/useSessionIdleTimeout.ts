import { useAuth } from '@/contexts/AuthContext';
import {
    bumpSessionActivity,
    PROACTIVE_REFRESH_IDLE_MS,
} from '@/utils/sessionActivity';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const PAYMENT_PATH_PREFIXES = ['/payment', 'payment/'];

function isPaymentPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return PAYMENT_PATH_PREFIXES.some((p) => pathname.includes(p));
}

/**
 * Suit l’inactivité pour coller aux 30 min backend :
 * - bump d’activité à la navigation / retour au premier plan
 * - si idle ≥ 25 min au resume → refresh access (jamais de signOut sur idle seul)
 * Les écrans /payment/* ne déclenchent pas de refresh agressif.
 */
export function useSessionIdleTimeout(enabled = true) {
    const { isAuthenticated, ensureSession } = useAuth();
    const pathname = usePathname();
    const lastActiveRef = useRef(Date.now());
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    // Navigation = activité
    useEffect(() => {
        if (!enabled || !isAuthenticated) return;
        lastActiveRef.current = Date.now();
        void bumpSessionActivity();
    }, [enabled, isAuthenticated, pathname]);

    useEffect(() => {
        if (!enabled || !isAuthenticated) {
            return;
        }

        const onAppState = (state: AppStateStatus) => {
            if (state !== 'active') return;

            const idle = Date.now() - lastActiveRef.current;
            lastActiveRef.current = Date.now();

            if (isPaymentPath(pathnameRef.current)) {
                void bumpSessionActivity();
                return;
            }

            // Idle proche/au‑delà du seuil backend → renouveler l’access, pas déconnecter
            if (idle >= PROACTIVE_REFRESH_IDLE_MS) {
                void ensureSession();
            } else {
                void bumpSessionActivity();
            }
        };

        const sub = AppState.addEventListener('change', onAppState);
        return () => sub.remove();
    }, [enabled, isAuthenticated, ensureSession]);
}
