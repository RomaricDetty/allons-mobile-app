import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { Booking, User } from '@/interfaces';
import { getAuthToken } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Hook personnalisé pour gérer les données du profil utilisateur
 * Gère le chargement des informations utilisateur et des réservations
 */
export const useProfileData = () => {
    const [user, setUser] = useState<User | null>(null);
    const [bookingList, setBookingList] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    /**
     * Récupère les informations de l'utilisateur
     */
    const getUserInfo = useCallback(async () => {
        try {
            const token = await getAuthToken();
            const userId = await AsyncStorage.getItem('user_id');

            if (!token || token.trim() === '') {
                Alert.alert('Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
                return null;
            }

            if (!userId || userId.trim() === '') {
                Alert.alert('Erreur', 'ID utilisateur manquant. Veuillez vous reconnecter.');
                return null;
            }

            const response = await authGetUserInfo(userId, token);
            console.log('response authGetUserInfo ==> ', response.data);
            if (response.status === 200) {
                return response.data;
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
                return null;
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            Alert.alert('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
            return null;
        }
    }, []);

    /**
     * Récupère la liste des réservations de l'utilisateur
     */
    const getBookingList = useCallback(async () => {
        try {
            const token = await getAuthToken();
            const userId = await AsyncStorage.getItem('user_id');

            if (!token || token.trim() === '') {
                Alert.alert('Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
                return;
            }

            if (!userId || userId.trim() === '') {
                Alert.alert('Erreur', 'ID utilisateur manquant. Veuillez vous reconnecter.');
                return;
            }

            const response = await bookingListInfo(userId, token);
            if (response.status === 200 && response.data?.items) {
                setBookingList(response.data.items);
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération de la liste des réservations');
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération de la liste des réservations:', error);
            Alert.alert('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de la récupération de la liste des réservations');
        }
    }, []);

    /**
     * Charge les données initiales
     */
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const userInfo = await getUserInfo();
            setUser(userInfo);
            await getBookingList();
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
            await getBookingList();
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
