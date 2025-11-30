// @ts-nocheck
import { getDepartureAvailableSeats } from '@/api/departure';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Interface pour un siège
 */
interface Seat {
    number: number;
    available: boolean;
    booked: boolean;
    blocked: boolean;
    locked: boolean;
    selected?: boolean;
    passengerIndex?: number;
}

/**
 * Écran de sélection de sièges avec design amélioré
 */
const SeatSelection = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Couleurs dynamiques
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#121212' : '#F5F5F5';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const primaryBlue = tintColor === '#fff' ? '#1776BA' : tintColor;

    // Récupération des paramètres
    const { 
        trip, 
        returnTrip, 
        passengers, 
        numberOfPassengers,
        currentLeg,
        onSeatsSelected 
    } = (route.params as any) || {};

    const isRoundTrip = !!returnTrip;
    const leg = currentLeg || 'OUTBOUND';
    const isReturnLeg = leg === 'RETURN';
    const currentTrip = isReturnLeg && returnTrip ? returnTrip : trip;
    const totalPassengers = numberOfPassengers ?? passengers?.length ?? 0;

    // États
    const [isLoading, setIsLoading] = useState(true);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Map<number, number>>(new Map());
    const [totalSeats, setTotalSeats] = useState(0);

    /**
     * Récupère les sièges disponibles depuis l'API
     */
    const fetchSeats = async () => {
        if (!currentTrip?.id) {
            Alert.alert('Erreur', 'Aucun trajet sélectionné');
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
                    const isAvailable = seatStatus === 'AVAILABLE';
                    const isBooked = seatStatus === 'BOOKED';
                    const isLocked = seatStatus === 'LOCKED';
                    const isBlocked = seatStatus === 'BLOCKED';
                    
                    seatsArray.push({
                        number: i,
                        available: isAvailable,
                        booked: isBooked,
                        locked: isLocked,
                        blocked: isBlocked,
                        selected: false
                    });
                }

                // Sélection automatique après le dernier siège réservé
                const initialSelections = new Map<number, number>();
                
                if (totalPassengers > 0) {
                    let lastBookedSeatNumber = 0;
                    seatsArray.forEach(seat => {
                        if (seat.booked && seat.number > lastBookedSeatNumber) {
                            lastBookedSeatNumber = seat.number;
                        }
                    });

                    let nextAvailableSeatNumber = lastBookedSeatNumber + 1;
                    
                    for (let index = 0; index < totalPassengers; index++) {
                        const passenger = passengers?.[index];
                        const passengerHasSeat = Array.from(initialSelections.values()).includes(index);
                        const passengerSeatNumber = passenger?.seatNumber;
                        
                        if (!passengerSeatNumber && !passengerHasSeat) {
                            while (nextAvailableSeatNumber <= totalSeatsCount) {
                                const seat = seatsArray.find(s => s.number === nextAvailableSeatNumber);
                                if (seat && seat.available && !seat.booked && !seat.locked && !seat.blocked && !initialSelections.has(seat.number)) {
                                    initialSelections.set(seat.number, index);
                                    nextAvailableSeatNumber++;
                                    break;
                                }
                                nextAvailableSeatNumber++;
                            }
                        }
                    }
                }

                setSelectedSeats(initialSelections);

                seatsArray.forEach(seat => {
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
            Alert.alert('Erreur', 'Une erreur est survenue');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSeats();
    }, [currentTrip?.id, leg]);

    /**
     * Gère la sélection d'un siège
     */
    const handleSeatSelect = (seatNumber: number) => {
        const seat = seats.find(s => s.number === seatNumber);
        
        // Ne peut pas sélectionner les sièges non disponibles, réservés, verrouillés ou bloqués
        if (!seat || !seat.available || seat.booked || seat.locked || seat.blocked) {
            return;
        }

        const newSelections = new Map(selectedSeats);

        if (selectedSeats.has(seatNumber)) {
            newSelections.delete(seatNumber);
            setSelectedSeats(newSelections);
            
            setSeats(prevSeats => 
                prevSeats.map(s => 
                    s.number === seatNumber 
                        ? { ...s, selected: false, passengerIndex: undefined }
                        : s
                )
            );
            return;
        }

        const passengerIndices = Array.from({ length: totalPassengers }, (_, i) => i);
        const passengersWithSeats = Array.from(selectedSeats.values());
        const targetPassengerIndex = passengerIndices.find(idx => !passengersWithSeats.includes(idx));

        if (targetPassengerIndex === undefined) {
            Alert.alert(
                'Attention',
                'Tous les passagers ont déjà un siège. Désélectionnez d\'abord un siège.'
            );
            return;
        }

        newSelections.set(seatNumber, targetPassengerIndex);
        setSelectedSeats(newSelections);

        setSeats(prevSeats => 
            prevSeats.map(s => 
                s.number === seatNumber 
                    ? { ...s, selected: true, passengerIndex: targetPassengerIndex }
                    : s
            )
        );
    };

    /**
     * Confirme la sélection
     */
    const handleConfirm = () => {
        if (selectedSeats.size < totalPassengers) {
            Alert.alert(
                'Attention',
                `Sélectionnez un siège pour tous les passagers (${selectedSeats.size}/${totalPassengers})`
            );
            return;
        }

        const seatsData = Array.from(selectedSeats.entries()).map(([seatNumber, passengerIndex]) => ({
            passengerIndex,
            seatNumber,
            leg
        }));

        if (onSeatsSelected) {
            onSeatsSelected(seatsData);
        }

        navigation.goBack();
    };

    /**
     * Récupère la disposition des sièges
     */
    const getSeatLayout = (): [number, number] => {
        const layout = currentTrip?.busSeatLayout;
        return Array.isArray(layout) && layout.length >= 2 ? [layout[0], layout[1]] : [2, 2];
    };

    /**
     * Organise les sièges en rangées
     */
    const organizeSeatsInRows = (): Array<{ leftSeats: Seat[]; rightSeats: Seat[]; rowNumber: number }> => {
        const [leftSeatsCount, rightSeatsCount] = getSeatLayout();
        const seatsPerRow = leftSeatsCount + rightSeatsCount;
        const rows: Array<{ leftSeats: Seat[]; rightSeats: Seat[]; rowNumber: number }> = [];
        
        for (let i = 0; i < seats.length; i += seatsPerRow) {
            const rowSeats = seats.slice(i, i + seatsPerRow);
            const leftSeats = rowSeats.slice(0, leftSeatsCount);
            const rightSeats = rowSeats.slice(leftSeatsCount);
            
            rows.push({ 
                leftSeats, 
                rightSeats,
                rowNumber: Math.floor(i / seatsPerRow) + 1
            });
        }
        
        return rows;
    };

    const seatRows = organizeSeatsInRows();

    /**
     * Couleur d'un siège selon son statut
     */
    const getSeatColor = (seat: Seat) => {
        if (seat.locked) return '#ffc107'; // Jaune pour verrouillé
        if (seat.blocked) return '#17a2b8'; // Cyan pour bloqué
        if (seat.booked) return colorScheme === 'dark' ? '#4A3A3A' : '#FFB3B3'; // Rouge clair pour réservé
        if (seat.selected) return primaryBlue; // Bleu pour sélectionné
        return colorScheme === 'dark' ? '#2C4A2C' : '#C8E6C9'; // Vert clair pour disponible
    };

    /**
     * Couleur du texte selon le statut du siège
     */
    const getSeatTextColor = (seat: Seat) => {
        if (seat.locked || seat.blocked) return '#000000'; // Noir pour locked et blocked
        if (seat.selected) return '#FFFFFF'; // Blanc pour sélectionné
        if (seat.booked) return '#FFFFFF'; // Blanc pour réservé
        return colorScheme === 'dark' ? '#FFFFFF' : '#000000'; // Selon le thème pour disponible
    };

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>

                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>
                        Sélection des sièges
                    </Text>
                    {isRoundTrip && (
                        <Text style={[styles.headerSubtitle, { color: secondaryTextColor }]}>
                            {isReturnLeg ? 'Retour' : 'Aller'}
                        </Text>
                    )}
                </View>

                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryBlue} />
                    <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                        Chargement des sièges...
                    </Text>
                </View>
            ) : (
                <>
                    {/* Légende */}
                    <View style={[styles.legendContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: colorScheme === 'dark' ? '#2C4A2C' : '#C8E6C9' }]} />
                            <Text style={[styles.legendText, { color: textColor }]}>Disponible</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: primaryBlue }]} />
                            <Text style={[styles.legendText, { color: textColor }]}>Sélectionné</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: colorScheme === 'dark' ? '#4A3A3A' : '#FFB3B3' }]}>
                                <Icon name="close" size={12} color="#FFFFFF" />
                            </View>
                            <Text style={[styles.legendText, { color: textColor }]}>Réservé</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#17a2b8' }]}>
                                <Icon name="close" size={12} color="#000" />
                            </View>
                            <Text style={[styles.legendText, { color: textColor }]}>Bloqué</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#ffc107' }]}>
                                <Icon name="close" size={12} color="#000" />
                            </View>
                            <Text style={[styles.legendText, { color: textColor }]}>Verrouillé</Text>
                        </View>
                    </View>

                    {/* Note explicative */}
                    <View style={[styles.infoNoteContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <Icon name="information" size={16} color={primaryBlue} />
                        <Text style={[styles.infoNoteText, { color: secondaryTextColor }]}>
                            Sélectionnez un siège distinct pour chaque passager. Le numéro du passager (P1, P2...) apparaît sur le siège sélectionné.
                        </Text>
                    </View>

                    {/* Informations passagers */}
                    <View style={[styles.passengersInfoContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <Text style={[styles.passengersInfoTitle, { color: textColor }]}>
                            Sièges sélectionnés ({selectedSeats.size}/{totalPassengers})
                        </Text>
                        {Array.from({ length: totalPassengers }, (_, index) => {
                            const passenger = passengers?.[index];
                            const seatNumber = Array.from(selectedSeats.entries())
                                .find(([_, passengerIdx]) => passengerIdx === index)?.[0];
                            const hasSeat = seatNumber !== undefined;
                            
                            return (
                                <View key={index} style={styles.passengerSeatInfo}>
                                    <Text style={[styles.passengerSeatText, { color: textColor }]}>
                                        Passager {index + 1}: {passenger?.firstName || ''} {passenger?.lastName || ''}
                                    </Text>
                                    <Text style={[
                                        styles.passengerSeatStatus, 
                                        { color: hasSeat ? '#4CAF50' : secondaryTextColor }
                                    ]}>
                                        {hasSeat ? `✓ Siège ${seatNumber}` : 'En attente'}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Grille des sièges */}
                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header du plan de bus */}
                        <View style={[styles.busHeaderInfo, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            <Text style={[styles.busHeaderTitle, { color: primaryBlue }]}>Plan du Bus</Text>
                            <View style={styles.busHeaderDetails}>
                                <Text style={[styles.busHeaderDetailText, { color: secondaryTextColor }]}>
                                    {seatRows.length} rangées
                                </Text>
                                <Text style={[styles.busHeaderDetailText, { color: secondaryTextColor }]}>
                                    {getSeatLayout()[0]}+{getSeatLayout()[1]} sièges
                                </Text>
                            </View>
                        </View>

                        {/* Représentation du bus stylisée */}
                        <View style={[styles.busVisualContainer, { backgroundColor: primaryBlue }]}>
                            {/* Avant du bus arrondi */}
                            <View style={styles.busFrontRounded}>
                                <View style={[styles.busFrontWindow, { borderColor: 'rgba(255,255,255,0.3)' }]} />
                                <View style={[styles.busWindshield, { borderColor: 'rgba(255,255,255,0.3)' }]} />
                            </View>

                            {/* Zone des sièges */}
                            <View style={[styles.busSeatsArea, { backgroundColor: cardBackgroundColor }]}>
                               

                                {seatRows.map((row, rowIndex) => (
                                    <View key={rowIndex} style={styles.seatRowWithNumbers}>
                                        {/* Numéro de rangée gauche */}
                                        <View style={styles.rowNumberContainer}>
                                            <Text style={[styles.rowNumber, { color: primaryBlue }]}>
                                                {row.rowNumber}
                                            </Text>
                                        </View>

                                        {/* Sièges gauche */}
                                        <View style={styles.seatsGroup}>
                                            {row.leftSeats.map((seat) => (
                                                <Pressable
                                                    key={seat.number}
                                                    style={[
                                                        styles.seat,
                                                        {
                                                            backgroundColor: getSeatColor(seat),
                                                            borderColor: seat.selected ? primaryBlue : 'transparent',
                                                            borderWidth: seat.selected ? 2 : 0,
                                                        }
                                                    ]}
                                                    onPress={() => handleSeatSelect(seat.number)}
                                                    disabled={seat.booked || seat.locked || seat.blocked}
                                                >
                                                    {(seat.booked || seat.locked || seat.blocked) ? (
                                                        <Icon 
                                                            name="close" 
                                                            size={16} 
                                                            color={seat.locked || seat.blocked ? '#000000' : '#FFFFFF'} 
                                                        />
                                                    ) : seat.selected ? (
                                                        <View style={styles.seatContent}>
                                                            <Text style={[styles.seatNumber, { color: getSeatTextColor(seat) }]}>
                                                                {seat.number}
                                                            </Text>
                                                            <Text style={[styles.passengerNumber, { color: getSeatTextColor(seat) }]}>
                                                                P{seat.passengerIndex !== undefined ? seat.passengerIndex + 1 : ''}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={[styles.seatNumber, { color: getSeatTextColor(seat) }]}>
                                                            {seat.number}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            ))}
                                        </View>

                                        {/* Allée - Vide, juste pour l'espacement */}
                                        <View style={styles.aisle} />

                                        {/* Sièges droite */}
                                        <View style={styles.seatsGroup}>
                                            {row.rightSeats.map((seat) => (
                                                <Pressable
                                                    key={seat.number}
                                                    style={[
                                                        styles.seat,
                                                        {
                                                            backgroundColor: getSeatColor(seat),
                                                            borderColor: seat.selected ? primaryBlue : 'transparent',
                                                            borderWidth: seat.selected ? 2 : 0,
                                                        }
                                                    ]}
                                                    onPress={() => handleSeatSelect(seat.number)}
                                                    disabled={seat.booked || seat.locked || seat.blocked}
                                                >
                                                    {(seat.booked || seat.locked || seat.blocked) ? (
                                                        <Icon 
                                                            name="close" 
                                                            size={16} 
                                                            color={seat.locked || seat.blocked ? '#000000' : '#FFFFFF'} 
                                                        />
                                                    ) : seat.selected ? (
                                                        <View style={styles.seatContent}>
                                                            <Text style={[styles.seatNumber, { color: getSeatTextColor(seat) }]}>
                                                                {seat.number}
                                                            </Text>
                                                            <Text style={[styles.passengerNumber, { color: getSeatTextColor(seat) }]}>
                                                                P{seat.passengerIndex !== undefined ? seat.passengerIndex + 1 : ''}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={[styles.seatNumber, { color: getSeatTextColor(seat) }]}>
                                                            {seat.number}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            ))}
                                        </View>

                                        {/* Numéro de rangée droite */}
                                        <View style={styles.rowNumberContainer}>
                                            <Text style={[styles.rowNumber, { color: primaryBlue }]}>
                                                {row.rowNumber}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Arrière du bus arrondi */}
                            <View style={styles.busBackRounded} />
                        </View>
                    </ScrollView>

                    {/* Bouton de confirmation */}
                    <View style={[
                        styles.fixedButtonContainer,
                        {
                            paddingBottom: insets.bottom + 8,
                            backgroundColor: headerBackgroundColor,
                            borderTopColor: headerBorderColor
                        }
                    ]}>
                        <Pressable
                            style={[styles.confirmButton, { backgroundColor: primaryBlue }]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>
                                {isRoundTrip && !isReturnLeg 
                                    ? 'Continuer vers le retour' 
                                    : 'Confirmer la sélection'}
                            </Text>
                        </Pressable>
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
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
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
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        borderWidth: 1,
        gap: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendColor: {
        width: 20,
        height: 20,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    legendText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    infoNoteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
    },
    infoNoteText: {
        flex: 1,
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 16,
    },
    passengersInfoContainer: {
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    passengersInfoTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    passengerSeatInfo: {
        marginTop: 4,
    },
    passengerSeatText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    passengerSeatStatus: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    busHeaderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    busHeaderTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    busHeaderDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    busHeaderDetailText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    busVisualContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    busFrontRounded: {
        height: 80,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    busFrontWindow: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 2,
        marginBottom: 8,
    },
    busWindshield: {
        width: '80%',
        height: 30,
        borderTopLeftRadius: 60,
        borderTopRightRadius: 60,
        borderWidth: 2,
        borderBottomWidth: 0,
    },
    busSeatsArea: {
        padding: 16,
    },
    aisleIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    aisleIndicatorSpacer: {
        width: 30,
    },
    aisleIndicator: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aisleIndicatorText: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Bold',
        letterSpacing: 1,
    },
    seatRowWithNumbers: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    rowNumberContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowNumber: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    seatsGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    aisle: {
        width: 50,
    },
    seat: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    seatContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    seatNumber: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    passengerNumber: {
        fontSize: 10,
        fontFamily: 'Ubuntu_Medium',
        marginTop: 2,
    },
    busBackRounded: {
        height: 40,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    fixedButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    confirmButton: {
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});

export default SeatSelection;