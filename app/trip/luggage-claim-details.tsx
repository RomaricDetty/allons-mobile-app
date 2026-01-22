// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Mapping des traductions des statuts en français
 */
const STATUS_TRANSLATION: Record<string, string> = {
    'REGISTERED': 'Enregistré au comptoir',
    'CHECKED_IN': 'Enregistré',
    'LOADED': 'Chargé',
    'UNLOADED': 'Déchargé',
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé',
    'LOST_OR_STOLEN': 'Perdu ou volé',
    'PENDING': 'En attente',
    'Perdu ou volé': 'Perdu ou volé',
    'Endommagé': 'Endommagé',
    'Retardé': 'Retardé',
    'INVESTIGATING': 'En investigation',
    'REPAIRED': 'Réparé',
    'REPLACED': 'Remplacé',
    'REFUNDED': 'Remboursé',
    'CANCELLED': 'Annulé',
    'LOST_OR_STOLEN': 'Perdu ou volé',
    'PENDING': 'En attente',
    'Perdu ou volé': 'Perdu ou volé',
    'Endommagé': 'Endommagé',
    'Retardé': 'Retardé',
    'RESOLVED': 'Résolu',
    'REPAIRED': 'Réparé',
};

const CLAIM_TYPE_TRANSLATION: Record<string, string> = {
    'LOST': 'Perdu ou volé',
    'DAMAGED': 'Endommagé',
    'DELAYED': 'Retardé',
};

/**
 * Traduit un statut en français
 */
const translateStatus = (status: string | undefined): string => {
    if (!status) return 'Non disponible';
    return STATUS_TRANSLATION[status] || status;
};

/**
 * Traduit un type de réclamation en français
 */
const translateClaimType = (type: string | undefined): string => {
    if (!type) return 'Non disponible';
    return CLAIM_TYPE_TRANSLATION[type] || type;
};

/**
 * Formate une date pour l'affichage
 */
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Non disponible';
    try {
        const date = new Date(dateString);
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${year} à ${hours}:${minutes}`;
    } catch {
        return dateString;
    }
};

/**
 * Formate le prix avec la devise
 */
const formatPrice = (amount: number | null | undefined): string => {
    if (!amount) return 'Non disponible';
    return new Intl.NumberFormat('fr-FR').format(amount);
};

/**
 * Écran de visualisation des détails d'une réclamation
 */
const LuggageClaimDetailsScreen = () => {
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const luggageId = params.luggageId as string;
    const claimId = params.claimId as string;

    // Récupération des données de la réclamation depuis les params
    // Note: Les données sont passées depuis la liste des bagages
    const claimData = useMemo(() => {
        try {
            // Si les données sont passées en JSON stringifié
            if (params.claimData) {
                return typeof params.claimData === 'string' 
                    ? JSON.parse(params.claimData) 
                    : params.claimData;
            }
            return null;
        } catch {
            return null;
        }
    }, [params.claimData]);

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Mémorisation des couleurs du thème
    const themeColors = useMemo(() => ({
        backgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        primaryBlue: tintColor === '#fff' ? '#1776BA' : tintColor,
    }), [colorScheme, tintColor]);

    /**
     * Gère le retour
     */
    const handleBack = () => {
        router.back();
    };

    if (!claimData) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top,
                            backgroundColor: themeColors.headerBackgroundColor,
                            borderBottomColor: themeColors.headerBorderColor,
                        },
                    ]}
                >
                    <Pressable onPress={handleBack} style={styles.closeButton}>
                        <Icon name="close" size={24} color={iconColor} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textColor }]}>
                        Détails de la réclamation
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: textColor }]}>
                        Impossible de charger les détails de la réclamation
                    </Text>
                </View>
            </View>
        );
    }

    const claimType = translateClaimType(claimData.type || claimData.status) || 'Non disponible';
    const claimCode = claimData.code || claimData.id || 'Non disponible';
    const description = claimData.description || 'Aucune description';
    const photos = claimData.photos || [];
    const metadata = claimData.metadata || {};
    const damageDescription = metadata.damageDescription || '';
    const estimatedValue = metadata.estimatedValue;
    const claimStatus = claimData.status ? translateStatus(claimData.status) : null;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: themeColors.headerBackgroundColor,
                        borderBottomColor: themeColors.headerBorderColor,
                    },
                ]}
            >
                <Pressable onPress={handleBack} style={styles.closeButton}>
                    <Icon name="close" size={24} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Détails de la réclamation
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Informations principales */}
                <View style={[styles.card, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>INFORMATIONS GÉNÉRALES</Text>
                    
                    {/* Code de la réclamation */}
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                            Code de la réclamation
                        </Text>
                        <Text style={[styles.infoValue, { color: textColor, fontFamily: 'Ubuntu_Bold' }]}>
                            {claimCode}
                        </Text>
                    </View>

                    {/* Type de réclamation */}
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                            Type de réclamation
                        </Text>
                        <Text style={[styles.infoValue, { color: textColor }]}>
                            {claimType}
                        </Text>
                    </View>

                    {/* Statut */}
                    {claimStatus && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                                Statut
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: themeColors.primaryBlue + '20' }]}>
                                <Text style={[styles.statusBadgeText, { color: themeColors.primaryBlue }]}>
                                    {claimStatus}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Date de création */}
                    {claimData.createdAt && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                                Date de réclamation
                            </Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>
                                {formatDate(claimData.createdAt)}
                            </Text>
                        </View>
                    )}

                </View>

                {/* Description */}
                <View style={[styles.card, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>DESCRIPTION</Text>
                    <Text style={[styles.descriptionText, { color: textColor }]}>
                        {description}
                    </Text>
                </View>

                {/* Métadonnées si disponibles */}
                {(damageDescription || estimatedValue) && (
                    <View style={[styles.card, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>INFORMATIONS COMPLÉMENTAIRES</Text>
                        
                        {damageDescription && (
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                                    Description des dommages
                                </Text>
                                <Text style={[styles.infoValue, { color: textColor }]}>
                                    {damageDescription}
                                </Text>
                            </View>
                        )}

                        {estimatedValue && (
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: themeColors.secondaryTextColor }]}>
                                    Valeur estimée
                                </Text>
                                <Text style={[styles.infoValue, { color: textColor }]}>
                                    {formatPrice(estimatedValue)} XOF
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Photos si disponibles */}
                {photos.length > 0 && (
                    <View style={[styles.card, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>PHOTOS</Text>
                        <Text style={[styles.infoValue, { color: themeColors.secondaryTextColor }]}>
                            {photos.length} photo(s) jointe(s)
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardTitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    infoRow: {
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
    },
    descriptionText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
    },
});

export default LuggageClaimDetailsScreen;
