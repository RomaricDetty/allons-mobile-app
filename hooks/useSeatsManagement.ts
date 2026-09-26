import { useState, useCallback, useEffect } from 'react';
import { getDepartureAvailableSeats } from '@/api/departure';
import { Trip } from '@/types';
import { showAlert } from '@/utils/alert';

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

                    // Préserver les sièges déjà choisis
                    currentPassengers.forEach((passenger, index) => {
                        const existing =
                            leg === 'OUTBOUND'
                                ? passenger?.seatNumber
                                : passenger?.seatNumberReturn;
                        if (existing != null && existing > 0) {
                            initialSelections.set(existing, index);
                        }
                    });

                    // Sièges réellement libres, dans l’ordre du plan (pas « après le dernier réservé »)
                    const availableSeatNumbers = seatsArray
                        .filter(
                            (s) =>
                                s.available &&
                                !s.booked &&
                                !s.locked &&
                                !s.blocked &&
                                !initialSelections.has(s.number)
                        )
                        .map((s) => s.number)
                        .sort((a, b) => a - b);

                    let availableIdx = 0;
                    for (let index = 0; index < currentPassengers.length; index++) {
                        const passenger = currentPassengers[index];
                        const existing =
                            leg === 'OUTBOUND'
                                ? passenger?.seatNumber
                                : passenger?.seatNumberReturn;

                        if (existing != null && existing > 0) continue;

                        if (availableIdx < availableSeatNumbers.length) {
                            initialSelections.set(availableSeatNumbers[availableIdx], index);
                            availableIdx += 1;
                        }
                    }

                    const newlyAssigned = Array.from(initialSelections.entries()).filter(
                        ([seatNumber, passengerIndex]) => {
                            const passenger = currentPassengers[passengerIndex];
                            const existing =
                                leg === 'OUTBOUND'
                                    ? passenger?.seatNumber
                                    : passenger?.seatNumberReturn;
                            return existing !== seatNumber;
                        }
                    );

                    if (newlyAssigned.length > 0 || initialSelections.size > 0) {
                        const updatedPassengers = currentPassengers.map((p) => ({ ...p }));
                        let didAssign = false;
                        initialSelections.forEach((passengerIndex, seatNumber) => {
                            if (!updatedPassengers[passengerIndex]) return;
                            if (leg === 'OUTBOUND') {
                                if (updatedPassengers[passengerIndex].seatNumber !== seatNumber) {
                                    didAssign = true;
                                }
                                updatedPassengers[passengerIndex].seatNumber = seatNumber;
                            } else {
                                if (
                                    updatedPassengers[passengerIndex].seatNumberReturn !==
                                    seatNumber
                                ) {
                                    didAssign = true;
                                }
                                updatedPassengers[passengerIndex].seatNumberReturn = seatNumber;
                            }
                        });
                        seatsAssigned = didAssign || newlyAssigned.length > 0;
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
            showAlert('Erreur', 'Aucun passager à assigner');
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
