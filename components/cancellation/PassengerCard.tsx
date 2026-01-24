import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppColors } from '@/hooks/use-app-colors';

interface Passenger {
    id?: string;
    firstName: string;
    lastName: string;
    seatNumber: string;
    price: string;
    status?: string;
    isMainPassenger?: boolean;
}

interface PassengerCardProps {
    passenger: Passenger;
    passengerId: string;
    isSelected: boolean;
    isCancelled: boolean;
    currency: string;
    onPress: (passengerId: string) => void;
}

/**
 * Carte d'affichage d'un passager pour la sélection
 */
export const PassengerCard: React.FC<PassengerCardProps> = ({
    passenger,
    passengerId,
    isSelected,
    isCancelled,
    currency,
    onPress,
}) => {
    const colors = useAppColors();

    const getBackgroundColor = () => {
        if (isCancelled) return colors.border;
        if (isSelected) return 'rgba(23, 118, 186, 0.1)';
        return colors.inputBackground;
    };

    const getBorderColor = () => {
        if (isCancelled) return colors.border;
        if (isSelected) return colors.activeTabColor;
        return colors.border;
    };

    const iconName = isCancelled 
        ? 'close-circle' 
        : isSelected 
            ? 'checkbox-marked' 
            : 'checkbox-blank-outline';
    
    const iconColor = isCancelled 
        ? '#F44336' 
        : isSelected 
            ? colors.activeTabColor 
            : colors.secondaryText;

    return (
        <Pressable
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    opacity: isCancelled ? 0.5 : 1,
                },
            ]}
            onPress={() => onPress(passengerId)}
            disabled={isCancelled}
        >
            <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
            <View style={styles.info}>
                <View style={styles.header}>
                    <Text style={[styles.name, { color: isCancelled ? colors.secondaryText : colors.text }]}>
                        {passenger.firstName} {passenger.lastName}
                    </Text>
                    {isCancelled && (
                        <View style={[styles.badge, { backgroundColor: '#F44336' }]}>
                            <Text style={styles.badgeText}>Réservation annulée</Text>
                        </View>
                    )}
                    {!isCancelled && passenger.isMainPassenger && (
                        <View style={[styles.badge, { backgroundColor: colors.activeTabColor }]}>
                            <Text style={styles.badgeText}>Passager principal</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.details, { color: colors.secondaryText }]}>
                    Siège n°{passenger.seatNumber} • {parseFloat(passenger.price).toLocaleString('fr-FR')} {currency}
                </Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        marginBottom: 12,
        gap: 12,
    },
    info: {
        flex: 1,
    },
    header: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 5,
        padding: 5,
    },
    name: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    details: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
    },
});
