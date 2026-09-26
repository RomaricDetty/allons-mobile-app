/**
 * Validation des URLs de checkout PSP (anti-phishing).
 * Règles dures : HTTPS uniquement, pas de localhost / IP privée.
 * Allowlist connue : utilisée en mode strict optionnel ; hors allowlist
 * on accepte quand même le HTTPS public (redirect API backend).
 */

const ALLOWED_HOST_SUFFIXES = [
    'customer.allon-apps.com',
    'allon-apps.com',
    'wave.com',
    'orange.com',
    'orangemoney.com',
    'orange-money.com',
    'mtn.com',
    'mtn.ci',
    'momo.africa',
    'paypal.com',
    'stripe.com',
];

function hostMatchesAllowlist(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
}

function isPrivateOrLocalHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local')) return true;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
        const parts = h.split('.').map(Number);
        if (parts[0] === 10) return true;
        if (parts[0] === 127) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 0) return true;
    }
    return false;
}

/**
 * @returns true si l’URL peut être ouverte pour un checkout paiement
 */
export function isAllowedPaymentRedirectUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== 'https:') return false;
        if (!parsed.hostname) return false;
        if (isPrivateOrLocalHost(parsed.hostname)) return false;

        if (__DEV__ && !hostMatchesAllowlist(parsed.hostname)) {
            console.warn(
                '[payment] Host checkout hors allowlist connue (HTTPS public accepté):',
                parsed.hostname
            );
        }
        return true;
    } catch {
        return false;
    }
}
