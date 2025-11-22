// @ts-nocheck
import { getDepartureAvailableSeats } from '@/api/departure';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Trip } from '@/types';
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
    selected?: boolean;
    passengerIndex?: number;
}

/**
 * Écran de sélection de sièges
 * Permet de sélectionner les sièges pour chaque passager
 */
const SeatSelection = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    // Récupération des données passées en paramètre
    const { 
        trip, 
        returnTrip, 
        passengers, 
        numberOfPassengers,
        currentLeg,
        onSeatsSelected 
    } = (route.params as {
        trip?: Trip;
        returnTrip?: Trip;
        passengers?: Array<{
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
            seatNumber: number | null;
            passengerType: string;
        }>;
        numberOfPassengers?: number; // Nombre explicite de passagers
        currentLeg?: 'OUTBOUND' | 'RETURN';
        onSeatsSelected?: (seats: Array<{ passengerIndex: number; seatNumber: number; leg: 'OUTBOUND' | 'RETURN' }>) => void;
    }) || {};

    const isRoundTrip = !!returnTrip;
    const leg = currentLeg || 'OUTBOUND';
    const isReturnLeg = leg === 'RETURN';
    const currentTrip = isReturnLeg && returnTrip ? returnTrip : trip;
    
    // Déterminer le nombre de passagers (priorité au paramètre explicite, sinon la longueur du tableau)
    const totalPassengers = numberOfPassengers ?? passengers?.length ?? 0;

    // États
    const [isLoading, setIsLoading] = useState(true);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Map<number, number>>(new Map()); // Map<seatNumber, passengerIndex>
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
            console.log('response seats: ', response.data);
            if (response.status === 200 && response.data) {
                // Formatage des sièges depuis la réponse API
                // La structure peut varier selon l'API, on s'adapte
                const seatsData = response.data.seats || response.data || [];
                const totalSeatsCount = response.data.totalSeats || currentTrip.totalSeats || 50;
                
                setTotalSeats(totalSeatsCount);

                // Créer un tableau de sièges
                const seatsArray: Seat[] = [];
                for (let i = 1; i <= totalSeatsCount; i++) {
                    const seatData = Array.isArray(seatsData) 
                        ? seatsData.find((s: any) => s.number === i || s.seatNumber === i)
                        : seatsData[i];
                    
                    // Déterminer la disponibilité en fonction du status
                    // Seuls les sièges avec le statut AVAILABLE peuvent être sélectionnés
                    const seatStatus = seatData?.status?.toUpperCase() || 'AVAILABLE';
                    const isAvailable = seatStatus === 'AVAILABLE';
                    const isBooked = seatStatus === 'BOOKED' || seatStatus === 'LOCKED' || seatStatus === 'BLOCKED';
                    
                    seatsArray.push({
                        number: i,
                        available: isAvailable,
                        booked: isBooked,
                        selected: false
                    });
                }

                // Pré-remplir les sièges déjà sélectionnés pour les passagers
                const initialSelections = new Map<number, number>();
                passengers?.forEach((passenger, index) => {
                    if (passenger.seatNumber) {
                        initialSelections.set(passenger.seatNumber, index);
                    }
                });

                /**
                 * Attribue automatiquement les sièges AVAILABLE juste après les sièges non AVAILABLE
                 * pour les passagers qui n'ont pas encore de siège assigné.
                 * L'utilisateur pourra toujours cliquer pour choisir un autre siège.
                 * La sélection est fonction du nombre de passagers
                 */
                if (totalPassengers > 0) {
                    // Trouver le dernier siège non AVAILABLE (BOOKED/LOCKED/BLOCKED)
                    let lastBookedSeatNumber = 0;
                    seatsArray.forEach(seat => {
                        if (seat.booked && seat.number > lastBookedSeatNumber) {
                            lastBookedSeatNumber = seat.number;
                        }
                    });

                    // Attribuer automatiquement les sièges AVAILABLE qui viennent juste après
                    // Commencer à partir du siège suivant le dernier siège non disponible
                    let nextAvailableSeatNumber = lastBookedSeatNumber + 1;
                    
                    // Parcourir tous les passagers (de 0 à totalPassengers-1)
                    for (let index = 0; index < totalPassengers; index++) {
                        const passenger = passengers?.[index];
                        // Vérifier si le passager a déjà un siège assigné
                        const passengerHasSeat = Array.from(initialSelections.values()).includes(index);
                        const passengerSeatNumber = passenger?.seatNumber;
                        
                        if (!passengerSeatNumber && !passengerHasSeat) {
                            // Trouver le prochain siège AVAILABLE disponible
                            while (nextAvailableSeatNumber <= totalSeatsCount) {
                                const seat = seatsArray.find(s => s.number === nextAvailableSeatNumber);
                                // Vérifier que le siège est disponible et n'est pas déjà sélectionné
                                if (seat && seat.available && !seat.booked && !initialSelections.has(seat.number)) {
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

                // Marquer les sièges sélectionnés
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
            console.error('Erreur lors de la récupération des sièges:', error);
            Alert.alert(
                'Erreur',
                error?.response?.data?.message || 'Une erreur est survenue lors de la récupération des sièges'
            );
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
     * Seuls les sièges avec le statut AVAILABLE peuvent être sélectionnés
     * Permet de sélectionner un siège distinct pour chaque passager
     * La sélection est fonction du nombre de passagers
     */
    const handleSeatSelect = (seatNumber: number) => {
        const seat = seats.find(s => s.number === seatNumber);
        
        // Ne peut sélectionner que les sièges disponibles (statut AVAILABLE)
        if (!seat || !seat.available || seat.booked) {
            return;
        }

        // Utiliser le nombre total de passagers déterminé
        const newSelections = new Map(selectedSeats);

        // Si le siège est déjà sélectionné par un passager, on le désélectionne
        if (selectedSeats.has(seatNumber)) {
            const currentPassengerIndex = selectedSeats.get(seatNumber)!;
            
            // Désélectionner le siège
            newSelections.delete(seatNumber);
            setSelectedSeats(newSelections);
            
            // Mettre à jour l'état visuel
            setSeats(prevSeats => 
                prevSeats.map(s => 
                    s.number === seatNumber 
                        ? { ...s, selected: false, passengerIndex: undefined }
                        : s
                )
            );
            return;
        }

        // Trouver le prochain passager sans siège
        // On parcourt tous les passagers (de 0 à totalPassengers-1) pour trouver celui qui n'a pas encore de siège
        const passengerIndices = Array.from({ length: totalPassengers }, (_, i) => i);
        const passengersWithSeats = Array.from(selectedSeats.values());
        const targetPassengerIndex = passengerIndices.find(idx => !passengersWithSeats.includes(idx));

        // Si tous les passagers ont déjà un siège, on ne permet pas de sélectionner un nouveau siège
        // L'utilisateur doit d'abord désélectionner un siège existant
        if (targetPassengerIndex === undefined) {
            Alert.alert(
                'Attention',
                `Tous les passagers ont déjà un siège assigné. Veuillez d'abord désélectionner un siège pour en choisir un autre.`
            );
            return;
        }

        // Sélectionner le nouveau siège pour ce passager
        newSelections.set(seatNumber, targetPassengerIndex);
        setSelectedSeats(newSelections);

        // Mettre à jour l'état visuel du nouveau siège
        setSeats(prevSeats => 
            prevSeats.map(s => 
                s.number === seatNumber 
                    ? { ...s, selected: true, passengerIndex: targetPassengerIndex }
                    : s
            )
        );
    };

    /**
     * Confirme la sélection des sièges
     * Vérifie que tous les passagers ont un siège assigné
     */
    const handleConfirm = () => {
        // Vérifier que le nombre de sièges sélectionnés correspond au nombre de passagers
        if (selectedSeats.size < totalPassengers) {
            Alert.alert(
                'Attention',
                `Veuillez sélectionner un siège pour tous les passagers (${selectedSeats.size}/${totalPassengers})`
            );
            return;
        }

        // Vérifier que chaque passager (de 0 à totalPassengers-1) a un siège
        const missingPassengers: number[] = [];
        for (let i = 0; i < totalPassengers; i++) {
            const hasSeat = Array.from(selectedSeats.values()).includes(i);
            if (!hasSeat) {
                missingPassengers.push(i + 1);
            }
        }

        if (missingPassengers.length > 0) {
            Alert.alert(
                'Attention',
                `Veuillez sélectionner un siège pour les passagers suivants : ${missingPassengers.join(', ')}`
            );
            return;
        }

        // Formater les sièges sélectionnés
        const seatsData = Array.from(selectedSeats.entries()).map(([seatNumber, passengerIndex]) => ({
            passengerIndex,
            seatNumber,
            leg
        }));

        // Appeler le callback si fourni
        if (onSeatsSelected) {
            onSeatsSelected(seatsData);
        }

        navigation.goBack();
    };

    /**
     * Récupère la disposition des sièges depuis le trip
     * @returns [nombreSiègesGauche, nombreSiègesDroite] ou [2, 2] par défaut
     */
    const getSeatLayout = (): [number, number] => {
        // Récupérer busSeatLayout depuis le trip actuel
        const layout = currentTrip?.busSeatLayout;
        
        if (Array.isArray(layout) && layout.length >= 2) {
            return [layout[0], layout[1]];
        }
        
        // Disposition par défaut : 2 sièges à gauche, 2 sièges à droite
        return [2, 2];
    };

    /**
     * Organise les sièges en rangées selon la disposition du bus
     * @returns Tableau de rangées, chaque rangée contient [siègesGauche[], siègesDroite[]]
     */
    const organizeSeatsInRows = (): Array<{ leftSeats: Seat[]; rightSeats: Seat[] }> => {
        const [leftSeatsCount, rightSeatsCount] = getSeatLayout();
        const seatsPerRow = leftSeatsCount + rightSeatsCount;
        const rows: Array<{ leftSeats: Seat[]; rightSeats: Seat[] }> = [];
        
        for (let i = 0; i < seats.length; i += seatsPerRow) {
            const rowSeats = seats.slice(i, i + seatsPerRow);
            const leftSeats = rowSeats.slice(0, leftSeatsCount);
            const rightSeats = rowSeats.slice(leftSeatsCount, leftSeatsCount + rightSeatsCount);
            
            rows.push({ leftSeats, rightSeats });
        }
        
        return rows;
    };

    const seatRows = organizeSeatsInRows();

    /**
     * Obtient la couleur d'un siège selon son état
     */
    const getSeatColor = (seat: Seat) => {
        if (seat.booked) {
            return colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0'; // Gris pour réservé
        }
        if (seat.selected) {
            return '#1776BA'; // Bleu de base pour sélectionné (conservé en mode sombre)
        }
        return colorScheme === 'dark' ? '#2C2C2E' : '#F0F0F0'; // Gris clair pour disponible
    };

    /**
     * Obtient la couleur du texte d'un siège
     */
    const getSeatTextColor = (seat: Seat) => {
        if (seat.booked) {
            return secondaryTextColor;
        }
        if (seat.selected) {
            return '#FFFFFF';
        }
        return textColor;
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
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
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
                    <ActivityIndicator size="large" color={tintColor} />
                    <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                        Chargement des sièges...
                    </Text>
                </View>
            ) : (
                <>
                    {/* Légende */}
                    <View style={[styles.legendContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: getSeatColor({ number: 0, available: true, booked: false, selected: false }) }]} />
                            <Text style={[styles.legendText, { color: textColor }]}>Disponible</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#1776BA' }]} />
                            <Text style={[styles.legendText, { color: textColor }]}>Sélectionné</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: getSeatColor({ number: 0, available: false, booked: true, selected: false }) }]}>
                                <Icon name="close" size={12} color={secondaryTextColor} />
                            </View>
                            <Text style={[styles.legendText, { color: textColor }]}>Indisponible</Text>
                        </View>
                    </View>

                    {/* Note explicative */}
                    <View style={[styles.infoNoteContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <Icon name="information" size={16} color={tintColor} />
                        <Text style={[styles.infoNoteText, { color: secondaryTextColor }]}>
                            Sélectionnez un siège distinct pour chaque passager. Le numéro du passager (P1, P2...) apparaît sur le siège sélectionné.
                        </Text>
                    </View>

                    {/* Informations sur les passagers */}
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
                                        {hasSeat ? `✓ Siège ${seatNumber}` : '⏳ En attente de sélection'}
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
                        {/* Représentation du bus */}
                        <View style={[styles.busContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            {/* Avant du bus */}
                            <View style={styles.busFront}>
                                <Icon name="car" size={30} color={secondaryTextColor} />
                                <Text style={[styles.busFrontText, { color: secondaryTextColor }]}>Avant</Text>
                            </View>

                            {/* Allée */}
                            <View style={styles.aisle} />

                            {/* Rangées de sièges */}
                            {seatRows.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.seatRow}>
                                    {/* Sièges gauche */}
                                    <View style={styles.seatsGroup}>
                                        {row.leftSeats.map((seat) => (
                                            <Pressable
                                                key={seat.number}
                                                style={[
                                                    styles.seat,
                                                    {
                                                        backgroundColor: getSeatColor(seat),
                                                        borderColor: seat.selected ? '#1776BA' : borderColor
                                                    }
                                                ]}
                                                onPress={() => handleSeatSelect(seat.number)}
                                                disabled={seat.booked}
                                            >
                                                {seat.booked ? (
                                                    <Icon name="close" size={16} color={secondaryTextColor} />
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

                                    {/* Allée */}
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
                                                        borderColor: seat.selected ? '#1776BA' : borderColor
                                                    }
                                                ]}
                                                onPress={() => handleSeatSelect(seat.number)}
                                                disabled={seat.booked}
                                            >
                                                {seat.booked ? (
                                                    <Icon name="close" size={16} color={secondaryTextColor} />
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
                                </View>
                            ))}

                            {/* Arrière du bus */}
                            <View style={styles.busBack}>
                                <Icon name="car-back" size={30} color={secondaryTextColor} />
                                <Text style={[styles.busBackText, { color: secondaryTextColor }]}>Arrière</Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Bouton de confirmation */}
                    <View style={[
                        styles.fixedButtonContainer,
                        {
                            paddingBottom: insets.bottom + 8,
                            paddingTop: 15,
                            backgroundColor: headerBackgroundColor,
                            borderTopColor: headerBorderColor
                        }
                    ]}>
                        <Pressable
                            style={[styles.confirmButton, { backgroundColor: '#1776BA' }]}
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
        justifyContent: 'space-around',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        borderWidth: 1,
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
    busContainer: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    busFront: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        marginBottom: 16,
    },
    busFrontText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 4,
    },
    busBack: {
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        marginTop: 16,
    },
    busBackText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 4,
    },
    seatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 5,
    },
    seatsGroup: {
        flexDirection: 'row',
        gap: 5,
        flex: 1,
    },
    aisle: {
        width: 50,
        height: 50,
    },
    seat: {
        width: 50,
        height: 50,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
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

