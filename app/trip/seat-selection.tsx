// @ts-nocheck
import { getDepartureAvailableSeats } from '@/api/departure';
import { AppButton } from '@/components/ui/AppButton';
import { BackButton } from '@/components/ui/BackButton';
import { SeatMapSkeleton } from '@/components/skeletons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { showAlert } from '@/utils/alert';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Seat {
    number: number;
    available: boolean;
    booked: boolean;
    blocked: boolean;
    locked: boolean;
    selected?: boolean;
    passengerIndex?: number;
}

type SeatVisualState = 'available' | 'selected' | 'unavailable';

/**
 * Écran de sélection de sièges — plan en focus, chrome UI compact.
 */
const SeatSelection = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#6B7280';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E8E8EC';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#121212' : '#F3F3F7';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E8E8EC';
    const primaryBlue = tintColor === '#fff' ? '#1776BA' : tintColor;
    const availableBg = colorScheme === 'dark' ? '#2A2A2E' : '#EEF6FC';
    const availableBorder = colorScheme === 'dark' ? '#4A4A4E' : '#B6D4EA';
    const unavailableBg = colorScheme === 'dark' ? '#2C2C2E' : '#E5E7EB';
    const mapSurface = colorScheme === 'dark' ? '#1A1A1C' : '#F7F7F9';
    const aisleColor = colorScheme === 'dark' ? '#3A3A3C' : '#E5E7EB';

    const {
        trip,
        returnTrip,
        passengers,
        numberOfPassengers,
        currentLeg,
        onSeatsSelected,
    } = (route.params as any) || {};

    const isRoundTrip = !!returnTrip;
    const leg = currentLeg || 'OUTBOUND';
    const isReturnLeg = leg === 'RETURN';
    const currentTrip = isReturnLeg && returnTrip ? returnTrip : trip;
    const totalPassengers = numberOfPassengers ?? passengers?.length ?? 0;

    const [isLoading, setIsLoading] = useState(true);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Map<number, number>>(new Map());
    const [totalSeats, setTotalSeats] = useState(0);

    const fetchSeats = async () => {
        if (!currentTrip?.id) {
            showAlert('Erreur', 'Aucun trajet sélectionné');
            navigation.goBack();
            return;
        }

        try {
            setIsLoading(true);
            const response = await getDepartureAvailableSeats(currentTrip.id);

            if (response.status === 200 && response.data) {
                const seatsData = response.data.seats || response.data || [];
                const totalSeatsCount = response.data.totalSeats || currentTrip.totalSeats || 50;

                setTotalSeats(totalSeatsCount);

                const seatsArray: Seat[] = [];
                for (let i = 1; i <= totalSeatsCount; i++) {
                    const seatData = Array.isArray(seatsData)
                        ? seatsData.find((s: any) => s.number === i || s.seatNumber === i)
                        : seatsData[i];

                    const seatStatus = seatData?.status?.toUpperCase() || 'AVAILABLE';
                    seatsArray.push({
                        number: i,
                        available: seatStatus === 'AVAILABLE',
                        booked: seatStatus === 'BOOKED',
                        locked: seatStatus === 'LOCKED',
                        blocked: seatStatus === 'BLOCKED',
                        selected: false,
                    });
                }

                const initialSelections = new Map<number, number>();
                if (totalPassengers > 0 && passengers) {
                    passengers.forEach((passenger, index) => {
                        const passengerSeatNumber = passenger?.seatNumber;
                        if (passengerSeatNumber && passengerSeatNumber > 0) {
                            initialSelections.set(passengerSeatNumber, index);
                        }
                    });
                }

                setSelectedSeats(initialSelections);
                seatsArray.forEach((seat) => {
                    if (initialSelections.has(seat.number)) {
                        seat.selected = true;
                        seat.passengerIndex = initialSelections.get(seat.number);
                    }
                });
                setSeats(seatsArray);
            } else {
                throw new Error('Erreur lors de la récupération des sièges');
            }
        } catch (error: any) {
            console.error('Erreur:', error);
            showAlert('Erreur', 'Une erreur est survenue');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSeats();
    }, [currentTrip?.id, leg]);

    const handleSeatSelect = (seatNumber: number) => {
        const seat = seats.find((s) => s.number === seatNumber);
        if (!seat || !seat.available || seat.booked || seat.locked || seat.blocked) {
            return;
        }

        const newSelections = new Map(selectedSeats);

        if (selectedSeats.has(seatNumber)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            newSelections.delete(seatNumber);
            setSelectedSeats(newSelections);
            setSeats((prevSeats) =>
                prevSeats.map((s) =>
                    s.number === seatNumber
                        ? { ...s, selected: false, passengerIndex: undefined }
                        : s
                )
            );
            return;
        }

        const passengerIndices = Array.from({ length: totalPassengers }, (_, i) => i);
        const passengersWithSeats = Array.from(selectedSeats.values());
        const targetPassengerIndex = passengerIndices.find(
            (idx) => !passengersWithSeats.includes(idx)
        );

        if (targetPassengerIndex === undefined) {
            showAlert(
                'Attention',
                "Tous les passagers ont déjà un siège. Désélectionnez d'abord un siège."
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        newSelections.set(seatNumber, targetPassengerIndex);
        setSelectedSeats(newSelections);
        setSeats((prevSeats) =>
            prevSeats.map((s) =>
                s.number === seatNumber
                    ? { ...s, selected: true, passengerIndex: targetPassengerIndex }
                    : s
            )
        );
    };

    const handleConfirm = () => {
        if (selectedSeats.size < totalPassengers) {
            showAlert(
                'Attention',
                `Sélectionnez un siège pour tous les passagers (${selectedSeats.size}/${totalPassengers})`
            );
            return;
        }

        const seatsData = Array.from(selectedSeats.entries()).map(
            ([seatNumber, passengerIndex]) => ({
                passengerIndex,
                seatNumber,
                leg,
            })
        );

        if (onSeatsSelected) {
            onSeatsSelected(seatsData);
        }
        navigation.goBack();
    };

    const getSeatLayout = (): [number, number] => {
        const layout = currentTrip?.busSeatLayout;
        return Array.isArray(layout) && layout.length >= 2 ? [layout[0], layout[1]] : [2, 2];
    };

    const seatDimensions = useMemo(() => {
        const [leftSeatsCount, rightSeatsCount] = getSeatLayout();
        const maxSeatsPerSide = Math.max(leftSeatsCount, rightSeatsCount, 1);
        const screenWidth = Dimensions.get('window').width;

        // marges écran 16*2 + pad carte 8*2 + index rangée 24*2 + allée 36
        const horizontalChrome = 32 + 16 + 48 + 36;
        const gaps = Math.max(0, maxSeatsPerSide - 1) * 8;
        const sideWidth = Math.max(80, (screenWidth - horizontalChrome) / 2);
        const rawWidth = Math.floor((sideWidth - gaps) / maxSeatsPerSide);
        const optimizedWidth = Math.max(44, Math.min(56, Number.isFinite(rawWidth) ? rawWidth : 48));
        const optimizedHeight = Math.max(48, Math.round(optimizedWidth * 1.12));

        return { width: optimizedWidth, height: optimizedHeight };
    }, [currentTrip?.busSeatLayout]);

    const organizeSeatsInRows = () => {
        const [leftSeatsCount, rightSeatsCount] = getSeatLayout();
        const seatsPerRow = leftSeatsCount + rightSeatsCount;
        const rows: Array<{ leftSeats: Seat[]; rightSeats: Seat[]; rowNumber: number }> = [];

        for (let i = 0; i < seats.length; i += seatsPerRow) {
            const rowSeats = seats.slice(i, i + seatsPerRow);
            rows.push({
                leftSeats: rowSeats.slice(0, leftSeatsCount),
                rightSeats: rowSeats.slice(leftSeatsCount),
                rowNumber: Math.floor(i / seatsPerRow) + 1,
            });
        }
        return rows;
    };

    const seatRows = organizeSeatsInRows();
    const [leftLayout, rightLayout] = getSeatLayout();
    const allSelected = selectedSeats.size >= totalPassengers && totalPassengers > 0;

    const getSeatVisualState = (seat: Seat): SeatVisualState => {
        // selectedSeats est la source de vérité (évite désync avec seat.selected)
        if (selectedSeats.has(seat.number)) return 'selected';
        if (!seat.available || seat.booked || seat.locked || seat.blocked) return 'unavailable';
        return 'available';
    };

    const getSeatStyle = (seat: Seat) => {
        const state = getSeatVisualState(seat);
        if (state === 'selected') {
            return {
                backgroundColor: primaryBlue,
                borderColor: primaryBlue,
                borderWidth: 0,
            };
        }
        if (state === 'unavailable') {
            return {
                backgroundColor: unavailableBg,
                borderColor: 'transparent',
                borderWidth: 0,
            };
        }
        return {
            backgroundColor: availableBg,
            borderColor: availableBorder,
            borderWidth: 1.5,
        };
    };

    const getSeatTextColor = (seat: Seat) => {
        const state = getSeatVisualState(seat);
        if (state === 'selected') return '#FFFFFF';
        if (state === 'unavailable') return colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';
        return textColor;
    };

    const renderSeat = (seat: Seat) => {
        if (!seat) return null;
        const state = getSeatVisualState(seat);
        const disabled = state === 'unavailable';
        const passengerIndex = selectedSeats.get(seat.number);

        return (
            <Pressable
                key={seat.number}
                accessibilityRole="button"
                accessibilityLabel={
                    state === 'selected'
                        ? `Siège ${seat.number}, passager ${(passengerIndex ?? 0) + 1}`
                        : state === 'unavailable'
                          ? `Siège ${seat.number}, indisponible`
                          : `Siège ${seat.number}, disponible`
                }
                style={[
                    styles.seat,
                    getSeatStyle(seat),
                    {
                        width: seatDimensions.width,
                        height: seatDimensions.height,
                        marginHorizontal: 4,
                    },
                ]}
                onPress={() => handleSeatSelect(seat.number)}
                disabled={disabled}
            >
                {state === 'unavailable' ? (
                    <Icon name="close" size={16} color={getSeatTextColor(seat)} />
                ) : state === 'selected' ? (
                    <View style={styles.seatContent}>
                        <Text style={[styles.seatPassenger, { color: '#FFFFFF' }]}>
                            P{(passengerIndex ?? 0) + 1}
                        </Text>
                        <Text style={[styles.seatNumberSelected, { color: 'rgba(255,255,255,0.85)' }]}>
                            {seat.number}
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.seatNumber, { color: getSeatTextColor(seat) }]}>
                        {seat.number}
                    </Text>
                )}
            </Pressable>
        );
    };

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    const confirmTitle = !allSelected
        ? `Choisir ${totalPassengers - selectedSeats.size} siège${totalPassengers - selectedSeats.size > 1 ? 's' : ''}`
        : isRoundTrip && !isReturnLeg
          ? 'Continuer vers le retour'
          : 'Confirmer la sélection';

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: headerBackgroundColor,
                        borderBottomColor: headerBorderColor,
                    },
                ]}
            >
                <BackButton onPress={() => navigation.goBack()} color={iconColor} />
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>
                        Sélection des sièges
                    </Text>
                    {isRoundTrip && (
                        <Text style={[styles.headerSubtitle, { color: secondaryTextColor }]}>
                            {isReturnLeg ? 'Retour' : 'Aller'} · {selectedSeats.size}/{totalPassengers}
                        </Text>
                    )}
                    {!isRoundTrip && (
                        <Text style={[styles.headerSubtitle, { color: secondaryTextColor }]}>
                            {selectedSeats.size}/{totalPassengers} sélectionné
                            {selectedSeats.size > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <SeatMapSkeleton />
            ) : (
                <>
                    {/* Légende compacte 1 ligne */}
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendDot,
                                    {
                                        backgroundColor: availableBg,
                                        borderColor: availableBorder,
                                        borderWidth: 1.5,
                                    },
                                ]}
                            />
                            <Text style={[styles.legendLabel, { color: secondaryTextColor }]}>
                                Libre
                            </Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: primaryBlue }]} />
                            <Text style={[styles.legendLabel, { color: secondaryTextColor }]}>
                                Choisi
                            </Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: unavailableBg }]}>
                                <Icon name="close" size={10} color={secondaryTextColor} />
                            </View>
                            <Text style={[styles.legendLabel, { color: secondaryTextColor }]}>
                                Pris
                            </Text>
                        </View>
                        <Text style={[styles.layoutHint, { color: secondaryTextColor }]}>
                            {leftLayout}+{rightLayout} · {seatRows.length} rangs
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.passengerLogicHint,
                            {
                                backgroundColor:
                                    colorScheme === 'dark' ? 'rgba(23,118,186,0.12)' : 'rgba(23,118,186,0.08)',
                            },
                        ]}
                    >
                        <Icon name="account-multiple-outline" size={16} color={primaryBlue} />
                        <Text style={[styles.passengerLogicHintText, { color: secondaryTextColor }]}>
                            Un siège distinct par passager. Le siège choisi affiche P1, P2… selon
                            l’ordre des voyageurs.
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: 140 + insets.bottom },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View
                            style={[
                                styles.mapCard,
                                {
                                    backgroundColor: cardBackgroundColor,
                                    borderColor,
                                },
                            ]}
                        >
                            <View style={styles.mapOrientation}>
                                <View style={[styles.driverBadge, { backgroundColor: primaryBlue }]}>
                                    <Icon name="steering" size={14} color="#FFFFFF" />
                                </View>
                                <Text style={[styles.orientationLabel, { color: secondaryTextColor }]}>
                                    Avant
                                </Text>
                            </View>

                            <View style={[styles.mapSurface, { backgroundColor: mapSurface }]}>
                                {seatRows.map((row) => (
                                    <View key={row.rowNumber} style={styles.seatRow}>
                                        <Text style={[styles.rowIndex, { color: secondaryTextColor }]}>
                                            {row.rowNumber}
                                        </Text>

                                        <View style={styles.seatsGroup}>
                                            {row.leftSeats.map(renderSeat)}
                                        </View>

                                        <View style={styles.aisle}>
                                            <View
                                                style={[
                                                    styles.aisleLine,
                                                    {
                                                        backgroundColor: aisleColor,
                                                        height: Math.max(28, seatDimensions.height - 8),
                                                    },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.seatsGroup}>
                                            {row.rightSeats.map(renderSeat)}
                                        </View>

                                        <Text style={[styles.rowIndex, { color: secondaryTextColor }]}>
                                            {row.rowNumber}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Text style={[styles.orientationLabelBottom, { color: secondaryTextColor }]}>
                                Arrière
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Sticky : chips passagers + CTA */}
                    <View
                        style={[
                            styles.footer,
                            {
                                paddingBottom: insets.bottom + 10,
                                backgroundColor: headerBackgroundColor,
                                borderTopColor: headerBorderColor,
                            },
                        ]}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.passengerChips}
                        >
                            {Array.from({ length: totalPassengers }, (_, index) => {
                                const passenger = passengers?.[index];
                                const seatNumber = Array.from(selectedSeats.entries()).find(
                                    ([, passengerIdx]) => passengerIdx === index
                                )?.[0];
                                const hasSeat = seatNumber !== undefined;
                                const name =
                                    [passenger?.firstName, passenger?.lastName]
                                        .filter(Boolean)
                                        .join(' ') || `Passager ${index + 1}`;

                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.passengerChip,
                                            {
                                                backgroundColor: hasSeat
                                                    ? colorScheme === 'dark'
                                                        ? 'rgba(23,118,186,0.2)'
                                                        : 'rgba(23,118,186,0.1)'
                                                    : scrollBackgroundColor,
                                                borderColor: hasSeat ? primaryBlue : borderColor,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.passengerChipBadge,
                                                {
                                                    backgroundColor: hasSeat
                                                        ? primaryBlue
                                                        : availableBorder,
                                                },
                                            ]}
                                        >
                                            <Text style={styles.passengerChipBadgeText}>
                                                P{index + 1}
                                            </Text>
                                        </View>
                                        <View style={styles.passengerChipTextWrap}>
                                            <Text
                                                style={[styles.passengerChipName, { color: textColor }]}
                                                numberOfLines={1}
                                            >
                                                {name}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.passengerChipSeat,
                                                    {
                                                        color: hasSeat
                                                            ? primaryBlue
                                                            : secondaryTextColor,
                                                    },
                                                ]}
                                            >
                                                {hasSeat ? `Siège ${seatNumber}` : 'À choisir'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <AppButton
                            title={confirmTitle}
                            onPress={handleConfirm}
                            disabled={!allSelected}
                        />
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 16,
        height: 16,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    layoutHint: {
        marginLeft: 'auto',
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
    },
    passengerLogicHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    passengerLogicHintText: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 17,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    mapCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 8,
    },
    mapOrientation: {
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    driverBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orientationLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    orientationLabelBottom: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: 10,
    },
    mapSurface: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    seatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        marginVertical: 4,
    },
    rowIndex: {
        width: 24,
        textAlign: 'center',
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
    },
    seatsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aisle: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aisleLine: {
        width: 2,
        borderRadius: 1,
        opacity: 0.9,
    },
    seat: {
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    seatContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
    },
    seatNumber: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    seatNumberSelected: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Regular',
    },
    seatPassenger: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 10,
        gap: 10,
    },
    passengerChips: {
        gap: 8,
        paddingBottom: 2,
    },
    passengerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        maxWidth: 200,
    },
    passengerChipBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    passengerChipBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Ubuntu_Bold',
    },
    passengerChipTextWrap: {
        flexShrink: 1,
    },
    passengerChipName: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    passengerChipSeat: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 1,
    },
});

export default SeatSelection;
