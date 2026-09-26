/** URLs de retour après paiement mobile money (Universal Links / App Links). */
export const PAYMENT_SUCCESS_URL = 'https://customer.allon-apps.com/payment/success';
export const PAYMENT_ERROR_URL = 'https://customer.allon-apps.com/payment/error';

/** Préfixe HTTPS des URLs de retour (Universal Links / App Links). */
export const PAYMENT_RETURN_URL_PREFIX = 'https://customer.allon-apps.com/payment';

/** Schemes custom supportés (doc API + scheme Expo existant). */
export const PAYMENT_SUCCESS_SCHEMES = [
    'allon://payment/success',
    'allonappmobile://payment/success',
] as const;

export const PAYMENT_ERROR_SCHEMES = [
    'allon://payment/error',
    'allonappmobile://payment/error',
] as const;

/** Intervalle de polling du statut de paiement (ms). */
export const PAYMENT_POLL_INTERVAL_MS = 2500;

/** Durée max de polling si expiresAt absent (ms) — ~15 min. */
export const PAYMENT_POLL_MAX_MS = 15 * 60 * 1000;

export const PENDING_PAYMENT_STORAGE_KEY = 'pending_mobile_payment';
