import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppColors } from '@/hooks/use-app-colors';
import { PassengerCard } from './PassengerCard';

interface Passenger {
    id?: string;
    firstName: string;
    lastName: string;
    seatNumber: string;
    price: string;
    status?: string;
    isMainPassenger?: boolean;
}

interface PassengerSelectionProps {
    passengers: Passenger[];
    selectedPassengers: string[];
    activePassengersCount: number;
    currency: string;
    isPassengerCancelled: (passenger: Passenger) => boolean;
    onToggleSelection: (passengerId: string) => void;
    onSelectAll: () => void;
}

/**
 * Section de sélection des passagers
 */
export const PassengerSelection: React.FC<PassengerSelectionProps> = ({
    passengers,
    selectedPassengers,
    activePassengersCount,
    currency,
    isPassengerCancelled,
    onToggleSelection,
    onSelectAll,
}) => {
    const colors = useAppColors();

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text }]}>
                    Passagers de la réservation
                </Text>
                {selectedPassengers.length < activePassengersCount && (
                    <Pressable onPress={onSelectAll}>
                        <Text style={[styles.selectAllText, { color: colors.activeTabColor }]}>
                            Tout sélectionner
                        </Text>
                    </Pressable>
                )}
            </View>

            <Text style={[styles.helperText, { color: colors.secondaryText }]}>
                Sélectionnez les passagers à annuler
            </Text>

            {passengers.map((passenger, index) => {
                const passengerId = passenger.id || `passenger-${index}`;
                const isSelected = selectedPassengers.includes(passengerId);
                const isCancelled = isPassengerCancelled(passenger);

                return (
                    <PassengerCard
                        key={passengerId}
                        passenger={passenger}
                        passengerId={passengerId}
                        isSelected={isSelected}
                        isCancelled={isCancelled}
                        currency={currency}
                        onPress={onToggleSelection}
                    />
                );
            })}

            <View style={[styles.countBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.countText, { color: colors.text }]}>
                    <Text style={{ fontFamily: 'Ubuntu_Bold' }}>{selectedPassengers.length}</Text> passager(s) sélectionné(s) sur {activePassengersCount} actif(s)
                </Text>
                {activePassengersCount < passengers.length && (
                    <Text style={[styles.helperText, { color: colors.secondaryText, marginTop: 4 }]}>
                        {passengers.length - activePassengersCount} passager(s) déjà annulé(s)
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    selectAllText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    helperText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 12,
    },
    countBox: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    countText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
});
