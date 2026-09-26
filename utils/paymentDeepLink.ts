/**
 * Parse une URL de retour paiement (https Universal Link ou scheme custom).
 * Couvre :
 * - https://customer.allon-apps.com/payment/success|error
 * - allon://payment/success|error
 * - allonappmobile://payment/success|error
 * - allonappmobile:///payment/success|error
 */
export type PaymentDeepLinkKind = 'success' | 'error' | 'unknown';

export type ParsedPaymentDeepLink = {
    kind: PaymentDeepLinkKind;
    bookingId?: string;
};

export const parsePaymentDeepLink = (url: string): ParsedPaymentDeepLink => {
    if (!url || typeof url !== 'string') {
        return { kind: 'unknown' };
    }

    const normalized = url.trim();
    let bookingId: string | undefined;

    try {
        const parsed = new URL(normalized);
        bookingId =
            parsed.searchParams.get('bookingId') ||
            parsed.searchParams.get('booking_id') ||
            undefined;
    } catch {
        // Schemes custom parfois mal parsés par URL()
    }

    const lower = normalized.toLowerCase();

    const isSuccess =
        lower.includes('/payment/success') ||
        lower.includes('payment/success') ||
        /:\/\/payment\/success(\?|#|$)/.test(lower) ||
        /:\/\/\/payment\/success(\?|#|$)/.test(lower);

    const isError =
        lower.includes('/payment/error') ||
        lower.includes('payment/error') ||
        /:\/\/payment\/error(\?|#|$)/.test(lower) ||
        /:\/\/\/payment\/error(\?|#|$)/.test(lower);

    if (isSuccess) return { kind: 'success', bookingId };
    if (isError) return { kind: 'error', bookingId };
    return { kind: 'unknown', bookingId };
};

/**
 * Réécrit un path système (cold start / Universal Link) vers une route Expo Router.
 * Uniquement des chemins paiement explicites — pas de match trop large ("success" / "error").
 */
export const rewritePaymentSystemPath = (path: string): string | null => {
    if (!path) return null;
    const lower = path.toLowerCase();

    // Ignorer le dev client et les URLs non-paiement
    if (
        lower.includes('expo-development-client') ||
        lower.includes('expo-dev-client')
    ) {
        return null;
    }

    const withoutQuery = lower.split('?')[0].split('#')[0];
    const cleaned = withoutQuery.replace(/^\/+/, '');

    if (
        cleaned === 'payment/success' ||
        cleaned.endsWith('/payment/success') ||
        cleaned.includes('payment/success')
    ) {
        return '/payment/success';
    }

    if (
        cleaned === 'payment/error' ||
        cleaned.endsWith('/payment/error') ||
        cleaned.includes('payment/error')
    ) {
        return '/payment/error';
    }

    return null;
};
