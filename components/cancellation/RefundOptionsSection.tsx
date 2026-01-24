import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppColors } from '@/hooks/use-app-colors';
import { RefundOption } from '@/api/cancellation';

interface RefundOptionsSectionProps {
    refundOption: RefundOption;
    onSelectOption: (option: RefundOption) => void;
}

/**
 * Section de sélection du mode de remboursement
 */
export const RefundOptionsSection: React.FC<RefundOptionsSectionProps> = ({
    refundOption,
    onSelectOption,
}) => {
    const colors = useAppColors();

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Mode de remboursement</Text>

            {/* Code de rebooking */}
            <Pressable
                style={[
                    styles.optionCard,
                    {
                        backgroundColor: refundOption === 'rebooking' ? 'rgba(23, 118, 186, 0.1)' : colors.inputBackground,
                        borderColor: refundOption === 'rebooking' ? colors.activeTabColor : colors.border,
                    },
                ]}
                onPress={() => onSelectOption('rebooking')}
            >
                <View style={styles.optionHeader}>
                    <MaterialCommunityIcons
                        name={refundOption === 'rebooking' ? 'radiobox-marked' : 'radiobox-blank'}
                        size={24}
                        color={refundOption === 'rebooking' ? colors.activeTabColor : colors.secondaryText}
                    />
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Code de rebooking <Text style={[styles.recommended, { color: colors.activeTabColor }]}>(Recommandé)</Text>
                    </Text>
                </View>
                <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                    Vous recevrez un code par SMS valable 30 jours pour une nouvelle réservation. Le montant sera crédité automatiquement.
                </Text>
            </Pressable>

            {/* Remboursement par méthode de paiement */}
            <Pressable
                style={[
                    styles.optionCard,
                    {
                        backgroundColor: refundOption === 'payment' ? 'rgba(23, 118, 186, 0.1)' : colors.inputBackground,
                        borderColor: refundOption === 'payment' ? colors.activeTabColor : colors.border,
                    },
                ]}
                onPress={() => onSelectOption('payment')}
            >
                <View style={styles.optionHeader}>
                    <MaterialCommunityIcons
                        name={refundOption === 'payment' ? 'radiobox-marked' : 'radiobox-blank'}
                        size={24}
                        color={refundOption === 'payment' ? colors.activeTabColor : colors.secondaryText}
                    />
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Remboursement par la méthode de paiement initial
                    </Text>
                </View>
                <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                    Traité manuellement. Vous serez contacté pour le suivi. Le délai varie selon votre méthode de paiement.
                </Text>
            </Pressable>
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
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    optionCard: {
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
        marginBottom: 12,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    optionTitle: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
        flex: 1,
    },
    recommended: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    optionDescription: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
        marginLeft: 32,
    },
});
