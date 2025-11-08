import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FormField } from './FormField';
import { PhoneField } from './PhoneField';
import { SectionHeader } from './SectionHeader';
import { SelectField } from './SelectField';

interface EmergencyContact {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    relation: string;
}

interface EmergencyContactBlockProps {
    emergencyContact: EmergencyContact;
    onUpdateEmergencyContact: (field: string, value: string) => void;
    onOpenBottomSheet: (
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{value: string, label: string}>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => void;
}

/**
 * Bloc pour le contact d'urgence
 */
export const EmergencyContactBlock = ({
    emergencyContact,
    onUpdateEmergencyContact,
    onOpenBottomSheet
}: EmergencyContactBlockProps) => {
    return (
        <View style={styles.emergencyContactSection}>
            <SectionHeader number={2} title="Contact d'urgence" />

            <FormField
                label="Prénom"
                value={emergencyContact.firstName}
                onChangeText={(text) => onUpdateEmergencyContact('firstName', text)}
                placeholder="Entrez le prénom"
                required
            />

            <FormField
                label="Nom"
                value={emergencyContact.lastName}
                onChangeText={(text) => onUpdateEmergencyContact('lastName', text)}
                placeholder="Entrez le nom"
                required
            />

            <PhoneField
                label="Téléphone"
                value={emergencyContact.phone}
                onChangeText={(text) => onUpdateEmergencyContact('phone', text)}
                required
            />

            <FormField
                label="Email (optionnel)"
                value={emergencyContact.email}
                onChangeText={(text) => onUpdateEmergencyContact('email', text)}
                placeholder="exemple@email.com"
                keyboardType="email-address"
            />

            <SelectField
                label="Relation"
                value={emergencyContact.relation}
                placeholder="Sélectionner une relation"
                required
                selectionType="relation"
                options={[
                    {value: 'parent', label: 'Parent'},
                    {value: 'conjoint', label: 'Conjoint(e)'},
                    {value: 'enfant', label: 'Enfant'},
                    {value: 'frere-soeur', label: 'Frère/Sœur'},
                    {value: 'ami', label: 'Ami(e)'},
                    {value: 'autre', label: 'Autre'}
                ]}
                onSelect={(value) => onUpdateEmergencyContact('relation', value)}
                onOpenBottomSheet={onOpenBottomSheet}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    emergencyContactSection: {
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
});