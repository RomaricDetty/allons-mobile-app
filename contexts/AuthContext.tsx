/**
 * Contexte d'authentification : session utilisateur partagée (accueil, profil, etc.).
 * Le nom s'affiche immédiatement au login et disparaît au logout.
 */
import { authGetUserInfo } from '@/api/auth_register';
import { User } from '@/interfaces';
import { clearAuthData, getAuthToken, getUserId } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const USER_CACHE_KEY = 'user_profile';

type AuthContextType = {
    user: User | null;
    isAuthenticated: boolean;
    isAuthReady: boolean;
    /** Applique l'utilisateur tout de suite après login / inscription */
    setSessionUser: (user: User) => Promise<void>;
    /** Recharge depuis le cache + API (focus écran, démarrage) */
    refreshUser: () => Promise<void>;
    /** Déconnexion : efface tout de suite le nom + tokens */
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readCachedUser(): Promise<User | null> {
    try {
        const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.id && parsed?.firstName) {
            return parsed as User;
        }
        return null;
    } catch {
        return null;
    }
}

async function writeCachedUser(user: User | null): Promise<void> {
    try {
        if (!user) {
            await AsyncStorage.removeItem(USER_CACHE_KEY);
            return;
        }
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Erreur cache profil utilisateur:', error);
    }
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const setSessionUser = useCallback(async (nextUser: User) => {
        setUser(nextUser);
        await writeCachedUser(nextUser);
    }, []);

    const signOut = useCallback(async () => {
        setUser(null);
        await writeCachedUser(null);
        await clearAuthData();
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const [token, userId] = await Promise.all([getAuthToken(), getUserId()]);

            if (!token?.trim() || !userId?.trim()) {
                setUser(null);
                await writeCachedUser(null);
                return;
            }

            // Affiche le cache immédiatement si on n'a pas encore de user en mémoire
            const cached = await readCachedUser();
            if (cached && cached.id === userId) {
                setUser((prev) => prev ?? cached);
            }

            const response = await authGetUserInfo(userId, token);
            if (response?.status === 200 && response.data) {
                setUser(response.data);
                await writeCachedUser(response.data);
                return;
            }

            if (response?.status === 401 || response?.status === 403) {
                setUser(null);
                await writeCachedUser(null);
            }
        } catch (error) {
            console.error('Erreur refresh utilisateur:', error);
            const token = await getAuthToken();
            if (!token?.trim()) {
                setUser(null);
                await writeCachedUser(null);
            }
            // En cas d'erreur réseau, on conserve le user en cache déjà affiché
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [token, cached] = await Promise.all([getAuthToken(), readCachedUser()]);
                if (cancelled) return;

                if (token?.trim() && cached) {
                    setUser(cached);
                } else if (!token?.trim()) {
                    setUser(null);
                    await writeCachedUser(null);
                }

                await refreshUser();
            } finally {
                if (!cancelled) {
                    setIsAuthReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [refreshUser]);

    const value = useMemo<AuthContextType>(
        () => ({
            user,
            isAuthenticated: Boolean(user?.id),
            isAuthReady,
            setSessionUser,
            refreshUser,
            signOut,
        }),
        [user, isAuthReady, setSessionUser, refreshUser, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    }
    return context;
}
