import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { User } from '@/interfaces';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface UserStatsSectionProps {
    user: User | null;
}

/** Niveaux de fidélité alignés sur l’API (valeurs possibles). */
export enum LoyaltyTier {
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    PLATINUM = 'PLATINUM',
}

/**
 * Interprète la chaîne API (casse / variantes) en niveau de fidélité connu.
 */
function normalizeLoyaltyTier(raw: string | null | undefined): LoyaltyTier {
    if (!raw?.trim()) return LoyaltyTier.BRONZE;
    const key = raw.trim().toUpperCase();
    if (key === LoyaltyTier.PLATINUM || key === 'PLATINE' || key.includes('PLATIN'))
        return LoyaltyTier.PLATINUM;
    if (key === LoyaltyTier.GOLD || key === 'OR' || key.includes('GOLD')) return LoyaltyTier.GOLD;
    if (
        key === LoyaltyTier.SILVER ||
        key === 'ARGENT' ||
        key.includes('SILVER') ||
        key.includes('ARGENT')
    )
        return LoyaltyTier.SILVER;
    if (key === LoyaltyTier.BRONZE || key.includes('BRONZE')) return LoyaltyTier.BRONZE;
    return LoyaltyTier.BRONZE;
}

/**
 * Libellé français affiché pour un niveau de fidélité.
 */
function loyaltyTierLabel(value: LoyaltyTier): string {
    switch (value) {
        case LoyaltyTier.BRONZE:
            return 'Bronze';
        case LoyaltyTier.GOLD:
            return 'Or';
        case LoyaltyTier.PLATINUM:
            return 'Platine';
        case LoyaltyTier.SILVER:
            return 'Argent';
        default:
            return 'Bronze';
    }
}

type LoyaltyTierTheme = {
    accent: string;
    iconBackground: string;
    /** Bordure fine autour de la carte (même teinte que le palier, atténuée). */
    border: string;
    /** Bandeau vertical gauche (couleur pleine du palier). */
    stripe: string;
};

/**
 * Couleurs du palier : accent, fond d’icône, bordure et bandeau (cohérents entre eux).
 */
function loyaltyTierTheme(tier: LoyaltyTier, isDark: boolean): LoyaltyTierTheme {
    switch (tier) {
        case LoyaltyTier.BRONZE:
            return isDark
                ? {
                      accent: '#D4A574',
                      iconBackground: 'rgba(212, 165, 116, 0.28)',
                      border: 'rgba(212, 165, 116, 0.42)',
                      stripe: '#D4A574',
                  }
                : {
                      accent: '#B87333',
                      iconBackground: 'rgba(184, 115, 51, 0.22)',
                      border: 'rgba(184, 115, 51, 0.38)',
                      stripe: '#B87333',
                  };
        case LoyaltyTier.SILVER:
            return isDark
                ? {
                      accent: '#CFD8DC',
                      iconBackground: 'rgba(207, 216, 220, 0.22)',
                      border: 'rgba(207, 216, 220, 0.4)',
                      stripe: '#CFD8DC',
                  }
                : {
                      accent: '#607D8B',
                      iconBackground: 'rgba(96, 125, 139, 0.2)',
                      border: 'rgba(96, 125, 139, 0.36)',
                      stripe: '#607D8B',
                  };
        case LoyaltyTier.GOLD:
            return isDark
                ? {
                      accent: '#FFD54F',
                      iconBackground: 'rgba(255, 213, 79, 0.22)',
                      border: 'rgba(255, 213, 79, 0.42)',
                      stripe: '#FFD54F',
                  }
                : {
                      accent: '#F9A825',
                      iconBackground: 'rgba(249, 168, 37, 0.22)',
                      border: 'rgba(249, 168, 37, 0.38)',
                      stripe: '#F9A825',
                  };
        case LoyaltyTier.PLATINUM:
            return isDark
                ? {
                      accent: '#9FA8DA',
                      iconBackground: 'rgba(159, 168, 218, 0.26)',
                      border: 'rgba(159, 168, 218, 0.42)',
                      stripe: '#9FA8DA',
                  }
                : {
                      accent: '#5C6BC0',
                      iconBackground: 'rgba(92, 107, 192, 0.22)',
                      border: 'rgba(92, 107, 192, 0.35)',
                      stripe: '#5C6BC0',
                  };
        default:
            return loyaltyTierTheme(LoyaltyTier.BRONZE, isDark);
    }
}

/**
 * Composant affichant les statistiques utilisateur (voyages, type client, coins)
 */
export const UserStatsSection: React.FC<UserStatsSectionProps> = ({ user }) => {
    const colors = useAppColors();
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';

    const customerProfile = (
        user as User & {
            customerProfile?: {
                loyaltyTier?: string;
                totalTripsPaid?: number;
                totalCoinsEarned?: string | number;
            };
        }
    )?.customerProfile;

    const loyaltyTier = useMemo(
        () => normalizeLoyaltyTier(customerProfile?.loyaltyTier),
        [customerProfile?.loyaltyTier],
    );

    const tierTheme = useMemo(
        () => loyaltyTierTheme(loyaltyTier, isDark),
        [loyaltyTier, isDark],
    );

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
                        {customerProfile?.totalTripsPaid ?? 0}
                    </Text>
                </View>
            </View>

            {/* Type de client */}
            <View
                style={[
                    styles.statCard,
                    {
                        backgroundColor: colors.clientTypeCardBackground,
                        borderColor: colors.border,
                    },
                ]}
            >
                <View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: tierTheme.iconBackground,
                        },
                    ]}
                >
                    <MaterialCommunityIcons name="wallet" size={24} color={tierTheme.accent} />
                </View>
                <View style={styles.statsContent}>
                    <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>Type de client</Text>
                    <Text style={[styles.statsValue, { color: tierTheme.accent }]}>
                        {loyaltyTierLabel(loyaltyTier)}
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
                        {customerProfile?.totalCoinsEarned ?? '0.00'}
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
    // tierCard: {
    //     borderLeftWidth: 2,
    // },
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
