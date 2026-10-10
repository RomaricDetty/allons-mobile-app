// @ts-nocheck
import { AppButton } from '@/components/ui/AppButton';
import { formatBookingDate } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { showAlert } from '@/utils/alert';
import {
    generateBusRentalReceiptHTML,
    getBusRentalReceiptReference,
} from '@/utils/busRentalReceiptPdfGenerator';
import { formatDateForFileName } from '@/utils/ticketPdfGenerator';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
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
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    REFUSED: 'Refusé',
    CONFIRMED: 'Confirmé',
    CANCELLED: 'Annulé',
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

/**
 * Libellé depuis une map API → affichage.
 */
function getLabel(map: Record<string, string>, value?: string): string {
    if (value == null || value === '') return '—';
    return map[value] ?? value;
}

/**
 * Date location : masque l’heure si 00:00.
 */
function formatRentalDate(dateString?: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    if (date.getHours() === 0 && date.getMinutes() === 0) {
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }
    return formatBookingDate(dateString);
}

/**
 * Motif de refus depuis les champs API possibles.
 */
function getRefusalReason(item: BusRentalRequestItem): string {
    const raw =
        (item as any)?.refusalReason ||
        (item as any)?.rejectReason ||
        (item as any)?.refusalMessage ||
        (item as any)?.rejectionReason ||
        (item as any)?.reason;
    return raw ? String(raw).trim() : '';
}

interface RowProps {
    label: string;
    value: string;
    accent?: string;
}

/**
 * Ligne label / valeur compacte.
 */
function Row({ label, value, accent }: RowProps) {
    const colors = useAppColors();
    return (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: accent ?? colors.text }]} numberOfLines={3}>
                {value || '—'}
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
 * Modal détails demande de location — design type confirmation / billet.
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
    const isPayable = status === 'ACCEPTED' && onPayRequest && item;
    const canDownloadReceipt = status === 'CONFIRMED' && !!item;
    const primaryBlue = colors.activeTabColor;

    const quoteAmount = item?.quotedAmount ?? item?.quoteAmount ?? item?.amount ?? item?.totalAmount;
    const quoteCompany =
        (item as any)?.quote?.companyName ??
        (item as any)?.company?.name ??
        (item as any)?.companyName;
    const additionalServices = (item as any)?.additionalServices;
    const createdAt = (item as any)?.createdAt;

    const refusalReason = useMemo(
        () => (item && status === 'REFUSED' ? getRefusalReason(item) : ''),
        [item, status],
    );

    if (!item) return null;

    /**
     * Télécharge le reçu PDF d'une location de bus confirmée.
     */
    const handleDownloadReceipt = async () => {
        setIsGeneratingReceipt(true);
        try {
            const html = generateBusRentalReceiptHTML(item);
            const dateFormatted = formatDateForFileName();
            const receiptReference = String(getBusRentalReceiptReference(item)).replace(
                /[^a-zA-Z0-9_-]/g,
                '-',
            );
            const finalFileName = `BusRental-Receipt-${receiptReference}-${dateFormatted}.pdf`;

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 595,
                height: 842,
                fileName: finalFileName,
            });

            const finalFileUri = `${FileSystemLegacy.documentDirectory}${finalFileName}`;
            await FileSystemLegacy.copyAsync({ from: uri, to: finalFileUri });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(finalFileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Télécharger le reçu',
                });
            } else {
                showAlert(
                    'Succès',
                    `Le reçu a été sauvegardé dans vos documents.\n\nFichier: ${finalFileName}`,
                );
            }
        } catch (error) {
            console.error('Erreur lors de la génération du reçu de location:', error);
            showAlert(
                'Erreur',
                'Une erreur est survenue lors de la génération du reçu. Veuillez réessayer.',
            );
        } finally {
            setIsGeneratingReceipt(false);
        }
    };

    const fromCity = item.departureCity?.name ?? '—';
    const toCity = item.arrivalCity?.name ?? '—';
    const clientName =
        ([item.firstName, item.lastName].filter(Boolean).join(' ') ||
            (item as any)?.customerName) ||
        '—';
    const phone = (item as any)?.phone?.number ?? (item as any)?.phone ?? (item as any)?.customerPhone;
    const phoneFormatted =
        typeof phone === 'string'
            ? phone
            : phone?.countryCode && phone?.digits
              ? `${phone.countryCode} ${phone.digits}`
              : '—';
    const email = String((item as any)?.email ?? (item as any)?.customerEmail ?? '—');
    const departureDetail = (item as any)?.departureCityDetail;
    const arrivalDetail = (item as any)?.arrivalCityDetail;
    const capacity = item.requiredCapacity ?? item.passengerCount;
    const tripPurpose = getLabel(TRIP_PURPOSE_LABELS, (item as any)?.tripPurpose);
    const tripPurposeOther = (item as any)?.tripPurposeOther;
    const specialInstructions = (item as any)?.specialInstructions;
    const serviceLabels = Array.isArray(additionalServices)
        ? additionalServices.map((s: string) => ADDITIONAL_SERVICE_LABELS[s] ?? s)
        : [];
    const hasBudget =
        (item as any)?.budgetMin != null || (item as any)?.budgetMax != null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.scrollBackground,
                            paddingBottom: Math.max(insets.bottom, 12),
                        },
                    ]}
                >
                    {/* Header bleu trajet */}
                    <View style={[styles.blueHeader, { backgroundColor: primaryBlue }]}>
                        <View style={styles.handleWrap}>
                            <View style={styles.handle} />
                        </View>
                        <View style={styles.blueHeaderTop}>
                            <Text style={styles.routeTitle} numberOfLines={2}>
                                {fromCity} → {toCity}
                            </Text>
                            <Pressable
                                onPress={onClose}
                                hitSlop={10}
                                style={styles.closeOnBlue}
                            >
                                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>
                        <Text style={styles.routeSub} numberOfLines={1}>
                            {[
                                formatRentalDate(item.departureDate),
                                getLabel(TRIP_TYPE_LABELS, item.tripType),
                            ]
                                .filter((v) => v && v !== '—')
                                .join(' · ')}
                        </Text>
                        <View style={styles.badgeOnBlue}>
                            <Text style={styles.badgeOnBlueText}>{statusBadge}</Text>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {refusalReason ? (
                            <View
                                style={[
                                    styles.alertCard,
                                    { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="close-circle"
                                    size={22}
                                    color={colors.danger}
                                />
                                <View style={styles.alertBody}>
                                    <Text style={[styles.alertTitle, { color: colors.danger }]}>
                                        Demande refusée
                                    </Text>
                                    <Text style={[styles.alertText, { color: colors.danger }]}>
                                        {refusalReason}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {quoteAmount != null || quoteCompany ? (
                            <View
                                style={[
                                    styles.card,
                                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                ]}
                            >
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Devis</Text>
                                {quoteAmount != null ? (
                                    <Text style={[styles.quoteAmount, { color: primaryBlue }]}>
                                        {Number(quoteAmount).toLocaleString('fr-FR')} XOF
                                    </Text>
                                ) : null}
                                {quoteCompany ? (
                                    <Text style={[styles.quoteCompany, { color: colors.secondaryText }]}>
                                        {quoteCompany}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Synthèse rapide */}
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.chipsRow}>
                                <View style={[styles.chip, { backgroundColor: colors.infoMuted }]}>
                                    <MaterialCommunityIcons name="bus" size={16} color={primaryBlue} />
                                    <Text style={[styles.chipText, { color: colors.text }]}>
                                        {getLabel(BUS_TYPE_LABELS, item.busType)}
                                    </Text>
                                </View>
                                {capacity ? (
                                    <View style={[styles.chip, { backgroundColor: colors.infoMuted }]}>
                                        <MaterialCommunityIcons
                                            name="seat-passenger"
                                            size={16}
                                            color={primaryBlue}
                                        />
                                        <Text style={[styles.chipText, { color: colors.text }]}>
                                            {capacity} places
                                        </Text>
                                    </View>
                                ) : null}
                                {(item as any)?.estimatedDuration ? (
                                    <View style={[styles.chip, { backgroundColor: colors.infoMuted }]}>
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={16}
                                            color={primaryBlue}
                                        />
                                        <Text style={[styles.chipText, { color: colors.text }]}>
                                            {(item as any).estimatedDuration}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Trajet</Text>
                            <Row label="Départ" value={fromCity} />
                            {departureDetail ? (
                                <Row label="Lieu" value={String(departureDetail)} />
                            ) : null}
                            <Row label="Arrivée" value={toCity} />
                            {arrivalDetail ? (
                                <Row label="Lieu" value={String(arrivalDetail)} />
                            ) : null}
                            {item.tripType === 'ROUND_TRIP' && item.returnDate ? (
                                <Row label="Retour" value={formatRentalDate(item.returnDate)} />
                            ) : null}
                        </View>

                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.cardTitle, { color: colors.text }]}>
                                Exigences
                            </Text>
                            <Row
                                label="Passagers"
                                value={`${item.passengerCount ?? '—'} · ${getLabel(PASSENGER_TYPE_LABELS, (item as any)?.passengerType)}`}
                            />
                            <Row
                                label="Bagages"
                                value={getLabel(LUGGAGE_LABELS, (item as any)?.luggageNeeds)}
                            />
                            <Row
                                label="Accessibilité"
                                value={getLabel(
                                    ACCESSIBILITY_LABELS,
                                    (item as any)?.accessibilityNeeds,
                                )}
                            />
                            {tripPurpose !== '—' ? (
                                <Row
                                    label="Objectif"
                                    value={
                                        tripPurposeOther
                                            ? `${tripPurpose} — ${tripPurposeOther}`
                                            : tripPurpose
                                    }
                                />
                            ) : null}
                            {specialInstructions ? (
                                <Row label="Instructions" value={String(specialInstructions)} />
                            ) : null}
                        </View>

                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Contact</Text>
                            <Row label="Nom" value={clientName} />
                            <Row label="Téléphone" value={phoneFormatted} />
                            <Row label="Email" value={email} />
                        </View>

                        {serviceLabels.length > 0 ? (
                            <View
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: colors.cardBackground,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.cardTitle, { color: colors.text }]}>
                                    Services
                                </Text>
                                <View style={styles.tagsRow}>
                                    {serviceLabels.map((label) => (
                                        <View
                                            key={label}
                                            style={[styles.tag, { backgroundColor: colors.infoMuted }]}
                                        >
                                            <Text style={[styles.tagText, { color: primaryBlue }]}>
                                                {label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {hasBudget ? (
                            <View
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: colors.cardBackground,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Budget</Text>
                                <Row
                                    label="Fourchette"
                                    value={`${Number((item as any)?.budgetMin ?? 0).toLocaleString('fr-FR')} – ${Number((item as any)?.budgetMax ?? 0).toLocaleString('fr-FR')} FCFA`}
                                    accent={primaryBlue}
                                />
                            </View>
                        ) : null}

                        {createdAt ? (
                            <Text style={[styles.meta, { color: colors.secondaryText }]}>
                                Demande créée le {formatRentalDate(createdAt)}
                            </Text>
                        ) : null}
                    </ScrollView>

                    {(isPayable || canDownloadReceipt) && (
                        <View
                            style={[
                                styles.footer,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderTopColor: colors.border,
                                },
                            ]}
                        >
                            {isPayable ? (
                                <AppButton
                                    title="Payer maintenant"
                                    onPress={() => onPayRequest?.(item)}
                                    icon={
                                        <MaterialCommunityIcons
                                            name="wallet-outline"
                                            size={18}
                                            color="#FFFFFF"
                                        />
                                    }
                                />
                            ) : null}
                            {canDownloadReceipt ? (
                                <AppButton
                                    title={
                                        isGeneratingReceipt
                                            ? 'Génération...'
                                            : 'Télécharger le reçu'
                                    }
                                    onPress={handleDownloadReceipt}
                                    loading={isGeneratingReceipt}
                                    disabled={isGeneratingReceipt}
                                    variant={isPayable ? 'secondary' : 'primary'}
                                    icon={
                                        <MaterialCommunityIcons
                                            name="download"
                                            size={18}
                                            color={isPayable ? primaryBlue : '#FFFFFF'}
                                        />
                                    }
                                />
                            ) : null}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '92%',
        overflow: 'hidden',
    },
    handleWrap: {
        alignItems: 'center',
        paddingBottom: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.45)',
    },
    blueHeader: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    blueHeaderTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    routeTitle: {
        flex: 1,
        fontSize: 22,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        lineHeight: 28,
    },
    closeOnBlue: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    routeSub: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        color: 'rgba(255,255,255,0.88)',
    },
    badgeOnBlue: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 2,
    },
    badgeOnBlueText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    scroll: {
        maxHeight: 480,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 20,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
    },
    alertBody: {
        flex: 1,
        gap: 4,
    },
    alertTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    alertText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 2,
    },
    quoteAmount: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
    },
    quoteCompany: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },
    chipText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    rowLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
    rowValue: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
        flex: 1.3,
        textAlign: 'right',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
    },
    meta: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginTop: 4,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
});
