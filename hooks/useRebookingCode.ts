import { RebookingCodeResponse, verifyRebookingCode as verifyRebookingCodeAPI } from '@/api/rebooking';
import { getAuthToken } from '@/utils/storage';
import { useCallback, useState } from 'react';
import { showAlert } from '@/utils/alert';

/**
 * Hook pour gérer le code de rebooking
 */
export const useRebookingCode = () => {
    const [rebookingCode, setRebookingCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null);
    const [discount, setDiscount] = useState(0);
    const [rebookingTokenData, setRebookingTokenData] = useState<RebookingCodeResponse | null>(null);

    /**
     * Vérifie le code de rebooking auprès de l'API
     */
    const verifyRebookingCode = useCallback(async () => {
        if (!rebookingCode.trim()) {
            return;
        }

        try {
            setIsVerifying(true);
            setIsCodeValid(null);

            // Récupérer le token d'authentification
            const token = await getAuthToken();

            // Appel API réel
            const response = await verifyRebookingCodeAPI(rebookingCode, token);
            console.log("Response vérification code rebooking ==>, ", response)
            
            if (response.status === 200 && response.data.status === 'ACTIVE') {
                // Utiliser remainingAmount car c'est le montant encore disponible
                const discountAmount = response.data.creditAmount || 0;
                
                if (discountAmount > 0) {
                    setDiscount(discountAmount);
                    setIsCodeValid(true);
                    setRebookingTokenData(response.data);
                } else {
                    setIsCodeValid(false);
                    setDiscount(0);
                    setRebookingTokenData(null);
                    showAlert(
                        'Crédit épuisé',
                        'Ce code de rebooking n\'a plus de crédit disponible.'
                    );
                }
            } else {
                setIsCodeValid(false);
                setDiscount(0);
                setRebookingTokenData(null);
                
                // Messages spécifiques selon le statut
                let errorMessage = 'Ce code de rebooking ne peut pas être utilisé.';
                
                if (response.data.status === 'EXPIRED') {
                    errorMessage = 'Ce code de rebooking a expiré.';
                } else if (response.data.status === 'USED') {
                    errorMessage = 'Ce code de rebooking a déjà été entièrement utilisé.';
                } else if (response.data.status === 'CANCELLED') {
                    errorMessage = 'Ce code de rebooking a été annulé.';
                }
                
                showAlert('Code invalide', errorMessage);
            }
        } catch (error: any) {
            console.error('Erreur vérification code rebooking:', error);
            setIsCodeValid(false);
            setDiscount(0);
            
            // Gestion des erreurs HTTP spécifiques
            if (error.response) {
                const status = error.response.status;
                
                if (status === 404) {
                    showAlert(
                        'Code introuvable',
                        'Ce code de rebooking n\'existe pas. Vérifiez que vous l\'avez correctement saisi.'
                    );
                } else if (status === 400) {
                    showAlert(
                        'Code invalide',
                        error.response.data?.message || 'Le format du code est invalide.'
                    );
                } else if (status === 401) {
                    showAlert(
                        'Authentification requise',
                        'Vous devez être connecté pour utiliser un code de rebooking.'
                    );
                } else {
                    showAlert(
                        'Erreur',
                        error.response.data?.message || 'Impossible de vérifier le code. Veuillez réessayer.'
                    );
                }
            } else {
                // Erreur réseau ou autre
                if (__DEV__) {
                    console.log('Mode démo activé pour le code de rebooking');
                    const isValid = rebookingCode.trim().length >= 6;
                    if (isValid) {
                        setDiscount(5000);
                        setIsCodeValid(true);
                        showAlert('Mode Démo', 'Code accepté (mode développement) - Crédit: 5000 FCFA');
                    } else {
                        showAlert('Erreur', 'Code invalide (minimum 6 caractères en mode démo)');
                    }
                } else {
                    showAlert(
                        'Erreur de connexion',
                        'Impossible de vérifier le code. Vérifiez votre connexion internet.'
                    );
                }
            }
        } finally {
            setIsVerifying(false);
        }
    }, [rebookingCode]);

    /**
     * Réinitialise le code de rebooking
     */
    const resetRebookingCode = useCallback(() => {
        setRebookingCode('');
        setIsCodeValid(null);
        setDiscount(0);
        setRebookingTokenData(null);
    }, []);

    return {
        rebookingCode,
        setRebookingCode,
        isVerifying,
        isCodeValid,
        discount,
        rebookingTokenData,
        verifyRebookingCode,
        resetRebookingCode
    };
};
