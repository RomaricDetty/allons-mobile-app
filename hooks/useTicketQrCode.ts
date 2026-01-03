import { getBookingQrCode } from '@/api/booking';
import { getAuthToken } from '@/utils/storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook personnalisé pour gérer le chargement du QR code d'un ticket
 * @param ticketId - L'ID du ticket
 * @returns L'état du QR code et la fonction de rechargement
 */
export const useTicketQrCode = (ticketId: string | undefined) => {
    const [qrCode, setQrCode] = useState<string>('');
    const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Génère le QR code en récupérant le hash depuis l'API
     */
    const generateQRCodeBase64 = useCallback(async () => {
        if (!ticketId) {
            setQrCode('');
            setIsLoadingQrCode(false);
            return;
        }

        setIsLoadingQrCode(true);
        setError(null);
        
        try {
            const token = await getAuthToken();
            if (!token) {
                console.error('Token d\'authentification manquant');
                setQrCode('');
                setError('Token d\'authentification manquant');
                return;
            }

            const response = await getBookingQrCode(ticketId, token);
            
            // Vérifier que la réponse est valide
            if (response && response.status === 200 && response.data) {
                // Le hash peut être dans response.data.hash ou directement dans response.data
                const hash = response.data.hash || response.data;
                
                if (hash && typeof hash === 'string' && hash.trim() !== '') {
                    setQrCode(hash);
                    setError(null);
                } else {
                    console.error('Hash QR Code vide ou invalide');
                    setQrCode('');
                    setError('Hash QR Code vide ou invalide');
                }
            } else {
                console.error('Réponse API invalide:', response);
                setQrCode('');
                setError('Réponse API invalide');
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération du QR Code:', error);
            // Afficher un message d'erreur plus détaillé
            if (error?.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            setQrCode('');
            setError('Erreur lors de la récupération du QR Code');
        } finally {
            setIsLoadingQrCode(false);
        }
    }, [ticketId]);

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

