/**
 * Contexte d'authentification : session utilisateur partagée (accueil, profil, etc.).
 * Le nom s'affiche immédiatement au login et disparaît au logout.
 */
import { authGetUserInfo } from '@/api/auth_register';
import { User } from '@/interfaces';
import { ensureValidAccessToken, wasLastRefreshFatal } from '@/utils/authSession';
import { bumpSessionActivity } from '@/utils/sessionActivity';
import { clearAuthData, getRefreshToken, getUserId } from '@/utils/storage';
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
import { AppState, AppStateStatus } from 'react-native';

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
    /** Garantit un access token valide (refresh si besoin). null → session morte */
    ensureSession: () => Promise<string | null>;
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

    /**
     * Déconnecte uniquement si le refresh token est absent ou invalidé (401).
     * Une erreur réseau ne doit pas effacer la session.
     */
    const clearSessionIfDead = useCallback(async () => {
        const refresh = await getRefreshToken();
        if (!refresh?.trim() || wasLastRefreshFatal()) {
            setUser(null);
            await writeCachedUser(null);
            await clearAuthData();
            return true;
        }
        return false;
    }, []);

    const ensureSession = useCallback(async () => {
        const token = await ensureValidAccessToken();
        if (!token) {
            await clearSessionIfDead();
            return null;
        }
        return token;
    }, [clearSessionIfDead]);

    const refreshUser = useCallback(async () => {
        try {
            let token = await ensureValidAccessToken();
            const userId = await getUserId();

            if (!token?.trim() || !userId?.trim() || userId === 'unknown') {
                if (!token?.trim()) {
                    await clearSessionIfDead();
                } else if (!userId?.trim() || userId === 'unknown') {
                    // Token OK mais id manquant : on garde la session, pas de profil
                    setUser(null);
                }
                return;
            }

            // Affiche le cache immédiatement si on n'a pas encore de user en mémoire
            const cached = await readCachedUser();
            if (cached && cached.id === userId) {
                setUser((prev) => prev ?? cached);
            }

            /**
             * Charge le profil ; en 401, force un refresh token puis retente une fois.
             */
            const fetchProfile = async (accessToken: string) => {
                const response = await authGetUserInfo(userId, accessToken);
                if (response?.status === 200 && response.data) {
                    setUser(response.data);
                    await writeCachedUser(response.data);
                    await bumpSessionActivity();
                    return true;
                }
                if (response?.status === 401 || response?.status === 403) {
                    return false;
                }
                return true;
            };

            try {
                const ok = await fetchProfile(token);
                if (ok) return;

                token = await ensureValidAccessToken({ force: true });
                if (!token?.trim()) {
                    await clearSessionIfDead();
                    return;
                }
                const retried = await fetchProfile(token);
                if (!retried && wasLastRefreshFatal()) {
                    await clearSessionIfDead();
                }
            } catch (error: any) {
                const status = error?.response?.status;
                if (status === 401 || status === 403) {
                    token = await ensureValidAccessToken({ force: true });
                    if (!token?.trim()) {
                        await clearSessionIfDead();
                        return;
                    }
                    try {
                        const retried = await fetchProfile(token);
                        if (!retried && wasLastRefreshFatal()) {
                            await clearSessionIfDead();
                        }
                    } catch (retryError: any) {
                        const retryStatus = retryError?.response?.status;
                        if (retryStatus === 401 || retryStatus === 403) {
                            await clearSessionIfDead();
                        }
                    }
                    return;
                }
                throw error;
            }
        } catch (error: any) {
            console.error('Erreur refresh utilisateur:', error);
            // Erreur réseau : on conserve le user en cache déjà affiché
        }
    }, [clearSessionIfDead]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const token = await ensureValidAccessToken();
                if (cancelled) return;

                if (!token) {
                    await clearSessionIfDead();
                    const cached = await readCachedUser();
                    const refresh = await getRefreshToken();
                    if (cached && refresh?.trim()) {
                        setUser(cached);
                    }
                } else {
                    const cached = await readCachedUser();
                    if (cached) {
                        setUser(cached);
                    }
                    await refreshUser();
                }
            } finally {
                if (!cancelled) {
                    setIsAuthReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [refreshUser, clearSessionIfDead]);

    // Au retour au premier plan : refresh access si idle / expiry (30 min backend)
    useEffect(() => {
        const onAppState = (state: AppStateStatus) => {
            if (state !== 'active') return;
            void (async () => {
                // ensureValidAccessToken gère idle ≥ 25 min + expires_at
                const token = await ensureValidAccessToken();
                if (!token) {
                    await clearSessionIfDead();
                    return;
                }
                // Pas de refetch profil systématique : évite faux 401 en rafale
            })();
        };
        const sub = AppState.addEventListener('change', onAppState);
        return () => sub.remove();
    }, [clearSessionIfDead]);

    const value = useMemo<AuthContextType>(
        () => ({
            user,
            isAuthenticated: Boolean(user?.id),
            isAuthReady,
            setSessionUser,
            refreshUser,
            signOut,
            ensureSession,
        }),
        [user, isAuthReady, setSessionUser, refreshUser, signOut, ensureSession],
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
