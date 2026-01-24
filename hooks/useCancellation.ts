import { cancelFullBooking, cancelPartialBooking, RefundOption } from '@/api/cancellation';
import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';

interface Passenger {
    id?: string;
    firstName: string;
    lastName: string;
    seatNumber: string;
    price: string;
    status?: string;
    isMainPassenger?: boolean;
}

interface TicketDetails {
    id: string;
    passengers: Passenger[];
    totalAmount: string;
    currency: string;
    status?: string;
}

interface CancellationResult {
    refundableAmount: number;
    refundType: string;
    rebookingTokenCode?: string;
    successMessage: string;
    isPartialCancellation: boolean;
}

/**
 * Hook personnalisé pour gérer la logique d'annulation de réservation
 */
export const useCancellation = (ticketDetails: TicketDetails | null) => {
    const [cancellationReason, setCancellationReason] = useState('');
    const [refundOption, setRefundOption] = useState<RefundOption>('rebooking');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [cancellationResult, setCancellationResult] = useState<CancellationResult | null>(null);

    /**
     * Vérifie si un passager est déjà annulé
     */
    const isPassengerCancelled = useCallback((passenger: Passenger): boolean => {
        const status = passenger.status?.toUpperCase();
        return status === 'CANCELLED' || status === 'CANCELED';
    }, []);

    /**
     * Initialise les passagers sélectionnés (uniquement ceux non annulés)
     */
    const initialSelectedPassengers = useMemo(() => {
        return ticketDetails?.passengers
            ?.filter((p) => !isPassengerCancelled(p))
            ?.map((p, idx) => p.id || `passenger-${idx}`) || [];
    }, [ticketDetails, isPassengerCancelled]);

    const [selectedPassengers, setSelectedPassengers] = useState<string[]>(initialSelectedPassengers);

    /**
     * Compte le nombre de passagers actifs (non annulés)
     */
    const activePassengersCount = useMemo(() => {
        if (!ticketDetails?.passengers) return 0;
        return ticketDetails.passengers.filter((p) => !isPassengerCancelled(p)).length;
    }, [ticketDetails, isPassengerCancelled]);

    /**
     * Calcul du montant remboursable basé sur les passagers sélectionnés
     */
    const refundableAmount = useMemo(() => {
        if (!ticketDetails?.passengers) return 0;

        const selectedPassengersData = ticketDetails.passengers.filter((p, idx) => {
            const passengerId = p.id || `passenger-${idx}`;
            return selectedPassengers.includes(passengerId);
        });

        return selectedPassengersData.reduce((sum, passenger) => {
            return sum + parseFloat(passenger.price || '0');
        }, 0);
    }, [ticketDetails, selectedPassengers]);

    /**
     * Gère la sélection/désélection d'un passager
     */
    const togglePassengerSelection = useCallback((passengerId: string) => {
        const passenger = ticketDetails?.passengers?.find((p, idx) => 
            (p.id || `passenger-${idx}`) === passengerId
        );
        
        if (passenger && isPassengerCancelled(passenger)) {
            Alert.alert('Passager déjà annulé', 'Ce passager ne peut pas être sélectionné.');
            return;
        }

        setSelectedPassengers((prev) => {
            if (prev.includes(passengerId)) {
                if (prev.length === 1) {
                    Alert.alert('Attention', 'Vous devez sélectionner au moins un passager');
                    return prev;
                }
                return prev.filter(id => id !== passengerId);
            }
            return [...prev, passengerId];
        });
    }, [ticketDetails, isPassengerCancelled]);

    /**
     * Sélectionne tous les passagers actifs
     */
    const selectAllPassengers = useCallback(() => {
        setSelectedPassengers(initialSelectedPassengers);
    }, [initialSelectedPassengers]);

    /**
     * Gère la soumission de l'annulation
     */
    const handleConfirmCancellation = useCallback(async () => {
        if (!cancellationReason.trim()) {
            Alert.alert('Attention !', 'Veuillez indiquer la raison de l\'annulation');
            return;
        }

        if (selectedPassengers.length === 0) {
            Alert.alert('Attention !', 'Veuillez sélectionner au moins un passager');
            return;
        }

        const isPartialCancellation = selectedPassengers.length < activePassengersCount;
        const confirmMessage = isPartialCancellation
            ? `Annuler ${selectedPassengers.length} passager(s) sur ${activePassengersCount} ?`
            : 'Annuler toute la réservation ?';

        Alert.alert('Confirmation', confirmMessage, [
            { text: 'Non', style: 'cancel' },
            {
                text: 'Oui, annuler',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setIsSubmitting(true);

                        const response = isPartialCancellation
                            ? await cancelPartialBooking(selectedPassengers, cancellationReason, refundOption)
                            : await cancelFullBooking(ticketDetails!.id, cancellationReason, refundOption);

                        const successMessage = isPartialCancellation
                            ? `${selectedPassengers.length} passager(s) annulé(s)`
                            : 'Réservation annulée';

                        setCancellationResult({
                            ...response,
                            successMessage,
                            isPartialCancellation,
                        });
                        setShowSuccessModal(true);
                    } catch (error) {
                        const errorMessage = error instanceof Error 
                            ? error.message 
                            : 'Une erreur est survenue';
                        Alert.alert('Erreur', errorMessage);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]);
    }, [cancellationReason, selectedPassengers, refundOption, activePassengersCount, ticketDetails]);

    return {
        // State
        cancellationReason,
        setCancellationReason,
        refundOption,
        setRefundOption,
        isSubmitting,
        selectedPassengers,
        showSuccessModal,
        setShowSuccessModal,
        cancellationResult,
        
        // Computed
        activePassengersCount,
        refundableAmount,
        isPassengerCancelled,
        
        // Actions
        togglePassengerSelection,
        selectAllPassengers,
        handleConfirmCancellation,
    };
};
