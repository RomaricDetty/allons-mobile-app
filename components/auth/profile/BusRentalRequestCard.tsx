// @ts-nocheck
import { AppButton } from '@/components/ui/AppButton';
import { formatBookingDate } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/** Libellés pour les types de bus (API → affichage) */
const BUS_TYPE_LABELS: Record<string, string> = {
    BUS: 'Bus standard',
    STANDARD: 'Bus standard',
    LUXURY_BUS: 'Bus de luxe',
    MINIBUS: 'Minibus',
};

const TRIP_TYPE_LABELS: Record<string, string> = {
    ONE_WAY: 'Aller simple',
    ROUND_TRIP: 'Aller-retour',
};

/** Badge statut (court) */
const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    REFUSED: 'Refusé',
    CONFIRMED: 'Confirmé',
    CANCELLED: 'Annulé',
};

export interface BusRentalRequestItem {
    id: string;
    departureCity?: { id: string; name: string };
    arrivalCity?: { id: string; name: string };
    departureDate?: string;
    returnDate?: string | null;
    tripType?: string;
    passengerCount?: number;
    busType?: string;
    requiredCapacity?: number;
    status?: string;
    [key: string]: unknown;
}

interface BusRentalRequestCardProps {
    item: BusRentalRequestItem;
    /** Appelé au tap sur la carte pour afficher les détails (tous statuts) */
    onViewDetails?: (item: BusRentalRequestItem) => void;
    /** Appelé quand l’utilisateur tape sur « Payer » (statut ACCEPTED uniquement) */
    onPayRequest?: (item: BusRentalRequestItem) => void;
}

/**
 * Formate la date de location : masque l’heure si 00:00.
 */
function formatRentalDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
    if (isMidnight) {
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }
    return formatBookingDate(dateString);
}

/**
 * Ton visuel du badge selon le statut.
 */
function getStatusTone(status: string, colors: ReturnType<typeof useAppColors>) {
    switch (status) {
        case 'CONFIRMED':
            return { backgroundColor: colors.successMuted, color: colors.success };
        case 'ACCEPTED':
            return { backgroundColor: colors.infoMuted, color: colors.activeTabColor };
        case 'PENDING':
            return { backgroundColor: 'rgba(184, 110, 0, 0.12)', color: '#B86E00' };
        case 'REFUSED':
        case 'CANCELLED':
            return { backgroundColor: colors.dangerMuted, color: colors.danger };
        default:
            return { backgroundColor: colors.inputBackground, color: colors.secondaryText };
    }
}

/**
 * Extrait le motif de refus depuis les champs API possibles.
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

/**
 * Carte demande de location — alignée sur BookingCard (route / meta / actions).
 */
export const BusRentalRequestCard: React.FC<BusRentalRequestCardProps> = ({
    item,
    onViewDetails,
    onPayRequest,
}) => {
    const colors = useAppColors();
    const fromCity = item.departureCity?.name || '—';
    const toCity = item.arrivalCity?.name || '—';
    const departureDateFormatted = formatRentalDate(item.departureDate);
    const returnDateFormatted = formatRentalDate(item.returnDate || undefined);
    const isRoundTrip = item.tripType === 'ROUND_TRIP';
    const busTypeLabel = item.busType ? BUS_TYPE_LABELS[item.busType] ?? item.busType : '—';
    const tripTypeLabel = item.tripType ? TRIP_TYPE_LABELS[item.tripType] ?? item.tripType : '';
    const status = item.status ?? 'PENDING';
    const statusTone = getStatusTone(status, colors);
    const statusBadgeText = STATUS_LABELS[status] ?? 'En attente';
    const capacity = item.requiredCapacity ?? item.passengerCount ?? 0;
    const isPayable = status === 'ACCEPTED' && typeof onPayRequest === 'function';
    const refusalReason = useMemo(
        () => (status === 'REFUSED' ? getRefusalReason(item) : ''),
        [status, item],
    );

    const scheduleLine = [
        departureDateFormatted,
        tripTypeLabel,
        isRoundTrip && returnDateFormatted ? `Retour ${returnDateFormatted}` : '',
    ]
        .filter(Boolean)
        .join(' · ');

    const cardContent = (
        <>
            <View style={styles.topRow}>
                <View style={styles.routeBlock}>
                    <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={2}>
                        {fromCity} → {toCity}
                    </Text>
                    {scheduleLine ? (
                        <Text style={[styles.scheduleText, { color: colors.secondaryText }]} numberOfLines={2}>
                            {scheduleLine}
                        </Text>
                    ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusTone.backgroundColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusTone.color }]}>
                        {statusBadgeText}
                    </Text>
                </View>
            </View>

            <View style={[styles.metaBlock, { borderColor: colors.border }]}>
                <View style={styles.metaRow}>
                    <View style={[styles.metaIcon, { backgroundColor: colors.infoMuted }]}>
                        <MaterialCommunityIcons name="bus" size={18} color={colors.activeTabColor} />
                    </View>
                    <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                        {busTypeLabel}
                    </Text>
                </View>
                {capacity > 0 ? (
                    <View style={styles.metaRow}>
                        <View style={[styles.metaIcon, { backgroundColor: colors.infoMuted }]}>
                            <MaterialCommunityIcons
                                name="seat-passenger"
                                size={18}
                                color={colors.activeTabColor}
                            />
                        </View>
                        <Text style={[styles.metaText, { color: colors.secondaryText }]}>
                            {capacity} place{capacity > 1 ? 's' : ''} demandée{capacity > 1 ? 's' : ''}
                        </Text>
                    </View>
                ) : null}
            </View>

            {refusalReason ? (
                <View style={[styles.refusalBox, { backgroundColor: colors.dangerMuted }]}>
                    <Text style={[styles.refusalLabel, { color: colors.danger }]}>Motif du refus</Text>
                    <Text style={[styles.refusalText, { color: colors.danger }]} numberOfLines={3}>
                        {refusalReason}
                    </Text>
                </View>
            ) : null}

            <View style={styles.actions}>
                {isPayable ? (
                    <AppButton
                        title="Payer"
                        onPress={() => onPayRequest?.(item)}
                        icon={<MaterialCommunityIcons name="wallet-outline" size={18} color="#FFFFFF" />}
                    />
                ) : null}
                {onViewDetails ? (
                    <AppButton
                        title="Voir le détail"
                        onPress={() => onViewDetails(item)}
                        variant={isPayable ? 'secondary' : 'primary'}
                        icon={
                            <MaterialCommunityIcons
                                name="file-document-outline"
                                size={18}
                                color={isPayable ? colors.activeTabColor : '#FFFFFF'}
                            />
                        }
                    />
                ) : null}
            </View>
        </>
    );

    return (
        <View
            style={[
                styles.card,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
        >
            {cardContent}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        gap: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    routeBlock: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    routeText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        lineHeight: 24,
    },
    scheduleText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
    },
    metaBlock: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        gap: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    metaIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    refusalBox: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 4,
    },
    refusalLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
    },
    refusalText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
    },
    actions: {
        gap: 10,
    },
});
