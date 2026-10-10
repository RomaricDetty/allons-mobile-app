/**
 * Session auth alignée sur l’idle backend (30 min) :
 * - refresh proactif après ~25 min d’inactivité (même si expires_at local semble OK)
 * - 401 API → refresh forcé + 1 retry
 * - déconnexion seulement si refresh token invalidé (401/403), pas sur simple idle
 */
import { refreshTokenApi } from '@/api/auth_register';
import {
    bumpSessionActivity,
    shouldProactiveRefreshByIdle,
} from '@/utils/sessionActivity';
import {
    getAuthToken,
    getRefreshToken,
    getTokenExpiresAt,
    getUserId,
    saveAuthSession,
} from '@/utils/storage';

const EPOCH_THRESHOLD_SEC = 1_600_000_000; // ~2020
/** Marge avant expires_at local (secondes) */
const EXPIRY_SKEW_SEC = 2 * 60;

/** Promise partagée pour sérialiser les refresh concurrents */
let refreshInFlight: Promise<string | null> | null = null;

/** true uniquement si le dernier refresh a reçu 401/403 (token invalide) */
let lastRefreshFatal = false;

/**
 * Indique si le dernier échec de refresh doit déconnecter (refresh token mort).
 */
export function wasLastRefreshFatal(): boolean {
    return lastRefreshFatal;
}

/**
 * Extrait les tokens depuis une réponse login/refresh (snake ou camel, éventuellement nested).
 */
export function extractAuthTokens(payload: any): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | string | null | undefined;
    tokenType: string | null | undefined;
    userId: string;
} {
    const root = payload?.data && (payload.data.access_token || payload.data.accessToken)
        ? payload.data
        : payload;

    return {
        accessToken: String(root?.access_token || root?.accessToken || '').trim(),
        refreshToken: String(root?.refresh_token || root?.refreshToken || '').trim(),
        expiresIn: root?.expires_in ?? root?.expiresIn,
        tokenType: root?.token_type ?? root?.tokenType,
        userId: String(root?.user?.id || root?.userId || '').trim(),
    };
}

/**
 * Parse expires_at stocké (epoch sec, ms, ou date ISO).
 */
function parseExpiresAtSec(raw: string | null): number | null {
    if (!raw || raw.trim() === '') return null;
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) {
        const asDate = Date.parse(raw);
        if (Number.isNaN(asDate)) return null;
        return Math.floor(asDate / 1000);
    }
    if (n > 1e12) {
        return Math.floor(n / 1000);
    }
    return Math.floor(n);
}

/**
 * @returns true si l’access token est considéré expiré (ou expiry invalide)
 */
function isAccessExpired(expiresAtSec: number | null, skewSec = EXPIRY_SKEW_SEC): boolean {
    if (expiresAtSec == null) return true; // sans expiry connue → refresh (idle 30 min)
    if (expiresAtSec < EPOCH_THRESHOLD_SEC) return true;
    return expiresAtSec <= Math.floor(Date.now() / 1000) + skewSec;
}

/**
 * Appelle l’API refresh et persiste la nouvelle session.
 */
async function performRefresh(refresh: string): Promise<string | null> {
    lastRefreshFatal = false;
    try {
        const response = await refreshTokenApi(refresh);
        if (!response || response.status !== 200 || !response.data) {
            return null;
        }

        const parsed = extractAuthTokens(response.data);
        if (!parsed.accessToken) {
            console.error('ensureValidAccessToken: access_token absent dans la réponse refresh');
            return null;
        }

        const existingUserId = await getUserId();
        const userId = (parsed.userId || existingUserId || '').trim();

        await saveAuthSession({
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken || refresh,
            expiresIn: parsed.expiresIn,
            tokenType: parsed.tokenType,
            userId: userId || existingUserId || 'unknown',
        });

        return parsed.accessToken;
    } catch (error: any) {
        const status = error?.response?.status;
        console.error('ensureValidAccessToken: refresh échoué', status, error?.response?.data || error);
        if (status === 401 || status === 403) {
            lastRefreshFatal = true;
        }
        return null;
    }
}

/**
 * Retourne un access token utilisable.
 * Refresh si expiré localement, idle ≥ 25 min, ou force (401 API).
 * @param options.force ignore l’expiry locale et force un refresh
 */
export async function ensureValidAccessToken(options?: {
    force?: boolean;
}): Promise<string | null> {
    const force = options?.force === true;
    lastRefreshFatal = false;

    const [token, expiresAtRaw, refreshToken, idleRefresh] = await Promise.all([
        getAuthToken(),
        getTokenExpiresAt(),
        getRefreshToken(),
        shouldProactiveRefreshByIdle(),
    ]);

    const expiresAtSec = parseExpiresAtSec(expiresAtRaw);
    const accessOk = Boolean(token?.trim()) && !isAccessExpired(expiresAtSec);

    // Access encore « frais » localement ET pas d’idle backend proche → OK
    if (!force && accessOk && !idleRefresh) {
        await bumpSessionActivity();
        return token!.trim();
    }

    const refresh = refreshToken?.trim();
    if (!refresh) {
        // Pas de refresh : on tente l’access seulement s’il est encore valide localement
        if (!force && accessOk && token?.trim()) {
            return token.trim();
        }
        return null;
    }

    if (refreshInFlight) {
        const shared = await refreshInFlight;
        if (shared && (!force || shared !== token?.trim())) {
            return shared;
        }
        if (!force) {
            return shared || token?.trim() || null;
        }
    }

    refreshInFlight = (async () => {
        try {
            const [latestToken, latestExpiresRaw, latestRefreshRaw, stillIdle] = await Promise.all([
                getAuthToken(),
                getTokenExpiresAt(),
                getRefreshToken(),
                shouldProactiveRefreshByIdle(),
            ]);
            const latestExpires = parseExpiresAtSec(latestExpiresRaw);
            const latestOk =
                Boolean(latestToken?.trim()) && !isAccessExpired(latestExpires);

            if (!force && latestOk && !stillIdle) {
                await bumpSessionActivity();
                return latestToken!.trim();
            }

            const latestRefresh = latestRefreshRaw?.trim() || refresh;
            const refreshed = await performRefresh(latestRefresh);
            if (refreshed) {
                return refreshed;
            }

            // Échec non fatal (réseau) : on garde l’access actuel
            if (!lastRefreshFatal && latestToken?.trim()) {
                return latestToken.trim();
            }
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

/**
 * Exécute une requête avec access token ; en cas de 401/403, force un refresh puis retente une fois.
 */
export async function withValidAccessToken<T>(
    run: (token: string) => Promise<T>,
): Promise<T | null> {
    const token = await ensureValidAccessToken();
    if (!token) {
        return null;
    }

    try {
        const result = await run(token);
        await bumpSessionActivity();
        return result;
    } catch (error: any) {
        const status = error?.response?.status;
        if (status !== 401 && status !== 403) {
            throw error;
        }

        // 401 après idle backend : refresh forcé (pas une déconnexion)
        const fresh = await ensureValidAccessToken({ force: true });
        if (!fresh || fresh === token) {
            return null;
        }

        try {
            const result = await run(fresh);
            await bumpSessionActivity();
            return result;
        } catch (retryError: any) {
            const retryStatus = retryError?.response?.status;
            if (retryStatus === 401 || retryStatus === 403) {
                return null;
            }
            throw retryError;
        }
    }
}
