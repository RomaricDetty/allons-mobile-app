// @ts-nocheck
/**
 * Composant de garde pour vérifier la connectivité
 * Redirige automatiquement vers l'écran no-internet si pas de connexion
 */
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { router, useSegments } from 'expo-router';
import { ReactNode, useEffect } from 'react';

interface ConnectivityGuardProps {
    children: ReactNode;
}

export function ConnectivityGuard({ children }: ConnectivityGuardProps) {
    const { isConnected, isInternetReachable } = useConnectivity();
    const segments = useSegments();

    useEffect(() => {
        const currentPath = '/' + segments.join('/');

        // Offline autorisé : onboarding, écran offline, parcours paiement (retour deeplink)
        const routesWithoutInternet = [
            '/onboard',
            '/no-internet',
            '/payment',
            '/notification/payment-status',
        ];

        const requiresInternet = !routesWithoutInternet.some((route) =>
            currentPath.startsWith(route)
        );

        if (currentPath === '/no-internet' && isConnected) {
            return;
        }

        if (requiresInternet && !isConnected) {
            if (currentPath !== '/no-internet') {
                router.replace('/no-internet');
            }
        }
    }, [isConnected, isInternetReachable, segments]);

    return <>{children}</>;
}

