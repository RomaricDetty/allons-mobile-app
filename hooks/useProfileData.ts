import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { useAuth } from '@/contexts/AuthContext';
import { Booking, User } from '@/interfaces';
import { showAlert } from '@/utils/alert';
import { wasLastRefreshFatal, withValidAccessToken } from '@/utils/authSession';
import { getRefreshToken, getUserId } from '@/utils/storage';
import { useCallback, useRef, useState } from 'react';

/** TTL cache profil / réservations (évite refetch full-screen à chaque focus) */
const PROFILE_CACHE_TTL_MS = 45_000;

/**
 * Hook personnalisé pour gérer les données du profil utilisateur
 * Gère le chargement des informations utilisateur et des réservations
 */
export const useProfileData = () => {
    const { signOut } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [bookingList, setBookingList] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const lastFetchAtRef = useRef(0);
    const hasDataRef = useRef(false);

    /**
     * Déconnexion uniquement si le refresh token est mort / absent.
     */
    const forceReauth = useCallback(
        async (message: string) => {
            await signOut();
            showAlert('Erreur', message);
        },
        [signOut],
    );

    /**
     * Après échec auth : déconnecte seulement si refresh invalide, sinon alerte soft.
     */
    const handleAuthFailure = useCallback(async () => {
        const refresh = await getRefreshToken();
        if (!refresh?.trim() || wasLastRefreshFatal()) {
            await forceReauth('Session expirée. Veuillez vous reconnecter.');
            return;
        }
        showAlert(
            'Connexion',
            'Impossible de rafraîchir la session pour le moment. Réessayez dans un instant.',
        );
    }, [forceReauth]);

    /**
     * Récupère les informations de l'utilisateur (refresh token + retry 401 inclus)
     */
    const getUserInfo = useCallback(async () => {
        try {
            const userId = await getUserId();

            if (!userId || userId.trim() === '' || userId === 'unknown') {
                const refresh = await getRefreshToken();
                if (!refresh?.trim()) {
                    await forceReauth(
                        'ID utilisateur manquant. Veuillez vous reconnecter.',
                    );
                }
                return null;
            }

            const data = await withValidAccessToken(async (token) => {
                const response = await authGetUserInfo(userId, token);
                if (response.status === 200) {
                    return response.data as User;
                }
                if (response.status === 401 || response.status === 403) {
                    const err: any = new Error('Unauthorized');
                    err.response = { status: response.status };
                    throw err;
                }
                throw new Error('USER_INFO_ERROR');
            });

            if (data) {
                return data;
            }

            await handleAuthFailure();
            return null;
        } catch (error: any) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            if (error?.message === 'USER_INFO_ERROR') {
                showAlert(
                    'Erreur',
                    "Une erreur est survenue lors de la récupération des informations de l'utilisateur",
                );
                return null;
            }
            showAlert(
                'Erreur',
                error?.response?.data?.message ||
                    "Une erreur est survenue lors de la récupération des informations de l'utilisateur",
            );
            return null;
        }
    }, [forceReauth, handleAuthFailure]);

    /**
     * Récupère la liste des réservations de l'utilisateur
     */
    const getBookingList = useCallback(async () => {
        try {
            const userId = await getUserId();

            if (!userId || userId.trim() === '' || userId === 'unknown') {
                return;
            }

            const ok = await withValidAccessToken(async (token) => {
                const response = await bookingListInfo(userId, token);
                if (response.status === 200 && response.data?.items) {
                    setBookingList(response.data.items);
                    return true;
                }
                if (response.status === 401 || response.status === 403) {
                    const err: any = new Error('Unauthorized');
                    err.response = { status: response.status };
                    throw err;
                }
                throw new Error('BOOKING_LIST_ERROR');
            });

            if (ok) {
                return;
            }

            await handleAuthFailure();
        } catch (error: any) {
            console.error('Erreur lors de la récupération de la liste des réservations:', error);
            if (error?.message === 'BOOKING_LIST_ERROR') {
                showAlert(
                    'Erreur',
                    'Une erreur est survenue lors de la récupération de la liste des réservations',
                );
                return;
            }
            showAlert(
                'Erreur',
                error?.response?.data?.message ||
                    'Une erreur est survenue lors de la récupération de la liste des réservations',
            );
        }
    }, [handleAuthFailure]);

    /**
     * Charge les données (skeleton uniquement au 1er chargement ou force).
     * @param options.force ignore le TTL cache
     * @param options.silent ne montre pas le loader plein écran
     */
    const fetchData = useCallback(
        async (options?: { force?: boolean; silent?: boolean }) => {
            const force = options?.force === true;
            const silent = options?.silent === true || hasDataRef.current;
            const now = Date.now();

            if (
                !force &&
                hasDataRef.current &&
                now - lastFetchAtRef.current < PROFILE_CACHE_TTL_MS
            ) {
                return;
            }

            if (!silent) setIsLoading(true);
            try {
                const userInfo = await getUserInfo();
                setUser(userInfo);
                if (userInfo) {
                    await getBookingList();
                    hasDataRef.current = true;
                    lastFetchAtRef.current = Date.now();
                }
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [getUserInfo, getBookingList],
    );

    /**
     * Gère le pull to refresh (force toujours)
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const userInfo = await getUserInfo();
            setUser(userInfo);
            if (userInfo) {
                await getBookingList();
                hasDataRef.current = true;
                lastFetchAtRef.current = Date.now();
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des données:', error);
        } finally {
            setRefreshing(false);
        }
    }, [getUserInfo, getBookingList]);

    /**
     * Invalide le cache (après édition profil, nouvelle réservation, etc.)
     */
    const invalidateCache = useCallback(() => {
        lastFetchAtRef.current = 0;
    }, []);

    return {
        user,
        bookingList,
        isLoading,
        refreshing,
        fetchData,
        handleRefresh,
        invalidateCache,
    };
};
