/**
 * Réécrit UNIQUEMENT les deeplinks paiement.
 * Tout le reste (dev client, onboarding, tabs…) est laissé intact —
 * sinon écran blanc au démarrage (ex: allonappmobile://expo-development-client).
 */
import { rewritePaymentSystemPath } from '@/utils/paymentDeepLink';

export function redirectSystemPath({
    path,
}: {
    path: string;
    initial: boolean;
}): string {
    try {
        if (!path) return path;

        // Ne jamais toucher au client de développement Expo
        const lower = path.toLowerCase();
        if (
            lower.includes('expo-development-client') ||
            lower.includes('expo-dev-client') ||
            lower.includes('exps://') ||
            lower.startsWith('exp://')
        ) {
            return path;
        }

        const rewritten = rewritePaymentSystemPath(path);
        return rewritten ?? path;
    } catch {
        return path;
    }
}
