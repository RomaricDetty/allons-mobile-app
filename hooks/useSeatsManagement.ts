import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { getDepartureAvailableSeats } from '@/api/departure';
import { Trip } from '@/types';

interface Passenger {
    seatNumber: number | null;
    seatNumberReturn: number | null;
    [key: string]: any;
}

/**
 * Hook pour gérer l'attribution et la sélection des sièges
 */
export const useSeatsManagement = (
    trip: Trip | undefined,
    returnTrip: Trip | undefined,
    passengers: Passenger[],
    setPassengers: (passengers: Passenger[]) => void,
    isRoundTrip: boolean,
    navigation: any
) => {
    const [seatsAutoAssigned, setSeatsAutoAssigned] = useState(false);

    /**
     * Attribue automatiquement les sièges disponibles
     */
    const assignSeatsAutomatically = useCallback(async (leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND'): Promise<boolean> => {
        const currentTripForLeg = leg === 'OUTBOUND' ? trip : returnTrip;

        if (!currentTripForLeg?.id || !passengers || passengers.length === 0) return false;

        try {
            const response = await getDepartureAvailableSeats(currentTripForLeg.id);

            if (response.status === 200 && response.data) {
                const seatsData = response.data.seats || response.data || [];
                const totalSeatsCount = response.data.totalSeats || currentTripForLeg.totalSeats || 50;

                const seatsArray: Array<{
                    number: number;
                    available: boolean;
                    booked: boolean;
                    blocked: boolean;
                    locked: boolean;
                }> = [];

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
                        blocked: seatStatus === 'BLOCKED'
                    });
                }

                let seatsAssigned = false;

                setPassengers(currentPassengers => {
                    if (currentPassengers.length === 0) return currentPassengers;

                    const initialSelections = new Map<number, number>();
                    let lastBookedSeatNumber = 0;

                    seatsArray.forEach(seat => {
                        if (seat.booked && seat.number > lastBookedSeatNumber) {
                            lastBookedSeatNumber = seat.number;
                        }
                    });

                    let nextAvailableSeatNumber = lastBookedSeatNumber + 1;

                    for (let index = 0; index < currentPassengers.length; index++) {
                        const passenger = currentPassengers[index];
                        const passengerSeatNumber = leg === 'OUTBOUND'
                            ? passenger?.seatNumber
                            : passenger?.seatNumberReturn;

                        if (!passengerSeatNumber) {
                            while (nextAvailableSeatNumber <= totalSeatsCount) {
                                const seat = seatsArray.find(s => s.number === nextAvailableSeatNumber);
                                if (seat && seat.available && !initialSelections.has(seat.number)) {
                                    initialSelections.set(seat.number, index);
                                    nextAvailableSeatNumber++;
                                    break;
                                }
                                nextAvailableSeatNumber++;
                            }
                        }
                    }

                    if (initialSelections.size > 0) {
                        seatsAssigned = true;
                        const updatedPassengers = [...currentPassengers];
                        initialSelections.forEach((passengerIndex, seatNumber) => {
                            if (updatedPassengers[passengerIndex]) {
                                if (leg === 'OUTBOUND') {
                                    updatedPassengers[passengerIndex].seatNumber = seatNumber;
                                } else {
                                    updatedPassengers[passengerIndex].seatNumberReturn = seatNumber;
                                }
                            }
                        });
                        return updatedPassengers;
                    }

                    return currentPassengers;
                });

                return seatsAssigned;
            }
            return false;
        } catch (error: any) {
            console.error('Erreur attribution automatique sièges:', error);
            return false;
        }
    }, [trip, returnTrip, passengers, setPassengers]);

    /**
     * Ouvre l'écran de sélection manuelle des sièges
     */
    const openSeatSelection = useCallback((leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND') => {
        if (!passengers || passengers.length === 0) {
            Alert.alert('Erreur', 'Aucun passager à assigner');
            return;
        }

        const passengersForLeg = passengers.map(p => ({
            ...p,
            seatNumber: leg === 'OUTBOUND' ? p.seatNumber : p.seatNumberReturn
        }));

        navigation.navigate('trip/seat-selection' as any, {
            trip,
            returnTrip,
            passengers: passengersForLeg,
            numberOfPassengers: passengers.length,
            currentLeg: leg,
            onSeatsSelected: (seatsData: Array<{ passengerIndex: number; seatNumber: number; leg: 'OUTBOUND' | 'RETURN' }>) => {
                const updatedPassengers = [...passengers];
                seatsData.forEach(({ passengerIndex, seatNumber }) => {
                    if (updatedPassengers[passengerIndex]) {
                        if (leg === 'OUTBOUND') {
                            updatedPassengers[passengerIndex].seatNumber = seatNumber;
                        } else {
                            updatedPassengers[passengerIndex].seatNumberReturn = seatNumber;
                        }
                    }
                });
                setPassengers(updatedPassengers);
            }
        });
    }, [trip, returnTrip, passengers, navigation, setPassengers]);

    // Attribution automatique au montage
    useEffect(() => {
        if (passengers && passengers.length > 0 && trip && !seatsAutoAssigned) {
            const hasSeatsAssigned = passengers.some(p =>
                p.seatNumber !== null || p.seatNumberReturn !== null
            );

            if (!hasSeatsAssigned) {
                const timer = setTimeout(async () => {
                    const outboundAssigned = await assignSeatsAutomatically('OUTBOUND');

                    if (isRoundTrip && returnTrip) {
                        await assignSeatsAutomatically('RETURN');
                    }

                    if (outboundAssigned) {
                        setSeatsAutoAssigned(true);
                    }
                }, 500);

                return () => clearTimeout(timer);
            } else {
                setSeatsAutoAssigned(true);
            }
        }
    }, [passengers, trip, seatsAutoAssigned, assignSeatsAutomatically, isRoundTrip, returnTrip]);

    return {
        assignSeatsAutomatically,
        openSeatSelection
    };
};
