// @ts-nocheck
import { formatBookingDate } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatDateForFileName } from '@/utils/ticketPdfGenerator';
import { generateBusRentalReceiptHTML, getBusRentalReceiptReference } from '@/utils/busRentalReceiptPdfGenerator';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { BusRentalRequestItem } from './BusRentalRequestCard';

const TRIP_TYPE_LABELS: Record<string, string> = {
    ONE_WAY: 'Aller simple',
    ROUND_TRIP: 'Aller-retour',
};
const PASSENGER_TYPE_LABELS: Record<string, string> = {
    ADULTS: 'Adultes',
    CHILDREN: 'Enfants',
    MIXED: 'Mixte',
};
const BUS_TYPE_LABELS: Record<string, string> = {
    BUS: 'Bus standard',
    LUXURY_BUS: 'Bus de luxe',
    MINIBUS: 'Minibus',
    STANDARD: 'Bus standard',
};
const LUGGAGE_LABELS: Record<string, string> = {
    LOW: 'Faible',
    MEDIUM: 'Moyen',
    HIGH: 'Élevé',
    NONE: 'Aucun',
};
const ACCESSIBILITY_LABELS: Record<string, string> = {
    NONE: 'Aucune',
    ELDERLY_FRIENDLY: 'Adapté aux seniors',
    WHEELCHAIR: 'Fauteuil roulant',
};
const TRIP_PURPOSE_LABELS: Record<string, string> = {
    CORPORATE: 'Entreprise',
    SCHOOL: 'Scolaire',
    RELIGIOUS: 'Religieux',
    WEDDING: 'Mariage',
    TOUR: 'Tour / Excursion',
    OTHER: 'Autre',
};
const STATUS_BADGE_LABELS: Record<string, string> = {
    PENDING: 'En attente de réponse',
    ACCEPTED: 'Accepté (devis envoyé)',
    REFUSED: 'Refusé',
    CONFIRMED: 'Confirmé',
    CANCELLED: 'Annulé',
};
const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#F5E6C8', text: '#5C4A32' },
    ACCEPTED: { bg: '#CCE5FF', text: '#004085' },
    REFUSED: { bg: '#F8D7DA', text: '#721C24' },
    CANCELLED: { bg: '#F8D7DA', text: '#721C24' },
    CONFIRMED: { bg: '#D4EDDA', text: '#155724' },
};
const ADDITIONAL_SERVICE_LABELS: Record<string, string> = {
    CLIMATE_CONTROL: 'Climatisation',
    AIR_CONDITIONING: 'Climatisation',
    WIFI: 'WiFi',
    TOILET: 'Toilettes',
    BOARDING_SERVICE: "Service d'embarquement",
    ENTERTAINMENT: 'Divertissement',
    BRANDING: 'Marquage / Branding',
};

function getLabel(map: Record<string, string>, value: string | undefined): string {
    if (value == null || value === '') return '—';
    return map[value] ?? value;
}

interface DetailRowProps {
    label: string;
    value: string;
    valueColor?: string;
}
function DetailRow({ label, value, valueColor }: DetailRowProps) {
    const colors = useAppColors();
    const displayValue = value || '—';
    if (!label) {
        return (
            <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: valueColor ?? colors.text, flex: 1, textAlign: 'left' }]} numberOfLines={2}>
                    {displayValue}
                </Text>
            </View>
        );
    }
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: valueColor ?? colors.text }]} numberOfLines={2}>
                {displayValue}
            </Text>
        </View>
    );
}

interface BusRentalRequestDetailModalProps {
    visible: boolean;
    item: BusRentalRequestItem | null;
    onClose: () => void;
    onPayRequest?: (item: BusRentalRequestItem) => void;
}

/**
 * Modal affichant tous les détails d’une demande de location (tous statuts).
 */
export function BusRentalRequestDetailModal({
    visible,
    item,
    onClose,
    onPayRequest,
}: BusRentalRequestDetailModalProps) {
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const [isGeneratingReceipt, setIsGeneratingReceipt] = React.useState(false);
    const status = item?.status ?? 'PENDING';
    const statusBadge = STATUS_BADGE_LABELS[status] ?? status;
    const statusColors = STATUS_BADGE_COLORS[status] ?? { bg: '#F5E6C8', text: '#5C4A32' };
    const isPayable = status === 'ACCEPTED' && onPayRequest && item;
    const canDownloadReceipt = status === 'CONFIRMED' && item;

    const quoteAmount = item?.quotedAmount ?? item?.quoteAmount ?? item?.amount ?? item?.totalAmount;
    const quoteCompany = (item as any)?.quote?.companyName ?? (item as any)?.company?.name ?? (item as any)?.companyName;
    const additionalServices = (item as any)?.additionalServices;
    const createdAt = (item as any)?.createdAt;
    const updatedAt = (item as any)?.updatedAt;

    const formatDate = (d: string | undefined) => (d ? formatBookingDate(d) : '—');

    if (!item) return null;

    /**
     * Télécharge le reçu PDF d'une location de bus confirmée.
     */
    const handleDownloadReceipt = async () => {
        if (!item) return;

        setIsGeneratingReceipt(true);
        try {
            const html = generateBusRentalReceiptHTML(item);
            const dateFormatted = formatDateForFileName();
            const receiptReference = String(getBusRentalReceiptReference(item)).replace(/[^a-zA-Z0-9_-]/g, '-');
            const finalFileName = `BusRental-Receipt-${receiptReference}-${dateFormatted}.pdf`;

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 595,
                height: 842,
                fileName: finalFileName,
            });

            const finalFileUri = `${FileSystemLegacy.documentDirectory}${finalFileName}`;
            await FileSystemLegacy.copyAsync({
                from: uri,
                to: finalFileUri,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(finalFileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Télécharger le reçu',
                });
            } else {
                Alert.alert('Succès', `Le reçu a été sauvegardé dans vos documents.\n\nFichier: ${finalFileName}`);
            }
        } catch (error) {
            console.error('Erreur lors de la génération du reçu de location:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la génération du reçu. Veuillez réessayer.');
        } finally {
            setIsGeneratingReceipt(false);
        }
    };

    const clientName = ([item.firstName, item.lastName].filter(Boolean).join(' ') || (item as any)?.customerName) ?? '—';
    const phone = (item as any)?.phone?.number ?? (item as any)?.phone ?? (item as any)?.customerPhone ?? '—';
    const phoneFormatted = typeof phone === 'string' ? phone : (phone?.countryCode && phone?.digits ? `${phone.countryCode} ${phone.digits}` : '—');
    const email = (item as any)?.email ?? (item as any)?.customerEmail ?? '—';

    const serviceLabels = Array.isArray(additionalServices)
        ? additionalServices.map((s: string) => ADDITIONAL_SERVICE_LABELS[s] ?? s)
        : [];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 24 }]}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Détails de la demande</Text>
                        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.icon} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <View style={styles.statusRow}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut</Text>
                                <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                                    <Text style={[styles.badgeText, { color: statusColors.text }]}>{statusBadge}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations client</Text>
                            <DetailRow label="Nom" value={clientName} />
                            <DetailRow label="Téléphone" value={phoneFormatted} />
                            <DetailRow label="Email" value={email} />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trajet</Text>
                            <DetailRow label="Départ" value={item.departureCity?.name ?? (item as any)?.departureCityDetail ?? '—'} />
                            <DetailRow label="Arrivée" value={item.arrivalCity?.name ?? (item as any)?.arrivalCityDetail ?? '—'} />
                            <DetailRow label="Type" value={getLabel(TRIP_TYPE_LABELS, item.tripType)} />
                            <DetailRow label="Date de départ" value={formatDate(item.departureDate)} />
                            <DetailRow label="Durée estimée" value={(item as any)?.estimatedDuration ?? '—'} />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Passagers</Text>
                            <DetailRow label="Nombre" value={String(item.passengerCount ?? item.requiredCapacity ?? '—')} />
                            <DetailRow label="Type" value={getLabel(PASSENGER_TYPE_LABELS, (item as any)?.passengerType)} />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exigences bus</Text>
                            <DetailRow label="Type" value={getLabel(BUS_TYPE_LABELS, item.busType)} />
                            <DetailRow label="Capacité" value={item.requiredCapacity ? `${item.requiredCapacity} places` : '—'} />
                            <DetailRow label="Bagages" value={getLabel(LUGGAGE_LABELS, (item as any)?.luggageNeeds)} />
                            <DetailRow label="Accessibilité" value={getLabel(ACCESSIBILITY_LABELS, (item as any)?.accessibilityNeeds)} />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Objet du voyage</Text>
                            <DetailRow label="" value={getLabel(TRIP_PURPOSE_LABELS, (item as any)?.tripPurpose)} />
                        </View>

                        {serviceLabels.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Services supplémentaires</Text>
                                <View style={styles.tagsRow}>
                                    {serviceLabels.map((label) => (
                                        <View key={label} style={[styles.tag, { backgroundColor: colors.inputBackground ?? '#F3F3F7', borderColor: colors.border }]}>
                                            <Text style={[styles.tagText, { color: colors.text }]}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {((item as any)?.budgetMin != null || (item as any)?.budgetMax != null) && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget</Text>
                                <DetailRow
                                    label=""
                                    value={
                                        [(item as any)?.budgetMin, (item as any)?.budgetMax].filter(Boolean).length
                                            ? `${Number((item as any)?.budgetMin ?? 0).toLocaleString('fr-FR')} FCFA - ${Number((item as any)?.budgetMax ?? 0).toLocaleString('fr-FR')} FCFA`
                                            : '—'
                                    }
                                />
                            </View>
                        )}

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions spéciales</Text>
                            <DetailRow label="" value={(item as any)?.specialInstructions ?? 'RAS'} />
                        </View>

                        {(quoteAmount != null || quoteCompany) && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Devis</Text>
                                {quoteAmount != null && (
                                    <DetailRow
                                        label="Montant"
                                        value={`${Number(quoteAmount).toLocaleString('fr-FR')} XOF`}
                                        valueColor={colors.activeTabColor}
                                    />
                                )}
                                {quoteCompany && <DetailRow label="Compagnie" value={quoteCompany} />}
                            </View>
                        )}

                        {(createdAt || updatedAt) && (
                            <Text style={[styles.meta, { color: colors.secondaryText }]}>
                                {createdAt ? `Créée le ${formatDate(createdAt)}` : ''}
                                {createdAt && updatedAt ? ' · ' : ''}
                                {updatedAt ? `Mise à jour le ${formatDate(updatedAt)}` : ''}
                            </Text>
                        )}

                        {isPayable && (
                            <Pressable
                                style={[styles.payButton, { backgroundColor: colors.activeTabColor }]}
                                onPress={() => onPayRequest?.(item)}
                            >
                                <Text style={styles.payButtonText}>Payer</Text>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
                            </Pressable>
                        )}

                        {canDownloadReceipt && (
                            <Pressable
                                style={[styles.receiptButton, { borderColor: colors.activeTabColor }]}
                                onPress={handleDownloadReceipt}
                                disabled={isGeneratingReceipt}
                            >
                                {isGeneratingReceipt ? (
                                    <ActivityIndicator size="small" color={colors.activeTabColor} />
                                ) : (
                                    <MaterialCommunityIcons name="download" size={20} color={colors.activeTabColor} />
                                )}
                                <Text style={[styles.receiptButtonText, { color: colors.activeTabColor }]}>
                                    {isGeneratingReceipt ? 'Génération...' : 'Télécharger le reçu'}
                                </Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: 'Ubuntu_Bold' },
    closeBtn: { padding: 4 },
    scroll: { maxHeight: 500, paddingHorizontal: 16, paddingTop: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontFamily: 'Ubuntu_Bold', marginBottom: 10 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontFamily: 'Ubuntu_Medium' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    detailLabel: { fontSize: 14, fontFamily: 'Ubuntu_Regular', flex: 1 },
    detailValue: { fontSize: 14, fontFamily: 'Ubuntu_Medium', flex: 1, textAlign: 'right' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    tagText: { fontSize: 13, fontFamily: 'Ubuntu_Regular' },
    meta: { fontSize: 12, fontFamily: 'Ubuntu_Regular', marginTop: 8, marginBottom: 16 },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
        marginTop: 8,
        marginBottom: 24,
    },
    payButtonText: { fontSize: 16, fontFamily: 'Ubuntu_Bold', color: '#FFFFFF' },
    receiptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        marginTop: 8,
        marginBottom: 24,
    },
    receiptButtonText: { fontSize: 16, fontFamily: 'Ubuntu_Bold' },
});
