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
        // Construit le chemin actuel à partir des segments
        const currentPath = '/' + segments.join('/');
        
        // Liste des routes qui ne nécessitent pas de connexion internet
        const routesWithoutInternet = ['/onboard', '/no-internet'];

        // Vérifie si la route actuelle nécessite une connexion
        const requiresInternet = !routesWithoutInternet.some(route => 
            currentPath.startsWith(route)
        );

        // Si pas de connexion et que la route nécessite internet, rediriger vers no-internet
        if (requiresInternet && (!isConnected || !isInternetReachable)) {
            if (currentPath !== '/no-internet') {
                router.replace('/no-internet');
            }
        }
    }, [isConnected, isInternetReachable, segments]);

    return <>{children}</>;
}

