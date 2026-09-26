import { PENDING_PAYMENT_STORAGE_KEY } from '@/constants/payment';
import { PendingPaymentSession } from '@/interfaces/payment';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retire les PII sensibles des passagers avant persistance locale.
 * Conserve prénom / sièges pour le récap confirmation.
 */
function sanitizePassengers(passengers: unknown): unknown[] {
    if (!Array.isArray(passengers)) return [];
    return passengers.map((p) => {
        if (!p || typeof p !== 'object') return p;
        const row = { ...(p as Record<string, unknown>) };
        delete row.phone;
        delete row.phoneNumber;
        delete row.email;
        delete row.documentNumber;
        delete row.idNumber;
        delete row.passportNumber;
        delete row.nationalId;
        if (row.contactUrgent && typeof row.contactUrgent === 'object') {
            const cu = { ...(row.contactUrgent as Record<string, unknown>) };
            delete cu.phone;
            delete cu.phoneNumber;
            row.contactUrgent = cu;
        }
        return row;
    });
}

function isValidPendingShape(value: unknown): value is PendingPaymentSession {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return typeof v.bookingId === 'string' && v.bookingId.trim() !== '';
}

export const savePendingPayment = async (session: PendingPaymentSession): Promise<void> => {
    const payload: PendingPaymentSession = {
        ...session,
        passengers: sanitizePassengers(session.passengers) as PendingPaymentSession['passengers'],
        emergencyContact: session.emergencyContact
            ? (() => {
                  const ec = { ...(session.emergencyContact as Record<string, unknown>) };
                  // garde le nom, retire téléphone stocké en clair si présent
                  if ('phone' in ec) delete ec.phone;
                  if ('phoneNumber' in ec) delete ec.phoneNumber;
                  return ec;
              })()
            : session.emergencyContact,
        phase: session.phase || 'checkout',
        updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload));
};

export const getPendingPayment = async (): Promise<PendingPaymentSession | null> => {
    try {
        const raw = await AsyncStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!isValidPendingShape(parsed)) {
            await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
            return null;
        }
        return parsed;
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
    if (patch.passengers) {
        next.passengers = sanitizePassengers(patch.passengers) as PendingPaymentSession['passengers'];
    }
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
    if (session.phase === 'succeeded') return false;

    const graceMs = 2 * 60 * 60 * 1000;
    const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : NaN;
    if (!Number.isNaN(expiresAt)) {
        return Date.now() < expiresAt + graceMs;
    }

    const createdAt = Date.parse(session.createdAt);
    if (Number.isNaN(createdAt)) return true;
    return Date.now() - createdAt < 24 * 60 * 60 * 1000;
};
