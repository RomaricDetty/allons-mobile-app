import { authGetUserInfo } from '@/api/auth_register';
import { isValidEmail, isValidPhone } from '@/constants/functions';
import { getAuthToken, getUserId } from '@/utils/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Passenger {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    seatNumber: number | null;
    seatNumberReturn: number | null;
    passengerType: string;
    countryCode: string;
}

interface EmergencyContactData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    relationship: string;
    countryCode: string;
}

/**
 * Crée un passager vide avec code pays par défaut
 */
const createEmptyPassenger = (countryCode: string = '+225'): Passenger => ({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    seatNumber: null,
    seatNumberReturn: null,
    passengerType: 'adult',
    countryCode,
});

/**
 * Hook personnalisé pour gérer le formulaire des passagers
 */
export const usePassengersForm = (numberOfPersons: number, isRoundTrip: boolean, returnTrip?: any) => {
    const [passengers, setPassengers] = useState<Passenger[]>(() =>
        Array.from({ length: numberOfPersons }, () => createEmptyPassenger('+225'))
    );
    const [emergencyContact, setEmergencyContact] = useState<EmergencyContactData>({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        relationship: '',
        countryCode: '+225'
    });
    const [contactPhone, setContactPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [defaultCountryCode, setDefaultCountryCode] = useState('+225');
    const hasLoadedUserInfo = useRef(false);

    /**
     * Met à jour un champ d'un passager
     */
    const updatePassenger = useCallback((index: number, field: string, value: string | number) => {
        setPassengers(prev => {
            const updated = [...prev];
            if (updated[index]) {
                updated[index] = { ...updated[index], [field]: value };
            }
            return updated;
        });
    }, []);

    /**
     * Met à jour un champ du contact d'urgence
     */
    const updateEmergencyContact = useCallback((field: string, value: string) => {
        setEmergencyContact(prev => ({ ...prev, [field]: value }));
    }, []);

    /**
     * Valide le formulaire complet.
     * Si totalAmount === 0 (crédit rebooking couvre tout), la validation paiement est ignorée.
     */
    const validateForm = useCallback((
        selectedPaymentMethod: string | null,
        cardName: string,
        cardNumber: string,
        expirationDate: string,
        cardCvv: string,
        paymentNumber: string,
        totalAmount?: number
    ) => {
        const errors: string[] = [];
        const noPaymentRequired = totalAmount !== undefined && totalAmount === 0;

        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';

            if (!passenger.firstName?.trim()) errors.push(`Le prénom du passager${passengerNumber} est requis`);
            if (!passenger.lastName?.trim()) errors.push(`Le nom du passager${passengerNumber} est requis`);

            const phoneTrimmed = passenger.phone?.trim() || '';
            if (!phoneTrimmed) {
                errors.push(`Le téléphone du passager${passengerNumber} est requis`);
            } else if (!isValidPhone(phoneTrimmed)) {
                errors.push(`Format téléphone invalide pour passager${passengerNumber}`);
            }

            const emailTrimmed = passenger.email?.trim() || '';
            if (emailTrimmed && !isValidEmail(emailTrimmed)) {
                errors.push(`Format email invalide pour passager${passengerNumber}`);
            }

            if (!passenger.passengerType?.trim()) errors.push(`Type de passager${passengerNumber} requis`);
            if (!passenger.seatNumber) errors.push(`Siège aller requis pour passager${passengerNumber}`);
            if (isRoundTrip && returnTrip && !passenger.seatNumberReturn) {
                errors.push(`Siège retour requis pour passager${passengerNumber}`);
            }
        });

        if (!noPaymentRequired) {
            if (!selectedPaymentMethod) {
                errors.push('Méthode de paiement requise');
            }
        }

        if (!noPaymentRequired && selectedPaymentMethod === 'credit-card') {
            if (!cardName?.trim()) errors.push('Nom sur la carte requis');

            const cleanedCardNumber = cardNumber.replace(/\s/g, '');
            if (cleanedCardNumber.length !== 16 || !/^\d+$/.test(cleanedCardNumber)) {
                errors.push('Numéro de carte invalide (16 chiffres)');
            }

            if (!expirationDate?.trim() || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDate)) {
                errors.push('Date expiration invalide (MM/YY)');
            }

            if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
                errors.push('CVV invalide (3 chiffres)');
            }
        } else if (!noPaymentRequired && selectedPaymentMethod && selectedPaymentMethod !== 'credit-card') {
            if (!paymentNumber?.trim() || !isValidPhone(paymentNumber)) {
                errors.push('Numéro de paiement invalide');
            }
        }

        return errors.length > 0 ? errors : null;
    }, [passengers, isRoundTrip, returnTrip]);

    /**
     * Charge les informations de l'utilisateur
     */
    const loadUserInfo = useCallback(async () => {
        const token = await getAuthToken();
        const userId = await getUserId();

        if (token && userId && !hasLoadedUserInfo.current) {
            try {
                setIsLoading(true);
                hasLoadedUserInfo.current = true;

                const response = await authGetUserInfo(userId, token);

                if (response.status === 200) {
                    // Récupérer le countryCode de l'utilisateur ou utiliser +225 par défaut
                    const userCountryCode = response?.data?.phones?.[0]?.countryCode || '+225';
                    setDefaultCountryCode(userCountryCode);

                    setPassengers(prev => {
                        const updated = [...prev];
                        if (updated[0]) {
                            updated[0] = {
                                ...updated[0],
                                firstName: response?.data?.firstName || '',
                                lastName: response?.data?.lastName || '',
                                phone: response?.data?.phones[0].digits || '',
                                email: response?.data?.email || '',
                                passengerType: 'adult',
                                countryCode: userCountryCode,
                            };
                        }
                        return updated;
                    });

                    setContactPhone(response?.data?.phones[0].digits || '');
                    
                    const emergencyCountryCode = response?.data?.contactUrgent?.phone?.countryCode || userCountryCode;
                    setEmergencyContact({
                        firstName: response?.data?.contactUrgent?.firstName || '',
                        lastName: response?.data?.contactUrgent?.lastName || '',
                        phone: response?.data?.contactUrgent?.phone?.digits || '',
                        email: response?.data?.email || '',
                        relationship: response?.data?.contactUrgent?.relationship || 'Autre',
                        countryCode: emergencyCountryCode
                    });
                }
            } catch (error) {
                console.error('Erreur chargement user info:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadUserInfo();
    }, [loadUserInfo]);

    return {
        passengers,
        setPassengers,
        emergencyContact,
        contactPhone,
        isLoading,
        setIsLoading,
        defaultCountryCode,
        updatePassenger,
        updateEmergencyContact,
        validateForm
    };
};
