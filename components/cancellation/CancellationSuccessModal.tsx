import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, Alert, Clipboard, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppColors } from '@/hooks/use-app-colors';
import { router } from 'expo-router';
import { RefundOption } from '@/api/cancellation';

interface CancellationResult {
    refundableAmount: number;
    refundType: string;
    rebookingTokenCode?: string;
    successMessage: string;
}

interface CancellationSuccessModalProps {
    visible: boolean;
    result: CancellationResult | null;
    refundOption: RefundOption;
    currency: string;
    selectedPassengers: string[];
    ticketDetails: any;
    onClose: () => void;
}

/**
 * Modal de succès d'annulation avec détails du remboursement
 */
export const CancellationSuccessModal: React.FC<CancellationSuccessModalProps> = ({
    visible,
    result,
    refundOption,
    currency,
    selectedPassengers,
    ticketDetails,
    onClose,
}) => {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();

    /**
     * Copie le code de rebooking
     */
    const handleCopyCode = () => {
        if (result?.rebookingTokenCode) {
            Clipboard.setString(result.rebookingTokenCode);
            Alert.alert('Code copié', 'Le code a été copié dans le presse-papier');
        }
    };

    /**
     * Calcule la date d'expiration (30 jours)
     */
    const getExpirationDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    /**
     * Ferme le modal et met à jour les données
     */
    const handleCloseModal = () => {
        if (ticketDetails && selectedPassengers.length > 0) {
            const updatedPassengers = ticketDetails.passengers.map((passenger: any, idx: number) => {
                const passengerId = passenger.id || `passenger-${idx}`;
                return selectedPassengers.includes(passengerId)
                    ? { ...passenger, status: 'CANCELLED' }
                    : passenger;
            });

            const allCancelled = updatedPassengers.every((p: any) => 
                p.status?.toUpperCase() === 'CANCELLED' || p.status?.toUpperCase() === 'CANCELED'
            );

            const updatedTicketDetails = {
                ...ticketDetails,
                passengers: updatedPassengers,
                status: allCancelled ? 'CANCELLED' : ticketDetails.status,
            };

            router.replace({
                pathname: '/trip/ticket-details',
                params: {
                    ticketDetails: JSON.stringify(updatedTicketDetails),
                    refreshed: 'true',
                },
            });
        } else {
            router.back();
        }
    };

    if (!result) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseModal}
        >
            <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
                {/* Header */}
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + 12,
                            backgroundColor: colors.headerBackground,
                            borderBottomColor: colors.headerBorder,
                        },
                    ]}
                >
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Résultat de l'annulation
                    </Text>
                    <Pressable style={styles.closeButton} onPress={handleCloseModal}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.icon} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Message de succès */}
                    <View style={styles.successBox}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                        <View style={styles.successContent}>
                            <Text style={styles.successTitle}>Annulation confirmée</Text>
                            <Text style={styles.successText}>
                                Votre réservation a été annulée. Les détails du remboursement sont ci-dessous.
                            </Text>
                        </View>
                    </View>

                    {/* Code de rebooking */}
                    {refundOption === 'rebooking' && result.rebookingTokenCode && (
                        <>
                            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Détails du remboursement</Text>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.text }]}>Montant remboursable</Text>
                                    <Text style={[styles.detailValue, { color: colors.activeTabColor }]}>
                                        {parseFloat(result.refundableAmount.toString()).toLocaleString('fr-FR')} {currency}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.text }]}>Type de remboursement</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>Code de rebooking</Text>
                                </View>
                            </View>

                            <View style={styles.rebookingCard}>
                                <View style={styles.rebookingHeader}>
                                    <MaterialCommunityIcons name="ticket-confirmation" size={48} color="#1976BA" />
                                </View>
                                
                                <Text style={styles.rebookingLabel}>Votre code de rebooking</Text>
                                <Text style={styles.rebookingSubtitle}>
                                    Un SMS contenant ce code vous a été envoyé.
                                </Text>

                                <View style={styles.codeContainer}>
                                    <Text style={styles.codeTitle}>Code de rebooking</Text>
                                    <Text style={styles.code}>{result.rebookingTokenCode}</Text>
                                </View>

                                <View style={styles.codeDetails}>
                                    <View style={styles.codeDetailRow}>
                                        <Text style={styles.codeDetailLabel}>Montant crédité</Text>
                                        <Text style={styles.codeDetailValue}>
                                            {parseFloat(result.refundableAmount.toString()).toLocaleString('fr-FR')} {currency}
                                        </Text>
                                    </View>
                                    <View style={styles.codeDetailRow}>
                                        <Text style={styles.codeDetailLabel}>Date d'expiration</Text>
                                        <Text style={styles.codeDetailValue}>{getExpirationDate()}</Text>
                                    </View>
                                </View>

                                {/* Instructions */}
                                <View style={styles.instructions}>
                                    <Text style={styles.instructionsTitle}>Comment utiliser ce code ?</Text>
                                    <View style={styles.instructionItem}>
                                        <Text style={styles.instructionNumber}>1.</Text>
                                        <Text style={styles.instructionText}>Lors de votre prochaine recherche</Text>
                                    </View>
                                    <View style={styles.instructionItem}>
                                        <Text style={styles.instructionNumber}>2.</Text>
                                        <Text style={styles.instructionText}>Entrez ce code dans le champ "Code de rebooking"</Text>
                                    </View>
                                    <View style={styles.instructionItem}>
                                        <Text style={styles.instructionNumber}>3.</Text>
                                        <Text style={styles.instructionText}>Le montant sera automatiquement déduit</Text>
                                    </View>
                                </View>

                                {/* Boutons */}
                                <View style={styles.actions}>
                                    <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                                        <MaterialCommunityIcons name="content-copy" size={20} color="#1976BA" />
                                        <Text style={styles.copyButtonText}>Copier le code</Text>
                                    </Pressable>

                                    <Pressable
                                        style={styles.newBookingButton}
                                        onPress={() => {
                                            handleCloseModal();
                                            router.push('/(tabs)');
                                        }}
                                    >
                                        <Text style={styles.newBookingButtonText}>Nouvelle réservation</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Remboursement par méthode de paiement */}
                    {refundOption === 'payment' && (
                        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Détails du remboursement</Text>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.text }]}>Montant remboursable</Text>
                                <Text style={[styles.detailValue, { color: colors.activeTabColor }]}>
                                    {parseFloat(result.refundableAmount.toString()).toLocaleString('fr-FR')} {currency}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.text }]}>Type</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {result.refundType === 'FULL' ? 'Complet' : 'Partiel'}
                                </Text>
                            </View>
                            <View style={styles.infoBox}>
                                <MaterialCommunityIcons name="information" size={20} color="#1976BA" />
                                <Text style={styles.infoText}>
                                    Le remboursement sera traité dans les prochains jours. Vous serez contacté.
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
        position: 'relative',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Ubuntu_Bold' },
    closeButton: { position: 'absolute', right: 24, top: 'auto', padding: 8 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
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
    successContent: { flex: 1 },
    successTitle: { fontSize: 16, fontFamily: 'Ubuntu_Bold', color: '#2E7D32', marginBottom: 4 },
    successText: { fontSize: 14, fontFamily: 'Ubuntu_Regular', color: '#1B5E20' },
    section: { borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1 },
    sectionTitle: { fontSize: 16, fontFamily: 'Ubuntu_Bold', marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
    detailLabel: { fontSize: 14, fontFamily: 'Ubuntu_Regular' },
    detailValue: { fontSize: 14, fontFamily: 'Ubuntu_Bold' },
    rebookingCard: {
        backgroundColor: '#E3F2FD',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#1976BA',
    },
    rebookingHeader: { alignItems: 'center', marginBottom: 16 },
    rebookingLabel: { fontSize: 18, fontFamily: 'Ubuntu_Bold', color: '#1565C0', textAlign: 'center', marginBottom: 8 },
    rebookingSubtitle: { fontSize: 13, fontFamily: 'Ubuntu_Regular', color: '#424242', textAlign: 'center', marginBottom: 20 },
    codeContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
    codeTitle: { fontSize: 12, fontFamily: 'Ubuntu_Regular', color: '#757575', marginBottom: 8, textAlign: 'center' },
    code: { fontSize: 24, fontFamily: 'Ubuntu_Bold', color: '#1976BA', textAlign: 'center', letterSpacing: 2 },
    codeDetails: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
    codeDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    codeDetailLabel: { fontSize: 14, fontFamily: 'Ubuntu_Regular', color: '#424242' },
    codeDetailValue: { fontSize: 14, fontFamily: 'Ubuntu_Bold', color: '#212121' },
    instructions: { marginBottom: 20 },
    instructionsTitle: { fontSize: 15, fontFamily: 'Ubuntu_Bold', color: '#1565C0', marginBottom: 12 },
    instructionItem: { flexDirection: 'row', marginBottom: 8, gap: 8 },
    instructionNumber: { fontSize: 14, fontFamily: 'Ubuntu_Bold', color: '#424242' },
    instructionText: { fontSize: 14, fontFamily: 'Ubuntu_Regular', color: '#424242', flex: 1 },
    actions: { gap: 12 },
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
    copyButtonText: { fontSize: 15, fontFamily: 'Ubuntu_Bold', color: '#1976BA' },
    newBookingButton: { backgroundColor: '#1976BA', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    newBookingButtonText: { fontSize: 15, fontFamily: 'Ubuntu_Bold', color: '#FFFFFF' },
    infoBox: { flexDirection: 'row', padding: 12, borderRadius: 12, backgroundColor: '#E3F2FD', gap: 12, marginTop: 16 },
    infoText: { flex: 1, fontSize: 13, fontFamily: 'Ubuntu_Regular', color: '#1565C0', lineHeight: 20 },
});
