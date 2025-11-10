import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { FormField } from './FormField';
import { PhoneField } from './PhoneField';
import { SectionHeader } from './SectionHeader';
import { SelectField } from './SelectField';

interface Passenger {
    firstName: string;
    lastName: string;
    phone: string;
    seatNumber: number | null;
    passengerType: string;
}

interface PassengersInfoBlockProps {
    passengers: Passenger[];
    contactEmail: string;
    onUpdatePassenger: (index: number, field: string, value: string | number) => void;
    onUpdateContactEmail: (email: string) => void;
    onOpenBottomSheet: (
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{value: string, label: string}>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => void;
}

/**
 * Bloc pour les informations du (des) passager(s)
 */
export const PassengersInfoBlock = ({
    passengers,
    contactEmail,
    onUpdatePassenger,
    onUpdateContactEmail,
    onOpenBottomSheet
}: PassengersInfoBlockProps) => {
    return (
        <View>
            <SectionHeader number={1} title="Informations du passager" />

            {passengers.map((passenger, index) => (
                <View key={index} style={styles.passengerSection}>
                    <View style={styles.passengerHeader}>
                        <Text style={styles.passengerTitle}>
                            Passager {passengers.length > 1 ? index + 1 : ''}
                        </Text>
                        <View style={styles.badgesContainer}>
                            {index === 0 ? (
                                <Badge text="Principal" color="#1776BA" />
                            ) : (
                                <Badge text="Accompagnant" color="#1776BA" />
                            )}
                        </View>
                    </View>

                    <FormField
                        label="Prénom"
                        value={passenger.firstName}
                        onChangeText={(text) => onUpdatePassenger(index, 'firstName', text)}
                        placeholder="Entrez le prénom"
                        required
                    />

                    <FormField
                        label="Nom"
                        value={passenger.lastName}
                        onChangeText={(text) => onUpdatePassenger(index, 'lastName', text)}
                        placeholder="Entrez le nom"
                        required
                    />

                    <PhoneField
                        label="Téléphone"
                        value={passenger.phone}
                        onChangeText={(text) => onUpdatePassenger(index, 'phone', text)}
                        required
                    />

                    <FormField
                        label="Email (optionnel)"
                        value={contactEmail}
                        onChangeText={onUpdateContactEmail}
                        placeholder="exemple@email.com"
                        keyboardType="email-address"
                    />

                    <SelectField
                        label="Type de passager"
                        value={passenger.passengerType}
                        placeholder="Sélectionner un type"
                        required
                        selectionType="passengerType"
                        options={[{value: 'adult', label: 'Adulte'}, {value: 'child', label: 'Enfant'}, {value: 'senior', label: 'Senior'}]}
                        onSelect={(value) => onUpdatePassenger(index, 'passengerType', value)}
                        onOpenBottomSheet={onOpenBottomSheet}
                    />

                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    passengerSection: {
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    passengerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    passengerTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginRight: 8,
    },
    badgesContainer: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
});

