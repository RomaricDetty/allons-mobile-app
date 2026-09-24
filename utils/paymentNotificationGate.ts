/**
 * Accès éphémère à l'écran détail notification paiement.
 * Autorisé uniquement juste avant une navigation déclenchée par un tap push.
 * Non persisté (mémoire process uniquement).
 */

let allowPaymentNotificationScreenOnce = false;

export const grantPaymentNotificationScreenAccess = (): void => {
    allowPaymentNotificationScreenOnce = true;
};

export const consumePaymentNotificationScreenAccess = (): boolean => {
    if (!allowPaymentNotificationScreenOnce) return false;
    allowPaymentNotificationScreenOnce = false;
    return true;
};
