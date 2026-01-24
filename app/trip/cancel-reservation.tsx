// @ts-nocheck
import { baseUrl } from '@/api/config';
import { useAppColors } from '@/hooks/use-app-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Annule une réservation complète (tous les passagers)
 * @param bookingId - ID de la réservation
 * @param reason - Raison de l'annulation
 * @param refundOption - Option de remboursement ('rebooking' | 'payment')
 * @returns Promise avec la réponse de l'API
 */
const cancelFullBooking = async (
    bookingId: string,
    reason: string,
    refundOption: 'rebooking' | 'payment'
) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const url = `${baseUrl}/customers/bookings/${bookingId}/cancel`;
        const payload = {
            reason,
            refundOption: refundOption === 'rebooking' ? 'REBOOKING_TOKEN' : 'MONEY_REFUND',
        };

        console.log('=== Annulation complète - Début ===');
        console.log('URL:', url);
        console.log('Payload:', payload);
        console.log('Token présent:', !!token);
        
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        
        console.log('=== Annulation complète - Succès ===');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('=== Annulation complète - Erreur ===');
        console.error('Type d\'erreur:', error?.constructor?.name);
        
        if (axios.isAxiosError(error)) {
            console.error('Axios Error Details:');
            console.error('- Message:', error.message);
            console.error('- Code:', error.code);
            console.error('- Response:', error.response?.data);
            console.error('- Status:', error.response?.status);
            console.error('- URL:', error.config?.url);
            
            if (error.response) {
                const statusCode = error.response.status;
                const apiMessage = error.response.data?.message;
                
                // Messages d'erreur personnalisés selon le code de statut
                switch (statusCode) {
                    case 400:
                        throw new Error(apiMessage || 'Réservation déjà annulée ou données invalides');
                    case 404:
                        throw new Error(apiMessage || 'Réservation non trouvée');
                    case 401:
                        throw new Error('Session expirée. Veuillez vous reconnecter');
                    case 403:
                        throw new Error('Vous n\'avez pas les droits pour annuler cette réservation');
                    case 500:
                        throw new Error('Erreur serveur. Veuillez réessayer plus tard');
                    default:
                        throw new Error(apiMessage || `Erreur lors de l'annulation (Code: ${statusCode})`);
                }
            } else if (error.request) {
                console.error('- Request made but no response received');
                throw new Error('Pas de réponse du serveur. Vérifiez votre connexion internet');
            } else {
                console.error('- Error setting up request');
                throw new Error('Erreur lors de la configuration de la requête');
            }
        } else {
            console.error('Non-Axios Error:', error);
            throw new Error(error instanceof Error ? error.message : 'Une erreur inattendue est survenue');
        }
    }
};

/**
 * Annule partiellement une réservation (certains passagers seulement)
 * @param passengerIds - Tableau des IDs des passagers à annuler
 * @param reason - Raison de l'annulation
 * @param refundOption - Option de remboursement ('rebooking' | 'payment')
 * @returns Promise avec la réponse de l'API
 */
const cancelPartialBooking = async (
    passengerIds: string[],
    reason: string,
    refundOption: 'rebooking' | 'payment'
) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const url = `${baseUrl}/customers/bookings/items/cancel`;
        const payload = {
            bookingItemIds: passengerIds,
            reason,
            refundOption: refundOption === 'rebooking' ? 'REBOOKING_TOKEN' : 'MONEY_REFUND',
        };

        console.log('=== Annulation partielle - Début ===');
        console.log('URL:', url);
        console.log('Payload:', payload);
        console.log('Token présent:', !!token);
        
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('=== Annulation partielle - Succès ===');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('=== Annulation partielle - Erreur ===');
        console.error('Type d\'erreur:', error?.constructor?.name);
        
        if (axios.isAxiosError(error)) {
            console.error('Axios Error Details:');
            console.error('- Message:', error.message);
            console.error('- Code:', error.code);
            console.error('- Response:', error.response?.data);
            console.error('- Status:', error.response?.status);
            console.error('- URL:', error.config?.url);
            
            if (error.response) {
                const statusCode = error.response.status;
                const apiMessage = error.response.data?.message;
                
                // Messages d'erreur personnalisés selon le code de statut
                switch (statusCode) {
                    case 400:
                        throw new Error(apiMessage || 'Réservation déjà annulée, éléments déjà annulés ou données invalides');
                    case 404:
                        throw new Error(apiMessage || 'Éléments de réservation non trouvés');
                    case 401:
                        throw new Error('Session expirée. Veuillez vous reconnecter');
                    case 403:
                        throw new Error('Vous n\'avez pas les droits pour annuler ces éléments');
                    case 500:
                        throw new Error('Erreur serveur. Veuillez réessayer plus tard');
                    default:
                        throw new Error(apiMessage || `Erreur lors de l'annulation (Code: ${statusCode})`);
                }
            } else if (error.request) {
                console.error('- Request made but no response received');
                throw new Error('Pas de réponse du serveur. Vérifiez votre connexion internet');
            } else {
                console.error('- Error setting up request');
                throw new Error('Erreur lors de la configuration de la requête');
            }
        } else {
            console.error('Non-Axios Error:', error);
            throw new Error(error instanceof Error ? error.message : 'Une erreur inattendue est survenue');
        }
    }
};

/**
 * Écran d'annulation de réservation
 * Permet à l'utilisateur d'annuler sa réservation avec choix de remboursement
 */
export default function CancelReservationScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const params = useLocalSearchParams();

    // Récupération des paramètres
    const ticketDetails = useMemo(() => {
        if (!params.ticketDetails) return null;
        
        try {
            return JSON.parse(params.ticketDetails as string);
        } catch (error) {
            console.error('Erreur lors du parsing des ticketDetails:', error);
            console.error('Valeur reçue:', params.ticketDetails);
            return null;
        }
    }, [params.ticketDetails]);

    const [cancellationReason, setCancellationReason] = useState('');
    const [refundOption, setRefundOption] = useState<'rebooking' | 'payment'>('rebooking');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Ne sélectionner initialement que les passagers non annulés
    const [selectedPassengers, setSelectedPassengers] = useState<string[]>(
        ticketDetails?.passengers
            ?.filter((p: any) => !p.status || (p.status.toUpperCase() !== 'CANCELLED' && p.status.toUpperCase() !== 'CANCELED'))
            ?.map((p: any, idx: number) => p.id || `passenger-${idx}`) || []
    );
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [cancellationResult, setCancellationResult] = useState<any>(null);

    console.log('ticketDetails id :  ', ticketDetails?.id);

    /**
     * Vérifie si un passager est déjà annulé
     */
    const isPassengerCancelled = (passenger: any): boolean => {
        return passenger.status && (passenger.status.toUpperCase() === 'CANCELLED' || passenger.status.toUpperCase() === 'CANCELED');
    };

    /**
     * Compte le nombre de passagers actifs (non annulés)
     */
    const getActivePassengersCount = (): number => {
        if (!ticketDetails?.passengers) return 0;
        return ticketDetails.passengers.filter((p: any) => !isPassengerCancelled(p)).length;
    };

    /**
     * Gère la sélection/désélection d'un passager
     */
    const togglePassengerSelection = (passengerId: string) => {
        // Vérifier si le passager est déjà annulé
        const passenger = ticketDetails?.passengers?.find((p: any, idx: number) => 
            (p.id || `passenger-${idx}`) === passengerId
        );
        
        if (passenger && isPassengerCancelled(passenger)) {
            Alert.alert('Passager déjà annulé', 'Ce passager a déjà été annulé et ne peut pas être sélectionné.');
            return;
        }

        setSelectedPassengers(prev => {
            if (prev.includes(passengerId)) {
                // Empêcher de tout déselectionner
                if (prev.length === 1) {
                    Alert.alert('Attention', 'Vous devez sélectionner au moins un passager à annuler');
                    return prev;
                }
                return prev.filter(id => id !== passengerId);
            } else {
                return [...prev, passengerId];
            }
        });
    };

    /**
     * Sélectionne tous les passagers actifs (non annulés)
     */
    const selectAllPassengers = () => {
        setSelectedPassengers(
            ticketDetails?.passengers
                ?.filter((p: any) => !isPassengerCancelled(p))
                ?.map((p: any, idx: number) => p.id || `passenger-${idx}`) || []
        );
    };

    /**
     * Calcul du montant remboursable basé sur les passagers sélectionnés
     */
    const getRefundableAmount = () => {
        if (!ticketDetails?.passengers) return 0;

        const selectedPassengersData = ticketDetails.passengers.filter((p: any, idx: number) => {
            const passengerId = p.id || `passenger-${idx}`;
            return selectedPassengers.includes(passengerId);
        });

        const totalRefund = selectedPassengersData.reduce((sum: number, passenger: any) => {
            return sum + parseFloat(passenger.price || 0);
        }, 0);

        return totalRefund;
    };

    /**
     * Gère la soumission de l'annulation
     */
    const handleConfirmCancellation = async () => {
        // Validation
        if (!cancellationReason.trim()) {
            Alert.alert('Attention !', 'Veuillez indiquer la raison de l\'annulation');
            return;
        }

        if (selectedPassengers.length === 0) {
            Alert.alert('Attention !', 'Veuillez sélectionner au moins un passager à annuler');
            return;
        }

        const activePassengersCount = getActivePassengersCount();
        const isPartialCancellation = selectedPassengers.length < activePassengersCount;
        const confirmMessage = isPartialCancellation
            ? `Vous êtes sur le point d'annuler ${selectedPassengers.length} passager(s) sur ${activePassengersCount} passager(s) actif(s). Confirmer l'annulation ?`
            : activePassengersCount === ticketDetails?.passengers?.length
                ? 'Vous êtes sur le point d\'annuler toute la réservation. Confirmer l\'annulation ?'
                : `Vous êtes sur le point d'annuler les ${selectedPassengers.length} passager(s) restant(s). Confirmer l'annulation ?`;

        Alert.alert(
            'Confirmation',
            confirmMessage,
            [
                { text: 'Non', style: 'cancel' },
                {
                    text: 'Oui, annuler',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsSubmitting(true);

                            // Appel API selon le type d'annulation (totale ou partielle)
                            let response;
                            if (isPartialCancellation) {
                                response = await cancelPartialBooking(
                                    selectedPassengers,
                                    cancellationReason,
                                    refundOption
                                );
                            } else {
                                response = await cancelFullBooking(
                                    ticketDetails?.id,
                                    cancellationReason,
                                    refundOption
                                );
                            }

                            // Extraction des données de la réponse API
                            const {
                                refundableAmount,
                                refundType,
                                rebookingTokenCode
                            } = response;

                            const successMessage = isPartialCancellation
                                ? `${selectedPassengers.length} passager(s) annulé(s) avec succès.`
                                : 'Réservation annulée avec succès.';

                            // Stocker le résultat et afficher le modal
                            setCancellationResult({
                                refundableAmount,
                                refundType,
                                rebookingTokenCode,
                                successMessage,
                                isPartialCancellation,
                            });
                            setShowSuccessModal(true);
                        } catch (error) {
                            console.error('Erreur lors de l\'annulation:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'annulation';
                            Alert.alert('Erreur', errorMessage);
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    /**
     * Ferme l'écran
     */
    const handleClose = () => {
        router.back();
    };

    /**
     * Copie le code de rebooking dans le presse-papier
     */
    const handleCopyCode = () => {
        if (cancellationResult?.rebookingTokenCode) {
            Clipboard.setString(cancellationResult.rebookingTokenCode);
            Alert.alert('Code copié', 'Le code de rebooking a été copié dans le presse-papier');
        }
    };

    /**
     * Ferme le modal et retourne à l'écran précédent avec les données mises à jour
     */
    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        
        // Mettre à jour les statuts des passagers annulés
        if (ticketDetails && selectedPassengers.length > 0) {
            const updatedPassengers = ticketDetails.passengers.map((passenger: any, idx: number) => {
                const passengerId = passenger.id || `passenger-${idx}`;
                
                // Si ce passager était dans la liste des passagers annulés
                if (selectedPassengers.includes(passengerId)) {
                    return {
                        ...passenger,
                        status: 'CANCELLED'
                    };
                }
                
                return passenger;
            });

            // Vérifier si tous les passagers sont maintenant annulés
            const allCancelled = updatedPassengers.every((p: any) => 
                p.status && (p.status.toUpperCase() === 'CANCELLED' || p.status.toUpperCase() === 'CANCELED')
            );

            // Créer un nouvel objet ticketDetails avec les passagers et potentiellement le statut mis à jour
            const updatedTicketDetails = {
                ...ticketDetails,
                passengers: updatedPassengers,
                // Si tous les passagers sont annulés, mettre à jour le statut de la réservation
                status: allCancelled ? 'CANCELLED' : ticketDetails.status
            };

            // Remplacer l'écran actuel par ticket-details avec les données mises à jour
            // On utilise replace pour éviter de créer une pile de navigation
            router.replace({
                pathname: '/trip/ticket-details',
                params: {
                    ticketDetails: JSON.stringify(updatedTicketDetails),
                    refreshed: 'true' // Indicateur de mise à jour
                }
            });
        } else {
            router.back();
        }
    };

    /**
     * Calcule la date d'expiration du code (30 jours à partir d'aujourd'hui)
     */
    const getExpirationDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: colors.headerBackground,
                        borderBottomColor: colors.headerBorder,
                    },
                ]}
            >
                <Pressable style={styles.closeButton} onPress={handleClose}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.icon} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Annuler la réservation</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Avertissement */}
                <View style={[styles.warningBox, { backgroundColor: '#FFF9E6' }]}>
                    <MaterialCommunityIcons name="alert" size={24} color="#F57C00" />
                    <View style={styles.warningContent}>
                        <Text style={[styles.warningTitle, { color: '#F57C00' }]}>
                            Cette action est irréversible
                        </Text>
                        <Text style={[styles.warningText, { color: '#795548' }]}>
                            {selectedPassengers.length === ticketDetails?.passengers?.length
                                ? 'Votre réservation sera définitivement annulée.'
                                : `${selectedPassengers.length} passager(s) sera/seront annulé(s) définitivement.`}
                        </Text>
                    </View>
                </View>

                {/* Sélection des passagers */}
                <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Passagers à annuler
                        </Text>
                        {selectedPassengers.length < getActivePassengersCount() && (
                            <Pressable onPress={selectAllPassengers}>
                                <Text style={[styles.selectAllText, { color: colors.activeTabColor }]}>
                                    Tout sélectionner
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    <Text style={[styles.helperText, { color: colors.secondaryText, marginBottom: 12 }]}>
                        Sélectionnez les passagers pour lesquels vous souhaitez annuler la réservation
                    </Text>

                    {ticketDetails?.passengers?.map((passenger: any, index: number) => {
                        const passengerId = passenger.id || `passenger-${index}`;
                        const isSelected = selectedPassengers.includes(passengerId);
                        const isCancelled = isPassengerCancelled(passenger);

                        return (
                            <Pressable
                                key={passengerId}
                                style={[
                                    styles.passengerCard,
                                    {
                                        backgroundColor: isCancelled 
                                            ? colors.border 
                                            : isSelected 
                                                ? 'rgba(23, 118, 186, 0.1)' 
                                                : colors.inputBackground,
                                        borderColor: isCancelled 
                                            ? colors.border 
                                            : isSelected 
                                                ? colors.activeTabColor 
                                                : colors.border,
                                        opacity: isCancelled ? 0.5 : 1,
                                    },
                                ]}
                                onPress={() => togglePassengerSelection(passengerId)}
                                disabled={isCancelled}
                            >
                                <MaterialCommunityIcons
                                    name={isCancelled ? 'close-circle' : isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                    size={24}
                                    color={isCancelled ? '#F44336' : isSelected ? colors.activeTabColor : colors.secondaryText}
                                />
                                <View style={styles.passengerInfo}>
                                    <View style={styles.passengerHeader}>
                                        <Text style={[styles.passengerName, { color: isCancelled ? colors.secondaryText : colors.text }]}>
                                            {passenger.firstName} {passenger.lastName}
                                        </Text>
                                        {isCancelled && (
                                            <View style={[styles.mainPassengerBadge, { backgroundColor: '#F44336' }]}>
                                                <Text style={styles.mainPassengerText}>Annulé</Text>
                                            </View>
                                        )}
                                        {!isCancelled && passenger.isMainPassenger && (
                                            <View style={[styles.mainPassengerBadge, { backgroundColor: colors.activeTabColor }]}>
                                                <Text style={styles.mainPassengerText}>Principal</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.passengerDetails, { color: colors.secondaryText }]}>
                                        Siège {passenger.seatNumber} • {parseFloat(passenger.price).toLocaleString('fr-FR')} {ticketDetails?.currency}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}

                    <View style={[styles.selectedCountBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Text style={[styles.selectedCountText, { color: colors.text }]}>
                            <Text style={{ fontFamily: 'Ubuntu_Bold' }}>{selectedPassengers.length}</Text> passager(s) sélectionné(s) sur {getActivePassengersCount()} actif(s)
                        </Text>
                        {getActivePassengersCount() < ticketDetails?.passengers?.length && (
                            <Text style={[styles.helperText, { color: colors.secondaryText, marginTop: 4 }]}>
                                {ticketDetails?.passengers?.length - getActivePassengersCount()} passager(s) déjà annulé(s)
                            </Text>
                        )}
                    </View>
                </View>

                {/* Informations de remboursement */}
                <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations de remboursement</Text>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Montant de la réservation</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {parseFloat(ticketDetails?.totalAmount || 0).toLocaleString('fr-FR')} {ticketDetails?.currency || 'FCFA'}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Montant remboursable</Text>
                        <Text style={[styles.infoValueHighlight, { color: colors.activeTabColor }]}>
                            {parseFloat(getRefundableAmount()).toLocaleString('fr-FR')} {ticketDetails?.currency || 'FCFA'}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Type de remboursement</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {selectedPassengers.length === ticketDetails?.passengers?.length
                                ? 'Remboursement complet'
                                : 'Remboursement partiel'}
                        </Text>
                    </View>
                </View>

                {/* Raison de l'annulation */}
                <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Raison de l'annulation
                    </Text>
                    <TextInput
                        style={[
                            styles.textArea,
                            {
                                backgroundColor: colors.inputBackground,
                                borderColor: colors.border,
                                color: colors.text,
                            },
                        ]}
                        placeholder="Veuillez indiquer la raison de l'annulation..."
                        placeholderTextColor={colors.placeholder}
                        value={cancellationReason}
                        onChangeText={setCancellationReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <Text style={[styles.helperText, { color: colors.secondaryText }]}>Ce champ est obligatoire</Text>
                </View>

                {/* Options de remboursement */}
                <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Mode de remboursement
                    </Text>

                    {/* Code de rebooking */}
                    <Pressable
                        style={[
                            styles.optionCard,
                            {
                                backgroundColor: refundOption === 'rebooking' ? 'rgba(23, 118, 186, 0.1)' : colors.inputBackground,
                                borderColor: refundOption === 'rebooking' ? colors.activeTabColor : colors.border,
                            },
                        ]}
                        onPress={() => setRefundOption('rebooking')}
                    >
                        <View style={styles.optionHeader}>
                            <MaterialCommunityIcons
                                name={refundOption === 'rebooking' ? 'radiobox-marked' : 'radiobox-blank'}
                                size={24}
                                color={refundOption === 'rebooking' ? colors.activeTabColor : colors.secondaryText}
                            />
                            {/* <MaterialCommunityIcons name="ticket-confirmation" size={20} color={colors.activeTabColor} style={styles.optionIcon} /> */}
                            <Text style={[styles.optionTitle, { color: colors.text }]}>
                                Code de rebooking <Text style={[styles.recommended, { color: colors.activeTabColor }]}>(Recommandé)</Text>
                            </Text>
                        </View>
                        <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                            Vous recevrez un code par SMS que vous pourrez utiliser pour faire une nouvelle réservation. Le code est valable 30 jours et le montant sera crédité automatiquement.
                        </Text>
                    </Pressable>

                    {/* Remboursement par méthode de paiement */}
                    <Pressable
                        style={[
                            styles.optionCard,
                            {
                                backgroundColor: refundOption === 'payment' ? 'rgba(23, 118, 186, 0.1)' : colors.inputBackground,
                                borderColor: refundOption === 'payment' ? colors.activeTabColor : colors.border,
                            },
                        ]}
                        onPress={() => setRefundOption('payment')}
                    >
                        <View style={styles.optionHeader}>
                            <MaterialCommunityIcons
                                name={refundOption === 'payment' ? 'radiobox-marked' : 'radiobox-blank'}
                                size={24}
                                color={refundOption === 'payment' ? colors.activeTabColor : colors.secondaryText}
                            />
                            {/* <MaterialCommunityIcons name="credit-card" size={20} color={colors.secondaryText} style={styles.optionIcon} /> */}
                            <Text style={[styles.optionTitle, { color: colors.text }]}>
                                Remboursement par la méthode de paiement initial
                            </Text>
                        </View>
                        <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                            Le remboursement sera traité manuellement. Vous serez contacté pour le suivi du processus de remboursement. Le délai de traitement peut varier selon votre méthode de paiement.
                        </Text>
                    </Pressable>
                </View>

                {/* Boutons d'action */}
                <View style={styles.actionButtons}>
                    {/* <Pressable
                        style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                        onPress={handleClose}
                        disabled={isSubmitting}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                    </Pressable> */}

                    <Pressable
                        style={[styles.button, styles.confirmButton, { opacity: isSubmitting ? 0.7 : 1 }]}
                        onPress={handleConfirmCancellation}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.confirmButtonText}>Confirmer l'annulation</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>

            {/* Modal de résultat d'annulation */}
            <Modal
                visible={showSuccessModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseSuccessModal}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.scrollBackground }]}>
                    {/* Header du modal */}
                    <View
                        style={[
                            styles.modalHeader,
                            {
                                paddingTop: insets.top + 12,
                                backgroundColor: colors.headerBackground,
                                borderBottomColor: colors.headerBorder,
                            },
                        ]}
                    >
                        <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                            Résultat de l'annulation
                        </Text>
                        <Pressable style={styles.modalCloseButton} onPress={handleCloseSuccessModal}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.icon} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.modalScrollView}
                        contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + 20 }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Message de succès */}
                        <View style={styles.successBox}>
                            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                            <View style={styles.successContent}>
                                <Text style={styles.successTitle}>
                                    Annulation confirmée avec succès
                                </Text>
                                <Text style={styles.successText}>
                                    Votre réservation a été annulée. Les détails du remboursement sont ci-dessous.
                                </Text>
                            </View>
                        </View>

                        {/* Détails du remboursement */}
                        {refundOption === 'rebooking' && cancellationResult?.rebookingTokenCode && (
                            <>
                                <View style={[styles.modalSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                                        Détails du remboursement
                                    </Text>
                                    
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.text }]}>
                                            Montant remboursable
                                        </Text>
                                        <Text style={[styles.detailValue, { color: colors.activeTabColor }]}>
                                            {parseFloat(cancellationResult?.refundableAmount || 0).toLocaleString('fr-FR')} {ticketDetails?.currency || 'FCFA'}
                                        </Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.text }]}>
                                            Type de remboursement
                                        </Text>
                                        <Text style={[styles.detailValue, { color: colors.text }]}>
                                            Code de rebooking
                                        </Text>
                                    </View>
                                </View>

                                {/* Code de rebooking */}
                                <View style={styles.rebookingCard}>
                                    <View style={styles.rebookingHeader}>
                                        <MaterialCommunityIcons name="ticket-confirmation" size={48} color="#1976BA" />
                                    </View>
                                    
                                    <Text style={styles.rebookingLabel}>Votre code de rebooking</Text>
                                    <Text style={styles.rebookingSubtitle}>
                                        Un SMS contenant ce code vous a été envoyé. Vous pouvez également le copier ci-dessous.
                                    </Text>

                                    <View style={styles.codeContainer}>
                                        <Text style={styles.rebookingTitle}>Code de rebooking</Text>
                                        <Text style={styles.rebookingCode}>
                                            {cancellationResult?.rebookingTokenCode}
                                        </Text>
                                    </View>

                                    <View style={styles.rebookingDetails}>
                                        <View style={styles.rebookingDetailRow}>
                                            <Text style={styles.rebookingDetailLabel}>Montant crédité</Text>
                                            <Text style={styles.rebookingDetailValue}>
                                                {parseFloat(cancellationResult?.refundableAmount || 0).toLocaleString('fr-FR')} {ticketDetails?.currency || 'FCFA'}
                                            </Text>
                                        </View>
                                        <View style={styles.rebookingDetailRow}>
                                            <Text style={styles.rebookingDetailLabel}>Date d'expiration</Text>
                                            <Text style={styles.rebookingDetailValue}>{getExpirationDate()}</Text>
                                        </View>
                                    </View>

                                    {/* Instructions */}
                                    <View style={styles.instructionsBox}>
                                        <Text style={styles.instructionsTitle}>Comment utiliser ce code ?</Text>
                                        <View style={styles.instructionItem}>
                                            <Text style={styles.instructionNumber}>1.</Text>
                                            <Text style={styles.instructionText}>
                                                Lors de votre prochaine recherche de voyage
                                            </Text>
                                        </View>
                                        <View style={styles.instructionItem}>
                                            <Text style={styles.instructionNumber}>2.</Text>
                                            <Text style={styles.instructionText}>
                                                Entrez ce code dans le champ "Code de rebooking"
                                            </Text>
                                        </View>
                                        <View style={styles.instructionItem}>
                                            <Text style={styles.instructionNumber}>3.</Text>
                                            <Text style={styles.instructionText}>
                                                Le montant sera automatiquement déduit du prix total
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Boutons d'action */}
                                    <View style={styles.modalActionButtons}>
                                        <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                                            <MaterialCommunityIcons name="content-copy" size={20} color="#1976BA" />
                                            <Text style={styles.copyButtonText}>Copier le code</Text>
                                        </Pressable>

                                        <Pressable style={styles.newBookingButton} onPress={() => {
                                            setShowSuccessModal(false);
                                            // Naviguer vers l'accueil pour faire une nouvelle réservation
                                            router.push('/(tabs)');
                                        }}>
                                            <Text style={styles.newBookingButtonText}>Faire une nouvelle réservation</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Remboursement par méthode de paiement */}
                        {refundOption === 'payment' && cancellationResult?.refundableAmount && (
                            <View style={[styles.modalSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                                    Détails du remboursement
                                </Text>
                                
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.text }]}>
                                        Montant remboursable
                                    </Text>
                                    <Text style={[styles.detailValue, { color: colors.activeTabColor }]}>
                                        {parseFloat(cancellationResult?.refundableAmount || 0).toLocaleString('fr-FR')} {ticketDetails?.currency || 'FCFA'}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.text }]}>
                                        Type de remboursement
                                    </Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {cancellationResult?.refundType === 'FULL' ? 'Remboursement complet' : 'Remboursement partiel'}
                                    </Text>
                                </View>

                                <View style={[styles.infoBox, { backgroundColor: '#E3F2FD' }]}>
                                    <MaterialCommunityIcons name="information" size={20} color="#1976BA" />
                                    <Text style={[styles.infoText, { color: '#1565C0' }]}>
                                        Votre remboursement sera traité dans les prochains jours. Vous serez contacté pour le suivi du processus.
                                    </Text>
                                </View>
                            </View>
                        )}

                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    closeButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    warningBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
        gap: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    section: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    selectAllText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    required: {
        color: '#DC3545',
    },
    passengerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        marginBottom: 12,
        gap: 12,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
        padding: 5
    },
    passengerName: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    mainPassengerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
    },
    mainPassengerText: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    passengerDetails: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    selectedCountBox: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    selectedCountText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    infoValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    infoValueHighlight: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    textArea: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        minHeight: 120,
    },
    helperText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 8,
    },
    optionCard: {
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
        marginBottom: 12,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    optionIcon: {
        marginLeft: 4,
    },
    optionTitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
        flex: 1,
    },
    recommended: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    optionDescription: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
        marginLeft: 32,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    confirmButton: {
        backgroundColor: '#DC3545',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    // Styles du modal
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
        position: 'relative',
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    modalCloseButton: {
        position: 'absolute',
        right: 24,
        top: 'auto',
        padding: 8,
    },
    modalScrollView: {
        flex: 1,
    },
    modalScrollContent: {
        padding: 20,
    },
    successBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
        marginBottom: 20,
        gap: 12,
    },
    successContent: {
        flex: 1,
    },
    successTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    successText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#1B5E20',
    },
    modalSection: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    rebookingCard: {
        backgroundColor: '#E3F2FD',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#1976BA',
    },
    rebookingHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    rebookingLabel: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#1565C0',
        textAlign: 'center',
        marginBottom: 8,
    },
    rebookingSubtitle: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        color: '#424242',
        textAlign: 'center',
        marginBottom: 20,
    },
    codeContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    rebookingTitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#757575',
        marginBottom: 8,
        textAlign: 'center',
    },
    rebookingCode: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#1976BA',
        textAlign: 'center',
        letterSpacing: 2,
    },
    rebookingDetails: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    rebookingDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rebookingDetailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#424242',
    },
    rebookingDetailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#212121',
    },
    instructionsBox: {
        marginBottom: 20,
    },
    instructionsTitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        color: '#1565C0',
        marginBottom: 12,
    },
    instructionItem: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    instructionNumber: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#424242',
    },
    instructionText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#424242',
        flex: 1,
    },
    modalActionButtons: {
        gap: 12,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: '#1976BA',
    },
    copyButtonText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        color: '#1976BA',
    },
    newBookingButton: {
        backgroundColor: '#1976BA',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    newBookingButtonText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    infoBox: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginTop: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
    },
    closeButtonText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    headerSpacer: {
        width: 40,
    },
});
