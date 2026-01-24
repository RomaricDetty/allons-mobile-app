import { User } from '@/interfaces';
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface UserStatsSectionProps {
    user: User | null;
}

/**
 * Composant affichant les statistiques utilisateur (voyages, type client, coins)
 */
export const UserStatsSection: React.FC<UserStatsSectionProps> = ({ user }) => {
    const colors = useAppColors();

    return (
        <View style={styles.statsSection}>
            {/* Voyages effectués */}
            <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.tripsIconContainerBackground }]}>
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.activeTabColor} />
                </View>
                <View style={styles.statsContent}>
                    <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>Voyages effectués</Text>
                    <Text style={[styles.statsValue, { color: colors.activeTabColor }]}>
                        {user?.customerProfile?.totalTripsPaid ?? 0}
                    </Text>
                </View>
            </View>

            {/* Type de clients */}
            <View style={[styles.statCard, { backgroundColor: colors.clientTypeCardBackground, borderColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                    <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                </View>
                <View style={styles.statsContent}>
                    <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>Type de client</Text>
                    <Text style={[styles.statsValue, { color: '#4CAF50' }]}>
                        {user?.customerProfile?.loyaltyTier && user.customerProfile.loyaltyTier.trim()
                            ? user.customerProfile.loyaltyTier.charAt(0).toUpperCase() + user.customerProfile.loyaltyTier.slice(1).toLowerCase()
                            : 'Bronze'}
                    </Text>
                </View>
            </View>

            {/* AllOn Coin gagnés */}
            <View style={[styles.statCard, { backgroundColor: colors.coinsCardBackground, borderColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 167, 38, 0.15)' }]}>
                    <MaterialCommunityIcons name="star" size={24} color="#FFA726" />
                </View>
                <View style={styles.statsContent}>
                    <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>AllOn Coin gagnés</Text>
                    <Text style={[styles.statsValue, { color: '#FFA726' }]}>
                        {user?.customerProfile?.totalCoinsEarned ?? '0.00'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    statsSection: {
        gap: 14,
        marginBottom: 20,
    },
    statCard: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContent: {
        flex: 1,
    },
    statsLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statsValue: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
    },
});
