// @ts-nocheck
import {
    CancellationReasonInput,
    CancellationSuccessModal,
    InfoSection,
    PassengerSelection,
    RefundOptionsSection,
    WarningBox,
} from '@/components/cancellation';
import { useAppColors } from '@/hooks/use-app-colors';
import { useCancellation } from '@/hooks/useCancellation';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


/**
 * Écran d'annulation de réservation optimisé
 * Utilise des composants réutilisables et un hook personnalisé pour la logique
 */
export default function CancelReservationScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const params = useLocalSearchParams();

    // Parse des paramètres
    const ticketDetails = useMemo(() => {
        if (!params.ticketDetails) return null;
        try {
            return JSON.parse(params.ticketDetails as string);
        } catch (error) {
            console.error('Erreur parsing ticketDetails:', error);
            return null;
        }
    }, [params.ticketDetails]);

    // Hook personnalisé pour la logique d'annulation
    const {
        cancellationReason,
        setCancellationReason,
        refundOption,
        setRefundOption,
        isSubmitting,
        selectedPassengers,
        showSuccessModal,
        setShowSuccessModal,
        cancellationResult,
        activePassengersCount,
        refundableAmount,
        isPassengerCancelled,
        togglePassengerSelection,
        selectAllPassengers,
        handleConfirmCancellation,
    } = useCancellation(ticketDetails);

    // Données pour InfoSection
    const refundInfoRows = [
        {
            label: 'Montant de la réservation',
            value: `${parseFloat(ticketDetails?.totalAmount || 0).toLocaleString('fr-FR')} ${ticketDetails?.currency || 'FCFA'}`,
        },
        {
            label: 'Montant remboursable',
            value: `${refundableAmount.toLocaleString('fr-FR')} ${ticketDetails?.currency || 'FCFA'}`,
            highlight: true,
        },
        {
            label: 'Type de remboursement',
            value: selectedPassengers.length === ticketDetails?.passengers?.length
                ? 'Remboursement complet'
                : 'Remboursement partiel',
        },
    ];

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
                <Pressable style={styles.closeButton} onPress={() => router.back()}>
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
                <WarningBox 
                    selectedCount={selectedPassengers.length} 
                    totalCount={ticketDetails?.passengers?.length || 0} 
                />

                <PassengerSelection
                    passengers={ticketDetails?.passengers || []}
                    selectedPassengers={selectedPassengers}
                    activePassengersCount={activePassengersCount}
                    currency={ticketDetails?.currency || 'FCFA'}
                    isPassengerCancelled={isPassengerCancelled}
                    onToggleSelection={togglePassengerSelection}
                    onSelectAll={selectAllPassengers}
                />

                <InfoSection title="Informations de remboursement" rows={refundInfoRows} />

                <CancellationReasonInput 
                    value={cancellationReason} 
                    onChangeText={setCancellationReason} 
                />

                <RefundOptionsSection 
                    refundOption={refundOption} 
                    onSelectOption={setRefundOption} 
                />

                <View style={styles.actionButtons}>
                    <Pressable
                        style={[styles.confirmButton, { opacity: isSubmitting ? 0.7 : 1 }]}
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

            <CancellationSuccessModal
                visible={showSuccessModal}
                result={cancellationResult}
                refundOption={refundOption}
                currency={ticketDetails?.currency || 'FCFA'}
                selectedPassengers={selectedPassengers}
                ticketDetails={ticketDetails}
                onClose={() => setShowSuccessModal(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: 'Ubuntu_Bold' },
    closeButton: { padding: 8 },
    headerSpacer: { width: 40 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    actionButtons: { marginTop: 12 },
    confirmButton: {
        backgroundColor: '#DC3545',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: { fontSize: 16, fontFamily: 'Ubuntu_Bold', color: '#FFFFFF' },
});
