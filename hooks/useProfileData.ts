import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { useAuth } from '@/contexts/AuthContext';
import { Booking, User } from '@/interfaces';
import { showAlert } from '@/utils/alert';
import { ensureValidAccessToken } from '@/utils/authSession';
import { getUserId } from '@/utils/storage';
import { useCallback, useState } from 'react';

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

    const forceReauth = useCallback(
        async (message: string) => {
            await signOut();
            showAlert('Erreur', message);
        },
        [signOut],
    );

    /**
     * Récupère les informations de l'utilisateur
     */
    const getUserInfo = useCallback(async () => {
        try {
            const token = await ensureValidAccessToken();
            const userId = await getUserId();

            if (!token || token.trim() === '') {
                await forceReauth(
                    "Token d'authentification manquant. Veuillez vous reconnecter.",
                );
                return null;
            }

            if (!userId || userId.trim() === '' || userId === 'unknown') {
                await forceReauth(
                    "ID utilisateur manquant. Veuillez vous reconnecter.",
                );
                return null;
            }

            const response = await authGetUserInfo(userId, token);
            if (response.status === 200) {
                return response.data;
            }

            if (response.status === 401 || response.status === 403) {
                await forceReauth(
                    'Session expirée. Veuillez vous reconnecter.',
                );
                return null;
            }

            showAlert(
                'Erreur',
                "Une erreur est survenue lors de la récupération des informations de l'utilisateur",
            );
            return null;
        } catch (error: any) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                await forceReauth('Session expirée. Veuillez vous reconnecter.');
                return null;
            }
            showAlert(
                'Erreur',
                error?.response?.data?.message ||
                    "Une erreur est survenue lors de la récupération des informations de l'utilisateur",
            );
            return null;
        }
    }, [forceReauth]);

    /**
     * Récupère la liste des réservations de l'utilisateur
     */
    const getBookingList = useCallback(async () => {
        try {
            const token = await ensureValidAccessToken();
            const userId = await getUserId();

            if (!token || token.trim() === '') {
                await forceReauth(
                    "Token d'authentification manquant. Veuillez vous reconnecter.",
                );
                return;
            }

            if (!userId || userId.trim() === '' || userId === 'unknown') {
                await forceReauth(
                    "ID utilisateur manquant. Veuillez vous reconnecter.",
                );
                return;
            }

            const response = await bookingListInfo(userId, token);
            if (response.status === 200 && response.data?.items) {
                setBookingList(response.data.items);
                return;
            }

            if (response.status === 401 || response.status === 403) {
                await forceReauth('Session expirée. Veuillez vous reconnecter.');
                return;
            }

            showAlert(
                'Erreur',
                'Une erreur est survenue lors de la récupération de la liste des réservations',
            );
        } catch (error: any) {
            console.error('Erreur lors de la récupération de la liste des réservations:', error);
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                await forceReauth('Session expirée. Veuillez vous reconnecter.');
                return;
            }
            showAlert(
                'Erreur',
                error?.response?.data?.message ||
                    'Une erreur est survenue lors de la récupération de la liste des réservations',
            );
        }
    }, [forceReauth]);

    /**
     * Charge les données initiales
     */
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const userInfo = await getUserInfo();
            setUser(userInfo);
            if (userInfo) {
                await getBookingList();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        } finally {
            setIsLoading(false);
        }
    }, [getUserInfo, getBookingList]);

    /**
     * Gère le pull to refresh
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const userInfo = await getUserInfo();
            setUser(userInfo);
            if (userInfo) {
                await getBookingList();
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des données:', error);
        } finally {
            setRefreshing(false);
        }
    }, [getUserInfo, getBookingList]);

    return {
        user,
        bookingList,
        isLoading,
        refreshing,
        fetchData,
        handleRefresh,
    };
};
