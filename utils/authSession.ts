/**
 * Session auth : refresh access token via refresh_token avant d’abandonner.
 */
import { refreshTokenApi } from '@/api/auth_register';
import {
    getAuthToken,
    getRefreshToken,
    getTokenExpiresAt,
    getUserId,
    saveAuthSession,
} from '@/utils/storage';

const EPOCH_THRESHOLD_SEC = 1_600_000_000; // ~2020

function parseExpiresAtSec(raw: string | null): number | null {
    if (!raw || raw.trim() === '') return null;
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) {
        const asDate = Date.parse(raw);
        if (Number.isNaN(asDate)) return null;
        return Math.floor(asDate / 1000);
    }
    // Ancien bug : expires_in (TTL) stocké tel quel → epoch 1970 → forcer un refresh
    return Math.floor(n);
}

function isAccessExpired(expiresAtSec: number | null, skewSec = 30): boolean {
    if (expiresAtSec == null) return false;
    // Valeurs < 2020 = TTL mal stocké ou epoch invalide → considéré expiré
    if (expiresAtSec < EPOCH_THRESHOLD_SEC) return true;
    return expiresAtSec <= Math.floor(Date.now() / 1000) + skewSec;
}

/**
 * Retourne un access token utilisable.
 * Rafraîchit via refresh_token si absent / expiré.
 * Retourne null si la session est irrécupérable (caller → signOut).
 */
export async function ensureValidAccessToken(): Promise<string | null> {
    const [token, expiresAtRaw, refreshToken] = await Promise.all([
        getAuthToken(),
        getTokenExpiresAt(),
        getRefreshToken(),
    ]);

    const expiresAtSec = parseExpiresAtSec(expiresAtRaw);
    const accessOk = Boolean(token?.trim()) && !isAccessExpired(expiresAtSec);

    if (accessOk) {
        return token!.trim();
    }

    const refresh = refreshToken?.trim();
    if (!refresh) {
        // Pas d'expiry connue + token présent : on tente quand même
        if (token?.trim() && expiresAtSec == null) {
            return token.trim();
        }
        return null;
    }

    try {
        const response = await refreshTokenApi(refresh);
        if (!response || response.status !== 200 || !response.data) {
            return null;
        }

        const accessToken = String(response.data.access_token || '').trim();
        if (!accessToken) {
            return null;
        }

        const existingUserId = await getUserId();
        const userId = String(
            existingUserId ||
                response.data.user?.id ||
                response.data.userId ||
                '',
        ).trim();

        await saveAuthSession({
            accessToken,
            refreshToken: response.data.refresh_token || refresh,
            expiresIn: response.data.expires_in,
            tokenType: response.data.token_type,
            userId: userId || existingUserId || 'unknown',
        });

        return accessToken;
    } catch (error) {
        console.error('ensureValidAccessToken: refresh échoué', error);
        return null;
    }
}
