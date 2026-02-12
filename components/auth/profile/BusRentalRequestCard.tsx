// @ts-nocheck
import { formatBookingDate } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/** Libellés pour les types de bus (API → affichage) */
const BUS_TYPE_LABELS: Record<string, string> = {
    STANDARD: 'Bus standard',
    LUXURY_BUS: 'Bus de luxe',
    MINIBUS: 'Minibus',
};

/** Statuts des demandes de location (alignés sur BusRentalRequestStatus backend) */
const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente de réponse',
    ACCEPTED: 'Accepté',
    REFUSED: 'Refusé',
    CONFIRMED: 'Confirmé',
    CANCELLED: 'Annulé',
};

/** Texte principal du statut (sous-titre) */
const STATUS_MAIN_LABELS: Record<string, string> = {
    PENDING: 'En attente de devis',
    ACCEPTED: 'Demande acceptée',
    REFUSED: 'Demande refusée',
    CONFIRMED: 'Demande confirmée (payée)',
    CANCELLED: 'Demande annulée',
};

/** Couleurs du badge par statut */
const STATUS_BADGE_COLORS: Record<string, { backgroundColor: string; color: string }> = {
    PENDING: { backgroundColor: '#F5E6C8', color: '#5C4A32' },
    ACCEPTED: { backgroundColor: '#CCE5FF', color: '#004085' },
    REFUSED: { backgroundColor: '#F8D7DA', color: '#721C24' },
    CANCELLED: { backgroundColor: '#F8D7DA', color: '#721C24' },
    CONFIRMED: { backgroundColor: '#D4EDDA', color: '#155724' },
};

const DEFAULT_STATUS_BADGE_COLORS = { backgroundColor: '#F5E6C8', color: '#5C4A32' };

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
    /** Appelé quand l’utilisateur tape sur une demande au statut ACCEPTED (pour aller au paiement) */
    onPayRequest?: (item: BusRentalRequestItem) => void;
}

/**
 * Carte d'affichage d'une demande de location de bus.
 * Design type carte trajet : DÉPART | timeline | ARRIVÉE, badge places, type bus, statut.
 */
export const BusRentalRequestCard: React.FC<BusRentalRequestCardProps> = ({ item, onPayRequest }) => {
    const colors = useAppColors();
    const departureDateFormatted = item.departureDate ? formatBookingDate(item.departureDate) : '';
    const returnDateFormatted = item.returnDate ? formatBookingDate(item.returnDate) : '';
    const isRoundTrip = item.tripType === 'ROUND_TRIP';
    const busTypeLabel = item.busType ? (BUS_TYPE_LABELS[item.busType] ?? item.busType) : '—';
    const status = item.status ?? 'PENDING';
    const statusMainText = STATUS_MAIN_LABELS[status] ?? 'En attente de réponse';
    const statusBadgeText = STATUS_LABELS[status] ?? 'En attente';
    const badgeColors = STATUS_BADGE_COLORS[status] ?? DEFAULT_STATUS_BADGE_COLORS;
    const capacity = item.requiredCapacity ?? 0;
    const isPayable = status === 'ACCEPTED' && typeof onPayRequest === 'function';

    const cardContent = (
        <>
            {/* Section trajet : DÉPART | timeline | ARRIVÉE */}
            <View style={styles.tripRow}>
                <View style={styles.departureCol}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>DÉPART</Text>
                    {departureDateFormatted ? (
                        <Text style={[styles.mainValue, { color: colors.text }]}>{item.departureCity.name}</Text>
                    ) : null}
                    {item.departureCity?.name ? (
                        <Text style={[styles.secondaryValue, { color: colors.text }]}>{departureDateFormatted}</Text>
                    ) : null}
                </View>

                <View style={styles.timelineCol}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.text }]} />
                    <View style={[styles.timelineLine, { backgroundColor: colors.text }]} />
                    <View style={[styles.timelineDot, { backgroundColor: colors.text }]} />
                </View>

                <View style={[styles.arrivalCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>ARRIVÉE</Text>
                    {item.arrivalCity?.name ? (
                        <Text style={[styles.mainValue, styles.arrivalText, { color: colors.text }]}>{item.arrivalCity.name}</Text>
                    ) : null}
                    {isRoundTrip && returnDateFormatted ? (
                        <Text style={[styles.secondaryValue, styles.arrivalText, { color: colors.text }]}>
                            {returnDateFormatted}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Statut (sous la section trajet) */}
            <View style={styles.statusRow}>
                <Text style={[styles.statusMainText, { color: colors.text }]}>{statusMainText}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColors.backgroundColor }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColors.color }]}>{statusBadgeText}</Text>
                </View>
            </View>

            {/* Bas : badge places + type bus */}
            <View style={styles.footerRow}>
                {capacity > 0 ? (
                    <View style={styles.placesBadge}>
                        <Text style={styles.placesBadgeText}>{capacity} place{capacity > 1 ? 's' : ''} demandée{capacity > 1 ? 's' : ''}</Text>
                    </View>
                ) : null}
                <Text style={[styles.busTypeText, { color: colors.text }]}>{busTypeLabel}</Text>
            </View>

            {isPayable ? (
                <View style={styles.payRow}>
                    <Text style={[styles.payLabel, { color: colors.activeTabColor }]}>Payer</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.activeTabColor} />
                </View>
            ) : null}
        </>
    );

    const cardStyle = [styles.card, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }];

    if (isPayable) {
        return (
            <Pressable style={cardStyle} onPress={() => onPayRequest?.(item)}>
                {cardContent}
            </Pressable>
        );
    }
    return <View style={cardStyle}>{cardContent}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    tripRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    departureCol: {
        flex: 1,
    },
    timelineCol: {
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timelineLine: {
        width: 2,
        height: 28,
    },
    arrivalCol: {
        flex: 1,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    /** Valeur principale (date départ, ville arrivée) : gras, même taille */
    mainValue: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 2,
    },
    /** Valeur secondaire (ville départ, date retour) : même taille, même graisse */
    secondaryValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    arrivalText: {
        textAlign: 'right',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statusMainText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#5C4A32',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    payRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        gap: 4,
    },
    payLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    placesBadge: {
        backgroundColor: 'rgba(76, 175, 80, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    placesBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#2E7D32',
    },
    busTypeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
});
