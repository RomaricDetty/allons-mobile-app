/**
 * Activité de session — le backend invalide l’access token après 30 min d’inactivité.
 * On rafraîchit avant cette limite ; on ne déconnecte pas sur simple idle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ACTIVITY_KEY = 'auth_last_activity_at';

/** Inactivité côté backend avant invalidation de l’access token */
export const BACKEND_ACCESS_IDLE_MS = 30 * 60 * 1000;

/** Marge : refresh proactif avant la coupure des 30 min */
export const PROACTIVE_REFRESH_IDLE_MS = 25 * 60 * 1000;

/** TTL access local plafonné (secondes) = idle backend */
export const BACKEND_ACCESS_IDLE_SEC = 30 * 60;

/**
 * Enregistre une activité utilisateur / API authentifiée.
 */
export async function bumpSessionActivity(): Promise<void> {
    try {
        await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
        // ignore
    }
}

/**
 * @returns timestamp ms de la dernière activité (now si inconnu)
 */
export async function getLastActivityAt(): Promise<number> {
    try {
        const raw = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
        const n = raw ? Number(raw) : NaN;
        if (!Number.isFinite(n) || n <= 0) {
            return Date.now();
        }
        return n;
    } catch {
        return Date.now();
    }
}

/**
 * @returns true si l’idle approche/dépasse le seuil de refresh proactif
 */
export async function shouldProactiveRefreshByIdle(): Promise<boolean> {
    const last = await getLastActivityAt();
    return Date.now() - last >= PROACTIVE_REFRESH_IDLE_MS;
}

/**
 * Efface le marqueur d’activité (logout).
 */
export async function clearSessionActivity(): Promise<void> {
    try {
        await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
        // ignore
    }
}
