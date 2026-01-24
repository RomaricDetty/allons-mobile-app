import { CIVILITY_MAP } from '@/constants/profile';
import { useAppColors } from '@/hooks/use-app-colors';
import { COUNTRY_CODES, User } from '@/interfaces';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface PersonalInfoCardProps {
    user: User | null;
}

/**
 * Composant carte d'informations personnelles de l'utilisateur
 */
export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ user }) => {
    const colors = useAppColors();

    const fullName = useMemo(() => {
        if (!user) return 'Non renseigné';
        const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
        return parts.join(' ') || 'Non renseigné';
    }, [user]);

    const formattedDateOfBirth = useMemo(() => {
        if (!user?.dateOfBirth) return 'Non renseigné';
        const date = new Date(user.dateOfBirth);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }, [user?.dateOfBirth]);

    const formattedCivility = useMemo(() => {
        if (!user?.civility) return '';
        return CIVILITY_MAP[user.civility] || user.civility;
    }, [user?.civility]);

    const getFlagFromCountryCode = (countryCode: string) => {
        return COUNTRY_CODES.find(country => country.code === countryCode)?.label;
    };

    return (
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {/* <View style={styles.profileCardHeader}>
                <Text style={[styles.businessLabel, { color: colors.secondaryText }]}>Profil Utilisateur</Text>
            </View> */}

            <View style={styles.profileInfo}>
                <View style={[
                    styles.profileImageContainer,
                    {
                        backgroundColor: colors.profileImagePlaceholderBackground,
                        borderColor: colors.border,
                        borderWidth: 1,
                    }
                ]}>
                    {user?.picture ? (
                        <Image source={{ uri: user?.picture }} style={styles.profileImage} />
                    ) : (
                        <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.profileImagePlaceholderBackground }]}>
                            <MaterialCommunityIcons name="account" size={40} color={colors.secondaryText} />
                        </View>
                    )}
                </View>
                <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
                <Text style={[styles.userRole, { color: colors.secondaryText }]}>{formattedCivility}</Text>
                {user?.company && (
                    <View style={styles.companyBadge}>
                        <MaterialCommunityIcons name="office-building" size={14} color={colors.activeTabColor} />
                        <Text style={[styles.userCompany, { color: colors.activeTabColor }]}>{user?.company}</Text>
                    </View>
                )}
            </View>

            {/* Informations détaillées */}
            <View style={[styles.detailsSection, { borderTopColor: colors.border }]}>
                <View style={[styles.detailRow, styles.detailRowSpacing]}>
                    <View style={styles.detailIconContainer}>
                        <MaterialCommunityIcons name="email-outline" size={20} color={colors.activeTabColor} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.text }]}>Email</Text>
                        <View style={styles.detailValueContainer}>
                            <Text style={[styles.detailValue, { color: colors.secondaryText }]} numberOfLines={1}>
                                {user?.email ?? 'Non renseigné'}
                            </Text>
                            {user?.isEmailVerified && (
                                <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" style={styles.verifiedIcon} />
                            )}
                        </View>
                    </View>
                </View>
                <View style={[styles.detailRow, styles.detailRowSpacing]}>
                    <View style={styles.detailIconContainer}>
                        <MaterialCommunityIcons name="account-outline" size={20} color={colors.activeTabColor} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.text }]}>Nom d'utilisateur</Text>
                        <Text style={[styles.detailValue, { color: colors.secondaryText }]} numberOfLines={1}>
                            {user?.username ? `@${user.username}` : 'Non renseigné'}
                        </Text>
                    </View>
                </View>
                <View style={[styles.detailRow, styles.detailRowSpacing]}>
                    <View style={styles.detailIconContainer}>
                        <MaterialCommunityIcons name="phone-outline" size={20} color={colors.activeTabColor} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.text }]}>Téléphone</Text>
                        <Text style={[styles.detailValue, { color: colors.secondaryText }]}>
                            {getFlagFromCountryCode(user?.phones?.[0]?.countryCode ?? '')} {user?.phones?.[0]?.digits ?? 'Non renseigné'}
                        </Text>
                    </View>
                </View>
                {user?.dateOfBirth && (
                    <View style={[styles.detailRow, styles.detailRowSpacing]}>
                        <View style={styles.detailIconContainer}>
                            <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.activeTabColor} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: colors.text }]}>Date de naissance</Text>
                            <Text style={[styles.detailValue, { color: colors.secondaryText }]}>{formattedDateOfBirth}</Text>
                        </View>
                    </View>
                )}
                {user?.address && (
                    <View style={[styles.detailRow, styles.detailRowSpacing]}>
                        <View style={styles.detailIconContainer}>
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.activeTabColor} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: colors.text }]}>Adresse</Text>
                            <Text style={[styles.detailValue, { color: colors.secondaryText, flexWrap: 'wrap' }]} numberOfLines={2}>
                                {
                                    user.address?.country
                                        ? `${user.address.street}, ${user.address.city},  ${user.address.country ?? ''}`.trim()
                                        : 'Non renseigné'
                                }
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Contact d'urgence */}
            {user?.contactUrgent && (
                <View style={[styles.emergencySection, { borderTopColor: colors.border }]}>
                    <View style={styles.emergencyHeader}>
                        {/* <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.activeTabColor} /> */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact d'urgence</Text>
                    </View>
                    <View style={[styles.emergencyInfo, { backgroundColor: colors.emergencyInfoBackground }]}>
                        {user?.contactUrgent?.firstName && user?.contactUrgent?.lastName && (
                            <Text style={[styles.emergencyName, { color: colors.text }]}>
                                {user?.contactUrgent?.firstName ?? 'Non renseigné'} {user?.contactUrgent?.lastName ?? 'Non renseigné'}
                            </Text>
                        )}
                        {user?.contactUrgent?.phone?.digits && (
                            <View style={styles.emergencyDetails}>
                                <View style={styles.emergencyDetailItem}>
                                    <MaterialCommunityIcons name="phone" size={14} color={colors.secondaryText} />
                                    <Text style={[styles.emergencyPhone, { color: colors.secondaryText }]}>
                                        {getFlagFromCountryCode(user?.contactUrgent?.phone?.countryCode ?? '')} {user?.contactUrgent?.phone?.digits ?? 'Non renseigné'}
                                    </Text>
                                </View>
                                <View style={styles.emergencyDetailItem}>
                                    <MaterialCommunityIcons name="account-heart" size={14} color={colors.secondaryText} />
                                    <Text style={[styles.emergencyRelation, { color: colors.secondaryText }]}>
                                        {user?.contactUrgent?.relationship
                                            ? user?.contactUrgent?.relationship.charAt(0).toUpperCase() + user?.contactUrgent?.relationship.slice(1).toLowerCase()
                                            : 'Non renseigné'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    profileCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    profileCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    businessLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    profileInfo: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImageContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 3,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 22,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    userRole: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 8,
    },
    companyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(23, 118, 186, 0.1)',
    },
    userCompany: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Medium',
    },
    detailsSection: {
        paddingTop: 20,
        borderTopWidth: 1,
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    detailRowSpacing: {
        marginBottom: 4,
    },
    detailIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 118, 186, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailValue: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Ubuntu_Regular',
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    emergencySection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
    },
    emergencyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    emergencyInfo: {
        borderRadius: 12,
        padding: 16,
    },
    emergencyName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 12,
    },
    emergencyDetails: {
        gap: 10,
    },
    emergencyDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    emergencyPhone: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    emergencyRelation: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
});
