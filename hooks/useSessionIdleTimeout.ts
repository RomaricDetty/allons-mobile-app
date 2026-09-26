import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';

const IDLE_MS = 45 * 60 * 1000;

const PAYMENT_PATH_PREFIXES = ['/payment', 'payment/'];

function isPaymentPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return PAYMENT_PATH_PREFIXES.some((p) => pathname.includes(p));
}

/**
 * Déconnexion après 45 min d'inactivité (navigation / retour app).
 * N'agit pas sur les écrans /payment/* (anti-régression checkout).
 */
export function useSessionIdleTimeout(enabled = true) {
    const { isAuthenticated, signOut } = useAuth();
    const pathname = usePathname();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActiveRef = useRef(Date.now());
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (!enabled || !isAuthenticated) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const clearTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const schedule = () => {
            clearTimer();
            timerRef.current = setTimeout(async () => {
                if (isPaymentPath(pathnameRef.current)) {
                    schedule();
                    return;
                }
                await signOut();
            }, IDLE_MS);
        };

        const bump = () => {
            lastActiveRef.current = Date.now();
            if (isPaymentPath(pathnameRef.current)) {
                clearTimer();
                return;
            }
            schedule();
        };

        bump();

        const onAppState = (state: AppStateStatus) => {
            if (state === 'active') {
                const idle = Date.now() - lastActiveRef.current;
                if (idle >= IDLE_MS && !isPaymentPath(pathnameRef.current)) {
                    InteractionManager.runAfterInteractions(() => {
                        void signOut();
                    });
                    return;
                }
                bump();
            }
        };

        const sub = AppState.addEventListener('change', onAppState);
        return () => {
            clearTimer();
            sub.remove();
        };
    }, [enabled, isAuthenticated, signOut, pathname]);
}
