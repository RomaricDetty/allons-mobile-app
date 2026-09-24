import { PENDING_PAYMENT_STORAGE_KEY } from '@/constants/payment';
import { PendingPaymentSession } from '@/interfaces/payment';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const savePendingPayment = async (session: PendingPaymentSession): Promise<void> => {
    const payload: PendingPaymentSession = {
        ...session,
        phase: session.phase || 'checkout',
        updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload));
};

export const getPendingPayment = async (): Promise<PendingPaymentSession | null> => {
    try {
        const raw = await AsyncStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as PendingPaymentSession;
    } catch (error) {
        console.error('Erreur lecture pending payment:', error);
        return null;
    }
};

export const updatePendingPayment = async (
    patch: Partial<PendingPaymentSession>
): Promise<PendingPaymentSession | null> => {
    const current = await getPendingPayment();
    if (!current) return null;
    const next: PendingPaymentSession = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(next));
    return next;
};

export const clearPendingPayment = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
    } catch (error) {
        console.error('Erreur suppression pending payment:', error);
    }
};

/**
 * Une session reste récupérable tant qu'elle n'est pas clairement expirée
 * (expiresAt + 2h de marge pour laisser le webhook arriver après débit).
 */
export const isPendingPaymentRecoverable = (session: PendingPaymentSession | null): boolean => {
    if (!session?.bookingId) return false;

    const graceMs = 2 * 60 * 60 * 1000;
    const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : NaN;
    if (!Number.isNaN(expiresAt)) {
        return Date.now() < expiresAt + graceMs;
    }

    const createdAt = Date.parse(session.createdAt);
    if (Number.isNaN(createdAt)) return true;
    return Date.now() - createdAt < 24 * 60 * 60 * 1000;
};
