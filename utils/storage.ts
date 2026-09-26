/**
 * Stockage auth : tokens en SecureStore (Keychain / Keystore),
 * prefs / ids non sensibles en AsyncStorage.
 * Migration transparente depuis l’ancien stockage AsyncStorage-only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const EXPIRES_AT_KEY = 'expires_at';
const TOKEN_TYPE_KEY = 'token_type';
const USER_ID_KEY = 'user_id';
const USER_PROFILE_KEY = 'user_profile';

const canUseSecureStore = Platform.OS !== 'web';

async function secureGet(key: string): Promise<string | null> {
    if (!canUseSecureStore) {
        return AsyncStorage.getItem(key);
    }
    try {
        const secureValue = await SecureStore.getItemAsync(key);
        if (secureValue != null && secureValue !== '') {
            return secureValue;
        }
        // Migration depuis AsyncStorage (sessions antérieures)
        const legacy = await AsyncStorage.getItem(key);
        if (legacy != null && legacy !== '') {
            await SecureStore.setItemAsync(key, legacy);
            await AsyncStorage.removeItem(key);
            return legacy;
        }
        return null;
    } catch (error) {
        console.error(`Erreur SecureStore get(${key}):`, error);
        return AsyncStorage.getItem(key);
    }
}

async function secureSet(key: string, value: string): Promise<void> {
    if (!canUseSecureStore) {
        await AsyncStorage.setItem(key, value);
        return;
    }
    try {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error(`Erreur SecureStore set(${key}):`, error);
        await AsyncStorage.setItem(key, value);
    }
}

async function secureDelete(key: string): Promise<void> {
    try {
        if (canUseSecureStore) {
            await SecureStore.deleteItemAsync(key);
        }
    } catch {
        // ignore
    }
    try {
        await AsyncStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/**
 * Récupère le token d'authentification
 */
export const getAuthToken = async (): Promise<string | null> => {
    try {
        return await secureGet(TOKEN_KEY);
    } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
        return null;
    }
};

/**
 * Récupère le refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return await secureGet(REFRESH_TOKEN_KEY);
    } catch (error) {
        console.error('Erreur lors de la récupération du refresh token:', error);
        return null;
    }
};

/**
 * Récupère l'epoch d'expiration (secondes) du access token
 */
export const getTokenExpiresAt = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(EXPIRES_AT_KEY);
    } catch (error) {
        console.error('Erreur lors de la récupération de expires_at:', error);
        return null;
    }
};

/**
 * Récupère l'ID de l'utilisateur depuis AsyncStorage
 */
export const getUserId = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(USER_ID_KEY);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'ID de l'utilisateur:", error);
        return null;
    }
};

/**
 * Stocke le token d'authentification
 */
export const setAuthToken = async (token: string): Promise<void> => {
    try {
        await secureSet(TOKEN_KEY, token);
    } catch (error) {
        console.error('Erreur lors du stockage du token:', error);
    }
};

export type AuthSessionPayload = {
    accessToken: string;
    refreshToken?: string | null;
    /** Durée de vie en secondes (expires_in OAuth) */
    expiresIn?: number | string | null;
    tokenType?: string | null;
    userId: string;
};

/**
 * Persiste une session complète après login / refresh.
 * `expires_at` = now + expires_in (epoch secondes).
 */
export const saveAuthSession = async (session: AuthSessionPayload): Promise<void> => {
    const { accessToken, refreshToken, expiresIn, tokenType, userId } = session;

    await secureSet(TOKEN_KEY, accessToken);

    if (refreshToken && String(refreshToken).trim() !== '') {
        await secureSet(REFRESH_TOKEN_KEY, String(refreshToken).trim());
    }

    if (expiresIn !== undefined && expiresIn !== null && String(expiresIn).trim() !== '') {
        const ttlSec = Number(expiresIn);
        if (!Number.isNaN(ttlSec) && ttlSec > 0) {
            // Si la valeur ressemble déjà à un epoch (> année ~2020), on la garde
            const looksLikeEpoch = ttlSec > 1_600_000_000;
            const expiresAt = looksLikeEpoch
                ? Math.floor(ttlSec)
                : Math.floor(Date.now() / 1000) + ttlSec;
            await AsyncStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
        }
    }

    if (tokenType && String(tokenType).trim() !== '') {
        await AsyncStorage.setItem(TOKEN_TYPE_KEY, String(tokenType).trim());
    }

    await AsyncStorage.setItem(USER_ID_KEY, userId);
};

/**
 * Supprime le token d'authentification
 */
export const removeAuthToken = async (): Promise<void> => {
    try {
        await secureDelete(TOKEN_KEY);
    } catch (error) {
        console.error('Erreur lors de la suppression du token:', error);
    }
};

/**
 * Déconnexion complète : SecureStore + AsyncStorage + pending paiement
 */
export const clearAuthData = async (): Promise<void> => {
    try {
        const { clearPendingPayment } = await import('@/utils/pendingPayment');
        await Promise.all([
            secureDelete(TOKEN_KEY),
            secureDelete(REFRESH_TOKEN_KEY),
            AsyncStorage.multiRemove([
                TOKEN_KEY,
                REFRESH_TOKEN_KEY,
                EXPIRES_AT_KEY,
                TOKEN_TYPE_KEY,
                USER_ID_KEY,
                USER_PROFILE_KEY,
                'userToken',
            ]),
            clearPendingPayment(),
        ]);
    } catch (error) {
        console.error("Erreur lors de la suppression des données d'authentification:", error);
    }
};
