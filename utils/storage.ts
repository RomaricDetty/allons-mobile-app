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
 * Récupère le refresh token (SecureStore, avec repli AsyncStorage legacy)
 */
export const getRefreshToken = async (): Promise<string | null> => {
    try {
        const fromSecure = await secureGet(REFRESH_TOKEN_KEY);
        if (fromSecure && fromSecure.trim() !== '') {
            return fromSecure;
        }
        // Repli explicite (sessions antérieures / écriture partielle)
        const legacy = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (legacy && legacy.trim() !== '') {
            await secureSet(REFRESH_TOKEN_KEY, legacy.trim());
            return legacy.trim();
        }
        return null;
    } catch (error) {
        console.error('Erreur lors de la récupération du refresh token:', error);
        return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
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
 * `expires_at` plafonné à 30 min (idle backend), même si expires_in API est plus long.
 */
export const saveAuthSession = async (session: AuthSessionPayload): Promise<void> => {
    const { BACKEND_ACCESS_IDLE_SEC, bumpSessionActivity } = await import('@/utils/sessionActivity');
    const { accessToken, refreshToken, expiresIn, tokenType, userId } = session;
    const nowSec = Math.floor(Date.now() / 1000);
    const maxExpiresAt = nowSec + BACKEND_ACCESS_IDLE_SEC;

    await secureSet(TOKEN_KEY, accessToken);

    if (refreshToken && String(refreshToken).trim() !== '') {
        const value = String(refreshToken).trim();
        await secureSet(REFRESH_TOKEN_KEY, value);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, value);
    }

    let expiresAt = maxExpiresAt;
    if (expiresIn !== undefined && expiresIn !== null && String(expiresIn).trim() !== '') {
        const parsed = Number(expiresIn);
        if (!Number.isNaN(parsed) && parsed > 0) {
            if (parsed > 1_600_000_000) {
                expiresAt = Math.min(Math.floor(parsed), maxExpiresAt);
            } else {
                expiresAt = Math.min(nowSec + parsed, maxExpiresAt);
            }
        }
    }
    await AsyncStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));

    if (tokenType && String(tokenType).trim() !== '') {
        await AsyncStorage.setItem(TOKEN_TYPE_KEY, String(tokenType).trim());
    }

    await AsyncStorage.setItem(USER_ID_KEY, userId);
    await bumpSessionActivity();
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
        const { clearSessionActivity } = await import('@/utils/sessionActivity');
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
            clearSessionActivity(),
        ]);
    } catch (error) {
        console.error("Erreur lors de la suppression des données d'authentification:", error);
    }
};
