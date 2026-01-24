import { verifyRebookingCode as verifyRebookingCodeAPI, RebookingCodeResponse } from '@/api/rebooking';
import { getAuthToken } from '@/utils/storage';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

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
            
            if (response.status === 200 && response.data.status === 'ACTIVE') {
                // Utiliser remainingAmount car c'est le montant encore disponible
                const discountAmount = response.data.remainingAmount || 0;
                
                if (discountAmount > 0) {
                    setDiscount(discountAmount);
                    setIsCodeValid(true);
                    setRebookingTokenData(response.data);
                } else {
                    setIsCodeValid(false);
                    setDiscount(0);
                    setRebookingTokenData(null);
                    Alert.alert(
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
                
                Alert.alert('Code invalide', errorMessage);
            }
        } catch (error: any) {
            console.error('Erreur vérification code rebooking:', error);
            setIsCodeValid(false);
            setDiscount(0);
            
            // Gestion des erreurs HTTP spécifiques
            if (error.response) {
                const status = error.response.status;
                
                if (status === 404) {
                    Alert.alert(
                        'Code introuvable',
                        'Ce code de rebooking n\'existe pas. Vérifiez que vous l\'avez correctement saisi.'
                    );
                } else if (status === 400) {
                    Alert.alert(
                        'Code invalide',
                        error.response.data?.message || 'Le format du code est invalide.'
                    );
                } else if (status === 401) {
                    Alert.alert(
                        'Authentification requise',
                        'Vous devez être connecté pour utiliser un code de rebooking.'
                    );
                } else {
                    Alert.alert(
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
                        Alert.alert('Mode Démo', 'Code accepté (mode développement) - Crédit: 5000 FCFA');
                    } else {
                        Alert.alert('Erreur', 'Code invalide (minimum 6 caractères en mode démo)');
                    }
                } else {
                    Alert.alert(
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
