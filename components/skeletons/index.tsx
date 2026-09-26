import { Skeleton, SkeletonBlock, SkeletonCircle, SkeletonLine } from '@/components/ui/Skeleton';
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Profil — onglet Infos (carte identité + coins + lignes settings) */
export function ProfileInfoSkeleton() {
    const colors = useAppColors();
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.scrollBackground }}
            contentContainerStyle={styles.pad}
            showsVerticalScrollIndicator={false}
        >
            <SkeletonBlock style={styles.mb}>
                <View style={styles.row}>
                    <SkeletonCircle size={64} />
                    <View style={styles.flex}>
                        <SkeletonLine width="55%" height={18} />
                        <SkeletonLine width="40%" height={12} style={styles.mt8} />
                    </View>
                </View>
                <View style={styles.mt16}>
                    <SkeletonLine width="30%" height={10} />
                    <SkeletonLine width="75%" height={14} style={styles.mt8} />
                </View>
                <View style={styles.mt16}>
                    <SkeletonLine width="28%" height={10} />
                    <SkeletonLine width="50%" height={14} style={styles.mt8} />
                </View>
                <View style={styles.mt16}>
                    <SkeletonLine width="32%" height={10} />
                    <SkeletonLine width="45%" height={14} style={styles.mt8} />
                </View>
            </SkeletonBlock>

            <SkeletonBlock style={styles.mb}>
                <View style={styles.rowBetween}>
                    <View style={styles.flex}>
                        <SkeletonLine width="60%" height={11} />
                        <SkeletonLine width="40%" height={22} style={styles.mt10} />
                    </View>
                    <SkeletonCircle size={36} />
                </View>
            </SkeletonBlock>

            {[0, 1, 2].map((i) => (
                <SkeletonBlock key={i} style={styles.mb}>
                    <View style={styles.row}>
                        <Skeleton width={40} height={40} borderRadius={10} />
                        <View style={styles.flex}>
                            <SkeletonLine width="50%" height={14} />
                            <SkeletonLine width="80%" height={11} style={styles.mt8} />
                        </View>
                    </View>
                </SkeletonBlock>
            ))}

            <Skeleton height={50} borderRadius={12} />
        </ScrollView>
    );
}

/** Profil — liste réservations */
export function ProfileBookingsSkeleton() {
    const colors = useAppColors();
    return (
        <View style={[styles.flex, { backgroundColor: colors.scrollBackground }]}>
            <View style={styles.padH}>
                <SkeletonBlock style={styles.mb}>
                    <Skeleton height={50} borderRadius={16} />
                    <Skeleton height={50} borderRadius={16} style={styles.mt10} />
                </SkeletonBlock>
            </View>
            <ScrollView contentContainerStyle={styles.padH} showsVerticalScrollIndicator={false}>
                {[0, 1, 2].map((i) => (
                    <SkeletonBlock key={i} style={styles.mb}>
                        <View style={styles.rowBetween}>
                            <SkeletonLine width="55%" height={16} />
                            <Skeleton width={64} height={24} borderRadius={12} />
                        </View>
                        <SkeletonLine width="70%" height={12} style={styles.mt10} />
                        <SkeletonLine width="45%" height={12} style={styles.mt8} />
                        <View style={[styles.rowBetween, styles.mt16]}>
                            <SkeletonLine width="25%" height={11} />
                            <SkeletonLine width="35%" height={16} />
                        </View>
                        <Skeleton height={44} borderRadius={10} style={styles.mt16} />
                    </SkeletonBlock>
                ))}
            </ScrollView>
        </View>
    );
}

/** Accueil */
export function HomeSkeleton() {
    const colors = useAppColors();
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.scrollBackground }}
            contentContainerStyle={styles.pad}
            showsVerticalScrollIndicator={false}
        >
            <SkeletonLine width="45%" height={28} />
            <SkeletonLine width="70%" height={14} style={styles.mt10} />

            <SkeletonBlock style={[styles.mt16, styles.mb]} height={120}>
                <SkeletonLine width="40%" height={12} />
                <SkeletonLine width="80%" height={18} style={styles.mt10} />
                <SkeletonLine width="55%" height={12} style={styles.mt10} />
            </SkeletonBlock>

            <SkeletonLine width="50%" height={16} style={styles.mb} />
            <View style={styles.row}>
                {[0, 1].map((i) => (
                    <SkeletonBlock key={i} style={[styles.flex, i === 0 && styles.mr8]}>
                        <Skeleton height={72} borderRadius={12} />
                        <SkeletonLine width="70%" height={12} style={styles.mt10} />
                    </SkeletonBlock>
                ))}
            </View>

            <SkeletonLine width="40%" height={16} style={[styles.mt16, styles.mb]} />
            {[0, 1].map((i) => (
                <SkeletonBlock key={i} style={styles.mb}>
                    <View style={styles.row}>
                        <Skeleton width={56} height={56} borderRadius={12} />
                        <View style={styles.flex}>
                            <SkeletonLine width="50%" height={11} />
                            <SkeletonLine width="85%" height={15} style={styles.mt8} />
                        </View>
                    </View>
                </SkeletonBlock>
            ))}
        </ScrollView>
    );
}

/** Formulaire édition / location bus */
export function FormScreenSkeleton({ withHeader = true }: { withHeader?: boolean }) {
    const colors = useAppColors();
    return (
        <View style={[styles.flex, { backgroundColor: colors.scrollBackground }]}>
            {withHeader && (
                <View style={[styles.headerSk, { backgroundColor: colors.headerBackground, borderBottomColor: colors.headerBorder }]}>
                    <SkeletonCircle size={36} />
                    <SkeletonLine width="50%" height={16} style={styles.mh16} />
                </View>
            )}
            <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
                <SkeletonBlock>
                    <SkeletonLine width="40%" height={16} style={styles.mb} />
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.mb}>
                            <SkeletonLine width="30%" height={12} />
                            <Skeleton height={50} borderRadius={16} style={styles.mt8} />
                        </View>
                    ))}
                </SkeletonBlock>
            </ScrollView>
        </View>
    );
}

/** Plan de sièges */
export function SeatMapSkeleton() {
    const colors = useAppColors();
    return (
        <View style={[styles.flex, styles.pad, { backgroundColor: colors.scrollBackground }]}>
            <View style={[styles.row, styles.mb]}>
                {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.row, styles.mr16]}>
                        <SkeletonCircle size={14} />
                        <SkeletonLine width={40} height={11} style={styles.ml6} />
                    </View>
                ))}
            </View>
            <SkeletonBlock style={styles.flex}>
                {Array.from({ length: 8 }).map((_, row) => (
                    <View key={row} style={[styles.seatRow, styles.mb]}>
                        <Skeleton width={36} height={36} borderRadius={10} />
                        <Skeleton width={36} height={36} borderRadius={10} style={styles.ml6} />
                        <View style={styles.seatGap} />
                        <Skeleton width={36} height={36} borderRadius={10} />
                        <Skeleton width={36} height={36} borderRadius={10} style={styles.ml6} />
                    </View>
                ))}
            </SkeletonBlock>
            <Skeleton height={52} borderRadius={12} style={styles.mt16} />
        </View>
    );
}

/** Carte trajet (liste) */
export function TripCardSkeleton() {
    return (
        <SkeletonBlock style={styles.mb}>
            <View style={styles.rowBetween}>
                <SkeletonLine width="45%" height={14} />
                <SkeletonLine width="25%" height={14} />
            </View>
            <View style={[styles.row, styles.mt16]}>
                <Skeleton width={44} height={44} borderRadius={10} />
                <View style={[styles.flex, styles.ml6]}>
                    <SkeletonLine width="70%" height={16} />
                    <SkeletonLine width="50%" height={12} style={styles.mt8} />
                </View>
            </View>
            <View style={[styles.rowBetween, styles.mt16]}>
                <SkeletonLine width="30%" height={12} />
                <SkeletonLine width="28%" height={18} />
            </View>
        </SkeletonBlock>
    );
}

export function TripListSkeleton() {
    const colors = useAppColors();
    return (
        <View style={[styles.flex, { backgroundColor: colors.scrollBackground }]}>
            <View style={[styles.headerSk, { backgroundColor: colors.headerBackground, borderBottomColor: colors.headerBorder }]}>
                <SkeletonCircle size={36} />
                <View style={styles.flex}>
                    <SkeletonLine width="40%" height={14} />
                    <SkeletonLine width="55%" height={11} style={styles.mt8} />
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
                {[0, 1, 2, 3].map((i) => (
                    <TripCardSkeleton key={i} />
                ))}
            </ScrollView>
        </View>
    );
}

/** Détails ticket / QR */
export function TicketDetailsSkeleton() {
    const colors = useAppColors();
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.scrollBackground }}
            contentContainerStyle={styles.pad}
            showsVerticalScrollIndicator={false}
        >
            <SkeletonBlock style={styles.mb}>
                <SkeletonLine width="50%" height={16} />
                <SkeletonLine width="70%" height={12} style={styles.mt10} />
                <View style={[styles.rowBetween, styles.mt16]}>
                    <SkeletonLine width="35%" height={14} />
                    <SkeletonLine width="35%" height={14} />
                </View>
            </SkeletonBlock>
            <SkeletonBlock style={[styles.mb, styles.center]}>
                <Skeleton width={180} height={180} borderRadius={16} />
                <SkeletonLine width="40%" height={12} style={styles.mt16} />
            </SkeletonBlock>
            {[0, 1].map((i) => (
                <SkeletonBlock key={i} style={styles.mb}>
                    <SkeletonLine width="40%" height={14} />
                    <SkeletonLine width="80%" height={12} style={styles.mt10} />
                    <SkeletonLine width="60%" height={12} style={styles.mt8} />
                </SkeletonBlock>
            ))}
        </ScrollView>
    );
}

/** Liste bagages / cartes génériques */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
    const colors = useAppColors();
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.scrollBackground }}
            contentContainerStyle={styles.pad}
            showsVerticalScrollIndicator={false}
        >
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonBlock key={i} style={styles.mb}>
                    <View style={styles.row}>
                        <Skeleton width={48} height={48} borderRadius={12} />
                        <View style={styles.flex}>
                            <SkeletonLine width="60%" height={14} />
                            <SkeletonLine width="85%" height={11} style={styles.mt8} />
                        </View>
                    </View>
                </SkeletonBlock>
            ))}
        </ScrollView>
    );
}

/** QR seul (section) */
export function QrSkeleton({ size = 160 }: { size?: number }) {
    return (
        <View style={styles.center}>
            <Skeleton width={size} height={size} borderRadius={16} />
            <SkeletonLine width={100} height={12} style={styles.mt16} />
        </View>
    );
}

/** Liste bottom-sheet (villes, compagnies…) */
export function BottomSheetListSkeleton({ count = 8 }: { count?: number }) {
    return (
        <View style={styles.pad}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={[styles.row, styles.mb]}>
                    <SkeletonCircle size={36} />
                    <View style={[styles.flex, styles.ml6]}>
                        <SkeletonLine width={`${55 + (i % 3) * 12}%`} height={14} />
                        <SkeletonLine width={`${35 + (i % 2) * 15}%`} height={10} style={styles.mt8} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/** Overlay traitement (paiement / validation) */
export function ProcessingOverlaySkeleton() {
    const colors = useAppColors();
    return (
        <View
            style={[
                styles.overlayCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
        >
            <SkeletonLine width="55%" height={16} />
            <SkeletonLine width="80%" height={12} style={styles.mt10} />
            <Skeleton height={8} borderRadius={4} style={styles.mt16} />
            <SkeletonLine width="40%" height={11} style={styles.mt16} />
        </View>
    );
}

/** Carte / suivi trajet */
export function MapScreenSkeleton() {
    const colors = useAppColors();
    return (
        <View style={[styles.flex, { backgroundColor: colors.scrollBackground }]}>
            <Skeleton height={220} borderRadius={0} style={{ width: '100%' }} />
            <View style={styles.pad}>
                <SkeletonBlock style={styles.mb}>
                    <SkeletonLine width="50%" height={16} />
                    <SkeletonLine width="80%" height={12} style={styles.mt10} />
                    <View style={[styles.rowBetween, styles.mt16]}>
                        <SkeletonLine width="30%" height={12} />
                        <SkeletonLine width="30%" height={12} />
                    </View>
                </SkeletonBlock>
                <SkeletonBlock>
                    <Skeleton height={80} borderRadius={12} />
                    <SkeletonLine width="60%" height={12} style={styles.mt10} />
                </SkeletonBlock>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    pad: { padding: 16, paddingBottom: 40 },
    padH: { paddingHorizontal: 16 },
    mb: { marginBottom: 16 },
    mt8: { marginTop: 8 },
    mt10: { marginTop: 10 },
    mt16: { marginTop: 16 },
    mr8: { marginRight: 8 },
    mr16: { marginRight: 16 },
    ml6: { marginLeft: 6 },
    mh16: { marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    center: { alignItems: 'center', justifyContent: 'center' },
    headerSk: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    seatGap: { width: 28 },
    overlayCard: {
        width: '82%',
        maxWidth: 320,
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
    },
});
