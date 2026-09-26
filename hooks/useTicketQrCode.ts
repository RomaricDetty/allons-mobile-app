import { getBookingQrCode } from '@/api/booking';
import { getAuthToken } from '@/utils/storage';
import { useCallback, useEffect, useState } from 'react';

type UseTicketQrCodeOptions = {
    /** Si false, ne pas appeler l’API (billet non exploitable). */
    enabled?: boolean;
};

/**
 * Hook personnalisé pour gérer le chargement du QR code d'un ticket
 */
export const useTicketQrCode = (
    ticketId: string | undefined,
    options?: UseTicketQrCodeOptions
) => {
    const enabled = options?.enabled !== false;
    const [qrCode, setQrCode] = useState<string>('');
    const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);

    const generateQRCodeBase64 = useCallback(async () => {
        if (!enabled || !ticketId) {
            setQrCode('');
            setIsLoadingQrCode(false);
            setError(enabled ? null : 'QR indisponible pour ce statut');
            return;
        }

        setIsLoadingQrCode(true);
        setError(null);

        try {
            const token = await getAuthToken();
            if (!token) {
                setQrCode('');
                setError("Token d'authentification manquant");
                return;
            }

            const response = await getBookingQrCode(ticketId, token);

            if (response && response.status === 200 && response.data) {
                const hash = response.data.hash || response.data;

                if (hash && typeof hash === 'string' && hash.trim() !== '') {
                    setQrCode(hash);
                    setError(null);
                } else {
                    setQrCode('');
                    setError('Hash QR Code vide ou invalide');
                }
            } else {
                setQrCode('');
                setError('Réponse API invalide');
            }
        } catch (error: any) {
            if (__DEV__) {
                console.error('Erreur lors de la récupération du QR Code:', error?.response?.status);
            }
            setQrCode('');
            setError('Erreur lors de la récupération du QR Code');
        } finally {
            setIsLoadingQrCode(false);
        }
    }, [ticketId, enabled]);

    useEffect(() => {
        generateQRCodeBase64();
    }, [generateQRCodeBase64]);

    return {
        qrCode,
        isLoadingQrCode,
        error,
        retry: generateQRCodeBase64,
    };
};
