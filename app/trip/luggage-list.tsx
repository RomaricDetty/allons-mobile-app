// @ts-nocheck
import { getLuggageList } from '@/api/luggage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getLuggageTypeLabel } from '@/utils/luggage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Mapping des couleurs pour les statuts de bagage
 */
const STATUS_COLOR_MAPPING: Record<string, { light: string; dark: string }> = {
    'REGISTERED': { light: '#1776BA', dark: '#1776BA' },
    'CHECKED_IN': { light: '#34C759', dark: '#30D158' },
    'LOADED': { light: '#5856D6', dark: '#5E5CE6' },
    'UNLOADED': { light: '#FF9500', dark: '#FF9F0A' },
    'DELIVERED': { light: '#34C759', dark: '#30D158' },
    'CANCELLED': { light: '#FF3B30', dark: '#FF453A' },
};

/**
 * Mapping des traductions des statuts en français
 */
const STATUS_TRANSLATION: Record<string, string> = {
    'REGISTERED': 'Enregistré',
    'CHECKED_IN': 'Vérifié',
    'LOADED': 'Chargé',
    'UNLOADED': 'Déchargé',
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé',
    'LOST': 'Perdu ou volé',
    'DAMAGED': 'Endommagé',
    'DELAYED': 'Retardé',
    'INVESTIGATING': 'En investigation',
    'PENDING': 'En attente',
};

/**
 * Interface pour une réclamation
 */
interface Claim {
    id: string;
    type?: string;
    status?: string;
    description?: string;
    photos?: string[];
    metadata?: {
        damageDescription?: string;
        estimatedValue?: number | null;
    };
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Interface pour un bagage
 */
interface Luggage {
    id: string;
    tag?: string;
    luggageTag?: string;
    type?: string;
    weight?: number;
    estimatedWeight?: number;
    realWeight?: number;
    price?: number;
    currency?: string;
    description?: string;
    status?: string;
    statusLabel?: string;
    history?: Array<{
        date: string;
        action: string;
        location?: string;
    }>;
    claims?: Claim[];
    [key: string]: any;
}

/**
 * Formate une date pour l'affichage
 */
const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch {
        return dateString;
    }
};

/**
 * Formate le prix avec la devise
 */
const formatPrice = (amount: number | string | undefined): string => {
    if (!amount) return '';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR').format(numAmount);
};

/**
 * Interface pour les props de la carte de bagage
 */
interface LuggageCardProps {
    luggage: Luggage;
    index: number;
    themeColors: {
        cardBackgroundColor: string;
        borderColor: string;
        secondaryTextColor: string;
        primaryBlue: string;
    };
    textColor: string;
    colorScheme: 'light' | 'dark';
    onClaim: (luggageId: string) => void;
    onViewClaim: (luggageId: string, claim: Claim) => void;
    onPressQrCode: (tag: string) => void;
}

/**
 * Composant pour afficher une carte de bagage
 */
const LuggageCard = React.memo(({ luggage, index, themeColors, textColor, colorScheme, onClaim, onViewClaim, onPressQrCode }: LuggageCardProps) => {
    // Extraction et normalisation des données du bagage
    const tag = luggage.tag || luggage.luggageTag || luggage.tagNumber || '';
    const luggageTypeRaw = luggage.type || luggage.luggageType || luggage.luggage_type || 'CHECKED';
    const luggageType = getLuggageTypeLabel(luggageTypeRaw);
    const estimatedWeight = luggage.estimatedWeight || luggage.weight || luggage.estimated_weight;
    const realWeight = luggage.realWeight || luggage.actualWeight || luggage.real_weight || luggage.weight;
    const price = luggage.price || luggage.amount || luggage.totalPrice;
    const currency = luggage.currency || 'XOF';
    const statusRaw = luggage.status || luggage.statusLabel || 'REGISTERED';
    const statusLabel = STATUS_TRANSLATION[statusRaw.toUpperCase()] || statusRaw;
    const statusColor = STATUS_COLOR_MAPPING[statusRaw.toUpperCase()] || { light: themeColors.primaryBlue, dark: themeColors.primaryBlue };
    const history = luggage.history || luggage.trackingHistory || [];
    const claims = luggage.claims || [];
    const hasClaim = claims.length > 0;
    const latestClaim = hasClaim ? claims[0] : null;

    return (
        <View
            key={luggage.id || index}
            style={[
                styles.luggageCard,
                {
                    backgroundColor: themeColors.cardBackgroundColor,
                    borderColor: themeColors.borderColor
                }
            ]}
        >
            {/* En-tête du bagage */}
            <View style={styles.luggageHeader}>
                <View style={styles.luggageTitleRow}>
                    <View style={styles.luggageTitleLeft}>
                        <Icon name="bag-suitcase" size={24} color={themeColors.primaryBlue} />
                        <Text style={[styles.luggageTypeTitle, { color: textColor }]}>
                            {luggageType}
                        </Text>
                    </View>
                    {statusLabel && (
                        <View style={[styles.statusBadge, { backgroundColor: (colorScheme === 'dark' ? statusColor.dark : statusColor.light) + '20' }]}>
                            <Text style={[styles.statusBadgeText, { color: colorScheme === 'dark' ? statusColor.dark : statusColor.light }]}>
                                {statusLabel}
                            </Text>
                        </View>
                    )}
                </View>
                {luggage.description && (
                    <Text style={[styles.luggageDescription, { color: themeColors.secondaryTextColor }]}>
                        {luggage.description}
                    </Text>
                )}
            </View>

            {/* Section POIDS */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>POIDS</Text>
                <View style={styles.weightRow}>
                    <View style={styles.weightItem}>
                        <Text style={[styles.weightLabel, { color: themeColors.secondaryTextColor }]}>
                            Poids estimé
                        </Text>
                        <Text style={[styles.weightValue, { color: textColor }]}>
                            {estimatedWeight ? `${estimatedWeight} kg` : 'N/A'}
                        </Text>
                    </View>
                    {price && (
                        <View style={styles.priceContainer}>
                            <Text style={[styles.priceLabel, { color: themeColors.secondaryTextColor }]}>PRIX</Text>
                            <Text style={[styles.priceValue, { color: themeColors.primaryBlue }]}>
                                {formatPrice(price)} {currency}
                            </Text>
                        </View>
                    )}
                </View>
                {realWeight && (
                    <View style={styles.weightItem}>
                        <Text style={[styles.weightLabel, { color: themeColors.secondaryTextColor }]}>
                            Poids réel
                        </Text>
                        <Text style={[styles.weightValue, { color: textColor }]}>
                            {realWeight} kg
                        </Text>
                    </View>
                )}
            </View>

            {/* Section NUMÉRO DE TAG et QR Code */}
            {tag && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>NUMÉRO DE TAG</Text>
                    <View style={styles.tagRow}>
                        <Text style={[styles.tagValue, { color: textColor }]}>
                            {tag}
                        </Text>
                        <Pressable
                            style={styles.qrCodeWrapper}
                            onPress={() => onPressQrCode(tag)}
                        >
                            <QRCode
                                value={tag}
                                size={80}
                                color="#000000"
                                backgroundColor="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Section HISTORIQUE */}
            {history.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>HISTORIQUE</Text>
                    {history.map((item: any, histIndex: number) => (
                        <View key={histIndex} style={styles.historyItem}>
                            <Icon name="check-circle" size={16} color={themeColors.primaryBlue} />
                            <Text style={[styles.historyText, { color: themeColors.secondaryTextColor }]}>
                                {item.action || item.description} {item.location ? `à ${item.location}` : ''} le {formatDate(item.date || item.createdAt || item.timestamp)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Bouton de réclamation ou voir réclamation */}
            {hasClaim && latestClaim ? (
                <Pressable
                    style={[styles.claimButton, { backgroundColor: themeColors.primaryBlue }]}
                    onPress={() => onViewClaim(luggage.id, latestClaim)}
                >
                    <Text style={[styles.claimButtonText, { color: '#FFFFFF' }]}>
                        Voir la réclamation
                    </Text>
                </Pressable>
            ) : (
                <Pressable
                    style={[styles.claimButton, { backgroundColor: '#F44336' }]}
                    onPress={() => onClaim(luggage.id)}
                >
                    <Text style={[styles.claimButtonText, { color: '#FFFFFF' }]}>
                        Faire une réclamation
                    </Text>
                </Pressable>
            )}
        </View>
    );
});

LuggageCard.displayName = 'LuggageCard';

/**
 * Écran de liste des bagages d'un passager
 */
const LuggageListScreen = () => {
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const bookingItemId = params.bookingItemId as string;
    const passengerName = params.passengerName as string || 'Passager';

    const [luggageList, setLuggageList] = useState<Luggage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    /** Tag du bagage dont le QR code est affiché en grand (null = modal fermée) */
    const [enlargedQrTag, setEnlargedQrTag] = useState<string | null>(null);

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Mémorisation des couleurs du thème pour éviter les recalculs
    const themeColors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        primaryBlue: tintColor === '#fff' ? '#1776BA' : tintColor,
        luggageCardBackground: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    }), [colorScheme, tintColor]);

    /**
     * Charge la liste des bagages du passager
     */
    const loadLuggageList = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setIsLoading(true);
            }
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('Token non disponible');
            }

            const response = await getLuggageList(bookingItemId, token);

            if (response.data) {
                console.log('response.data Luggage ===>, ', JSON.stringify(response.data));
                setLuggageList(response.data || []);
            }
        } catch (error: any) {
            console.error('Erreur lors du chargement des bagages:', error);
            // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de bagages
            if (error.response?.status !== 404) {
                Alert.alert(
                    'Erreur',
                    error.response?.data?.message || 'Une erreur est survenue lors du chargement des bagages.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [bookingItemId]);

    /**
     * Gère le pull refresh
     */
    const onRefresh = useCallback(() => {
        loadLuggageList(true);
    }, [loadLuggageList]);

    /**
     * Gère la navigation vers l'écran de réclamation
     */
    const handleClaim = useCallback((luggageId: string) => {
        router.push({
            pathname: '/trip/luggage-claim',
            params: { luggageId },
        });
    }, []);

    /**
     * Gère la navigation vers l'écran de visualisation de réclamation
     */
    const handleViewClaim = useCallback((luggageId: string, claim: Claim) => {
        router.push({
            pathname: '/trip/luggage-claim-details',
            params: { 
                luggageId,
                claimId: claim.id,
                claimData: JSON.stringify(claim),
            },
        });
    }, []);

    /**
     * Ouvre la modale pour afficher le QR code du bagage en grand
     */
    const handlePressQrCode = useCallback((tag: string) => {
        setEnlargedQrTag(tag);
    }, []);

    useEffect(() => {
        if (bookingItemId) {
            loadLuggageList();
        }
    }, [bookingItemId, loadLuggageList]);

    /**
     * Recharge la liste quand l'écran reprend le focus
     * (par exemple après avoir soumis une réclamation)
     */
    useFocusEffect(
        useCallback(() => {
            if (bookingItemId) {
                loadLuggageList();
            }
        }, [bookingItemId, loadLuggageList])
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor }]}>
            {/* Header avec bouton retour */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: themeColors.headerBackgroundColor,
                    borderBottomColor: themeColors.headerBorderColor
                }
            ]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>
                        Bagages
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: themeColors.secondaryTextColor }]}>
                        {passengerName}
                    </Text>
                    <Text style={[styles.headerCount, { color: themeColors.secondaryTextColor }]}>
                        {luggageList.length} {luggageList.length > 1 ? 'bagages enregistrés' : 'bagage enregistré'}
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.primaryBlue} />
                    <Text style={[styles.loadingText, { color: themeColors.secondaryTextColor }]}>
                        Chargement des bagages...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={luggageList.length === 0 ? styles.scrollContentEmpty : styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[themeColors.primaryBlue]}
                            tintColor={themeColors.primaryBlue}
                        />
                    }
                >
                    {luggageList.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Icon name="bag-suitcase-off" size={64} color={themeColors.secondaryTextColor} />
                            <Text style={[styles.emptyText, { color: textColor }]}>
                                Aucun bagage enregistré
                            </Text>
                            <Text style={[styles.emptySubtext, { color: themeColors.secondaryTextColor }]}>
                                Ce passager n'a pas de bagages enregistrés pour ce voyage.
                            </Text>
                        </View>
                    ) : (
                        luggageList.map((luggage, index) => (
                            <LuggageCard
                                key={luggage.id || index}
                                luggage={luggage}
                                index={index}
                                themeColors={themeColors}
                                textColor={textColor}
                                colorScheme={colorScheme}
                                onClaim={handleClaim}
                                onViewClaim={handleViewClaim}
                                onPressQrCode={handlePressQrCode}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            {/* Modale QR code agrandi */}
            <Modal
                visible={enlargedQrTag !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setEnlargedQrTag(null)}
            >
                <Pressable
                    style={styles.qrModalOverlay}
                    onPress={() => setEnlargedQrTag(null)}
                >
                    <Pressable
                        style={[styles.qrModalContent, { backgroundColor: themeColors.cardBackgroundColor }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={[styles.qrModalTitle, { color: textColor }]}>Code QR du bagage</Text>
                        {enlargedQrTag && (
                            <View style={styles.qrModalQrWrapper}>
                                <QRCode
                                    value={enlargedQrTag}
                                    size={220}
                                    color="#000000"
                                    backgroundColor="#FFFFFF"
                                />
                            </View>
                        )}
                        <Text style={[styles.qrModalTag, { color: themeColors.secondaryTextColor }]}>
                            {enlargedQrTag}
                        </Text>
                        <Pressable
                            style={[styles.qrModalCloseButton, { backgroundColor: themeColors.primaryBlue }]}
                            onPress={() => setEnlargedQrTag(null)}
                        >
                            <Text style={styles.qrModalCloseText}>Fermer</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
        marginTop: 4,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    headerCount: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    scrollContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        minHeight: 300,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    luggageCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    luggageHeader: {
        marginBottom: 16,
    },
    luggageTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    luggageTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    luggageTypeTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    luggageDescription: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    weightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    weightItem: {
        flex: 1,
    },
    weightLabel: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    weightValue: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        gap: 16,
    },
    tagValue: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    qrCodeWrapper: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    historyText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
        lineHeight: 20,
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        marginTop: 8,
    },
    claimButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    qrModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    qrModalContent: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        minWidth: 280,
    },
    qrModalTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 20,
    },
    qrModalQrWrapper: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
    },
    qrModalTag: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 20,
        textAlign: 'center',
    },
    qrModalCloseButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    qrModalCloseText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});

export default LuggageListScreen;
