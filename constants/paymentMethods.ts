/** Valeurs alignées sur l'enum backend PaymentProvider */
export const PAYMENT_PROVIDER = {
    ORANGE_MONEY: 'ORANGE_MONEY',
    MTN_MONEY: 'MTN_MONEY',
    MOOV_MONEY: 'MOOV_MONEY',
    WAVE: 'WAVE',
    CREDIT_CARD: 'CREDIT_CARD',
    VISA: 'VISA',
    MASTERCARD: 'MASTERCARD',
    AMERICAN_EXPRESS: 'AMERICAN_EXPRESS',
    ALLON_COIN: 'ALLON_COIN',
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

/**
 * Mappe les méthodes de paiement vers leurs libellés en français
 */
export const PAYMENT_METHODS: { [key: string]: string } = {
    'MOBILE_MONEY': 'Mobile Money',
    'CARD': 'Carte bancaire',
    'WAVE': 'Wave',
    'MTN': 'MTN Mobile Money',
    'MTN_MONEY': 'MTN Mobile Money',
    'ORANGE': 'Orange Money',
    'ORANGE_MONEY': 'Orange Money',
    'MOOV_MONEY': 'Moov Money',
    'FLOOZ': 'Moov Money',
    'MOOV': 'Moov Money',
    'CREDIT_CARD': 'Carte bancaire',
    'VISA': 'Visa',
    'MASTERCARD': 'Mastercard',
    'AMERICAN_EXPRESS': 'American Express',
    'ALLON_COIN': 'Allon Coin',
};

/**
 * Mappe l'identifiant UI (PaymentMethodBlock) vers method + provider API.
 */
export const mapUiPaymentMethod = (
    method: string | null
): { method: string; provider: PaymentProvider | null } => {
    switch (method) {
        case 'credit-card':
            return { method: 'CREDIT_CARD', provider: PAYMENT_PROVIDER.CREDIT_CARD };
        case 'visa':
            return { method: 'CREDIT_CARD', provider: PAYMENT_PROVIDER.VISA };
        case 'mastercard':
            return { method: 'CREDIT_CARD', provider: PAYMENT_PROVIDER.MASTERCARD };
        case 'american-express':
        case 'amex':
            return { method: 'CREDIT_CARD', provider: PAYMENT_PROVIDER.AMERICAN_EXPRESS };
        case 'wave':
            return { method: 'MOBILE_MONEY', provider: PAYMENT_PROVIDER.WAVE };
        case 'orange-money':
            return { method: 'MOBILE_MONEY', provider: PAYMENT_PROVIDER.ORANGE_MONEY };
        case 'mtn-money':
            return { method: 'MOBILE_MONEY', provider: PAYMENT_PROVIDER.MTN_MONEY };
        case 'moov-money':
        case 'flooz':
            return { method: 'MOBILE_MONEY', provider: PAYMENT_PROVIDER.MOOV_MONEY };
        case 'allon-coin':
            return { method: 'ALLON_COIN', provider: PAYMENT_PROVIDER.ALLON_COIN };
        default:
            return { method: 'MOBILE_MONEY', provider: null };
    }
};

/**
 * Formate la méthode de paiement pour l'affichage
 * @param method - La méthode de paiement
 * @returns Le libellé formaté
 */
export const formatPaymentMethod = (method: string): string => {
    if (!method || !String(method).trim()) return 'N/A';

    const key = String(method).trim().toUpperCase().replace(/\s+/g, '_');

    return PAYMENT_METHODS[key] || PAYMENT_METHODS[method] || method.split('_').join(' ');
};

/**
 * Libellé UI pour méthode / wallet (jamais N/A vide — tiret).
 */
export const formatPaymentMethodDisplay = (method?: string | null): string => {
    const label = formatPaymentMethod(String(method ?? '').trim());
    if (!label || /^n\/?a$/i.test(label)) return '—';
    return label;
};

