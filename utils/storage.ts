/**
 * Utilitaires pour la gestion du stockage local
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Récupère le token d'authentification depuis AsyncStorage
 * @returns Le token ou null si non trouvé
 */
export const getAuthToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('token');
    } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
        return null;
    }
};

/**
 * Récupère l'ID de l'utilisateur depuis AsyncStorage
 * @returns L'ID de l'utilisateur ou null si non trouvé
 */
export const getUserId = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('user_id');
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'ID de l\'utilisateur:', error);
        return null;
    }
};

/**
 * Stocke le token d'authentification dans AsyncStorage
 * @param token - Le token à stocker
 */
export const setAuthToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('token', token);
    } catch (error) {
        console.error('Erreur lors du stockage du token:', error);
    }
};

/**
 * Supprime le token d'authentification depuis AsyncStorage
 */
export const removeAuthToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('token');
    } catch (error) {
        console.error('Erreur lors de la suppression du token:', error);
    }
};

/**
 * Supprime toutes les données d'authentification depuis AsyncStorage
 * Utilise cette fonction pour une déconnexion complète
 */
export const clearAuthData = async (): Promise<void> => {
    try {
        await AsyncStorage.multiRemove([
            'token',
            'refresh_token',
            'expires_at',
            'token_type',
            'user_id',
        ]);
    } catch (error) {
        console.error('Erreur lors de la suppression des données d\'authentification:', error);
    }
};

