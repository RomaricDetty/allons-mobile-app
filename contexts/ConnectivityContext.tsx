/**
 * Contexte de connectivité pour gérer l'état de connexion internet
 * Vérifie en permanence la connectivité et notifie les composants
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface ConnectivityContextType {
    isConnected: boolean;
    isInternetReachable: boolean;
    connectionType: string | null;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

interface ConnectivityProviderProps {
    children: ReactNode;
}

/**
 * Provider du contexte de connectivité
 * Écoute les changements de connectivité en temps réel
 */
export function ConnectivityProvider({ children }: ConnectivityProviderProps) {
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
    const [connectionType, setConnectionType] = useState<string | null>(null);

    useEffect(() => {
        // Vérification initiale de la connectivité
        const checkInitialConnectivity = async () => {
            const state = await NetInfo.fetch();
            setIsConnected(state.isConnected ?? false);
            setIsInternetReachable(state.isInternetReachable ?? false);
            setConnectionType(state.type);
        };

        checkInitialConnectivity();

        // Écoute des changements de connectivité
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setIsConnected(state.isConnected ?? false);
            setIsInternetReachable(state.isInternetReachable ?? false);
            setConnectionType(state.type);
        });

        // Nettoyage de l'abonnement
        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <ConnectivityContext.Provider
            value={{
                isConnected,
                isInternetReachable,
                connectionType,
            }}
        >
            {children}
        </ConnectivityContext.Provider>
    );
}

/**
 * Hook pour accéder au contexte de connectivité
 */
export function useConnectivity() {
    const context = useContext(ConnectivityContext);
    if (context === undefined) {
        throw new Error('useConnectivity doit être utilisé dans un ConnectivityProvider');
    }
    return context;
}

