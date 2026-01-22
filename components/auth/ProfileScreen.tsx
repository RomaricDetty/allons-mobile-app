// @ts-nocheck
import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { getBookingDetails } from '@/api/booking';
import { formatBookingDate, formatStatus, getStatusColor } from '@/constants/functions';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Booking, COUNTRY_CODES, ProfileScreenProps, User } from '@/interfaces';
import { clearAuthData, getAuthToken } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Options de statut pour le filtre des réservations
 * Défini en dehors du composant pour éviter la recréation à chaque render
 */
const STATUS_OPTIONS = [
    { value: '', label: 'Tous les statuts' },
    { value: 'PAID', label: 'Payé' },
    { value: 'CONFIRMED', label: 'Confirmé' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'PROCESSING', label: 'En traitement' },
    { value: 'COMPLETED', label: 'Terminé' },
    { value: 'USED', label: 'Utilisé' },
    { value: 'CANCELLED', label: 'Annulé' },
    { value: 'REFUNDED', label: 'Remboursé' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'FAILED', label: 'Échoué' },
] as const;

/**
 * Map de civilité pour le formatage
 */
const CIVILITY_MAP: { [key: string]: string } = {
    'MR': 'Monsieur',
    'MRS': 'Madame',
    'MISS': 'Mademoiselle',
};

export const ProfileScreen = ({ onLogout }: ProfileScreenProps) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const { isDarkMode, toggleTheme } = useTheme();
    const colors = useAppColors();

    // Mémorisation de toutes les couleurs pour éviter les recalculs
    const themeColors = useMemo(() => ({
        text: colors.text,
        icon: colors.icon,
        tint: colors.tint,
        cardBackground: colors.cardBackground,
        border: colors.border,
        secondaryText: colors.secondaryText,
        headerBackground: colors.headerBackground,
        headerBorder: colors.headerBorder,
        scrollBackground: colors.scrollBackground,
        inputBackground: colors.inputBackground,
        placeholder: colors.placeholder,
        inactiveIcon: colors.inactiveIcon,
        inactiveTabText: colors.inactiveTabText,
        activeTab: colors.activeTabColor,
        modalBackground: colors.modalBackground,
        modalBorder: colors.modalBorder,
        emergencyInfoBackground: colors.emergencyInfoBackground,
        profileImagePlaceholderBackground: colors.profileImagePlaceholderBackground,
        tripsIconContainerBackground: colors.tripsIconContainerBackground,
        clientTypeCardBackground: colors.clientTypeCardBackground,
        coinsCardBackground: colors.coinsCardBackground,
    }), [colors, colorScheme]);

    const [user, setUser] = useState<User | null>(null);
    const [bookingList, setBookingList] = useState<Booking[] | any>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
    const [searchQuery, setSearchQuery] = useState<string | any>('');
    const [selectedStatus, setSelectedStatus] = useState<string | any>('');
    const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingBooking, setIsLoadingBooking] = useState<string | null>(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const navigation = useNavigation();
    const scrollViewRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;
    const scrollX = useRef(new Animated.Value(0)).current;
    const isProgrammaticScrollRef = useRef(false);

    /**
     * Formate le nom complet de l'utilisateur
     * Mémorisé pour éviter les recalculs inutiles
     */
    const fullName = useMemo(() => {
        if (!user) return 'Non renseigné';
        const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
        return parts.join(' ') || 'Non renseigné';
    }, [user?.firstName, user?.middleName, user?.lastName]);

    /**
     * Formate la date de naissance pour l'affichage
     * Mémorisé pour éviter les recalculs inutiles
     */
    const formattedDateOfBirth = useMemo(() => {
        if (!user?.dateOfBirth) return 'Non renseigné';
        const date = new Date(user.dateOfBirth);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }, [user?.dateOfBirth]);

    /**
     * Formate la civilité pour l'affichage
     * Mémorisé pour éviter les recalculs inutiles
     */
    const formattedCivility = useMemo(() => {
        if (!user?.civility) return '';
        return CIVILITY_MAP[user.civility] || user.civility;
    }, [user?.civility]);

    /**
     * Gère la déconnexion de l'utilisateur
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleLogout = useCallback(() => {
        setShowLogoutModal(true);
    }, []);

    /**
     * Confirme et exécute la déconnexion
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const confirmLogout = useCallback(async () => {
        setShowLogoutModal(false);
        try {
            const onboardingValue = await AsyncStorage.getItem('onboarding');
            await clearAuthData();
            if (onboardingValue) {
                await AsyncStorage.setItem('onboarding', onboardingValue);
            }
            onLogout();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
        }
    }, [onLogout]);

    /**
     * Récupère les informations de l'utilisateur
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const getUserInfo = useCallback(async () => {
        try {
            const token = await getAuthToken();
            const userId = await AsyncStorage.getItem('user_id');

            if (!token || token.trim() === '') {
                Alert.alert('Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
                return null;
            }

            if (!userId || userId.trim() === '') {
                Alert.alert('Erreur', 'ID utilisateur manquant. Veuillez vous reconnecter.');
                return null;
            }

            const response = await authGetUserInfo(userId, token);
            console.log('response authGetUserInfo ==> ', response.data);
            if (response.status === 200) {
                return response.data;
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
                return null;
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            Alert.alert('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
            return null;
        }
    }, []);

    /**
     * Récupère la liste des réservations de l'utilisateur
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const getBookingList = useCallback(async () => {
        try {
            const token = await getAuthToken();
            const userId = await AsyncStorage.getItem('user_id');

            if (!token || token.trim() === '') {
                Alert.alert('Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
                return;
            }

            if (!userId || userId.trim() === '') {
                Alert.alert('Erreur', 'ID utilisateur manquant. Veuillez vous reconnecter.');
                return;
            }

            const response = await bookingListInfo(userId, token);
            if (response.status === 200 && response.data?.items) {
                setBookingList(response.data.items);
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération de la liste des réservations');
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération de la liste des réservations:', error);
            Alert.alert('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de la récupération de la liste des réservations');
        }
    }, []);

    /**
     * Affiche les détails d'une réservation
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleViewBooking = useCallback(async (bookingId: string) => {
        try {
            setIsLoadingBooking(bookingId);
            const token = await getAuthToken();

            if (!token || token.trim() === '') {
                Alert.alert('Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
                setIsLoadingBooking(null);
                return;
            }

            const response = await getBookingDetails(bookingId, token);
            if (response.status === 200) {
                navigation.navigate('trip/ticket-details' as never, { ticketDetails: response.data } as never);
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des détails de la réservation');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des détails de la réservation');
        } finally {
            setIsLoadingBooking(null);
        }
    }, [navigation]);

    /**
     * Récupère les informations de l'utilisateur au montage de l'écran
     * et chaque fois que l'écran redevient actif (par exemple après modification du profil)
     */
    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const userInfo = await getUserInfo();
                    setUser(userInfo);
                    await getBookingList();
                } catch (error) {
                    console.error('Erreur lors du chargement des données:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }, [getUserInfo, getBookingList])
    );

    /**
     * Initialise la position du scroll au démarrage selon l'onglet actif
     */
    useEffect(() => {
        if (!isLoading && scrollViewRef.current) {
            // Petit délai pour s'assurer que le layout est prêt
            setTimeout(() => {
                const index = activeTab === 'info' ? 0 : 1;
                const scrollPosition = index * screenWidth;

                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({
                        x: scrollPosition,
                        animated: false
                    });
                }

                // Mettre à jour scrollX sans animation
                scrollX.setValue(scrollPosition);
            }, 100);
        }
    }, [isLoading]);

    /**
     * Navigue vers l'écran de modification du profil
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleUpdateUserInfo = useCallback(() => {
        router.push('/profile/edit');
    }, []);

    /**
     * Gère le pull to refresh pour recharger les données
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const userInfo = await getUserInfo();
            setUser(userInfo);
            await getBookingList();
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des données:', error);
        } finally {
            setRefreshing(false);
        }
    }, [getUserInfo, getBookingList]);

    /**
     * Filtre et recherche les réservations
     */
    const filteredBookings = useMemo(() => {
        return bookingList.filter((booking) => {
            // Filtre par recherche
            const matchesSearch =
                !searchQuery ||
                booking.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip?.stationFrom?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip?.stationTo?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

            // Filtre par statut (comparaison insensible à la casse)
            const matchesStatus = !selectedStatus ||
                booking.status?.toUpperCase() === selectedStatus.toUpperCase();

            return matchesSearch && matchesStatus;
        });
    }, [bookingList, searchQuery, selectedStatus]);

    /**
     * Partage l'application avec retour haptique
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleShareApp = useCallback(() => {
        // Déclenche un retour haptique lors du partage de l'application
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'ios') {
            Share.share({
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn.',
                url: 'https://allon-frontoffice-ng.onrender.com/home',
            });
        } else {
            Share.share({
                title: 'Partagez l\'application AllOn.',
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn via le lien suivant: https://allon-frontoffice-ng.onrender.com/home',
            });
        }
    }, []);

    /**
     * Gère le changement de thème avec retour haptique
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const handleThemeToggle = useCallback((value: boolean) => {
        // Déclenche un retour haptique lors du changement de thème
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleTheme();
    }, [toggleTheme]);

    /**
     * Récupère le drapeau d'un pays à partir de son code pays
     * Mémorisé avec useCallback pour éviter les recréations
     */
    const getFlagFromCountryCode = useCallback((countryCode: string) => {
        return COUNTRY_CODES.find(country => country.code === countryCode)?.label;
    }, [COUNTRY_CODES]);

    /**
     * Rendu du contenu de l'onglet Mes informations
     */
    /**
     * Rendu du contenu de l'onglet Mes informations
     * Amélioré avec une meilleure hiérarchie visuelle et des espacements optimisés
     */
    const renderPersonalInfoTab = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={themeColors.activeTab}
                    colors={[themeColors.activeTab]}
                />
            }
        >
            {/* Main Profile Card */}
            <View style={[styles.profileCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
                {/* <View style={styles.profileCardHeader}>
                    <Text style={[styles.businessLabel, { color: themeColors.secondaryText }]}>Profil Utilisateur</Text>
                    
                </View> */}

                <View style={styles.profileInfo}>
                    <View style={[
                        styles.profileImageContainer,
                        {
                            backgroundColor: themeColors.profileImagePlaceholderBackground,
                            borderColor: themeColors.border,
                            borderWidth: 1,
                        }
                    ]}>
                        {user?.picture ? (
                            <Image
                                source={{ uri: user?.picture }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={[styles.profileImagePlaceholder, { backgroundColor: themeColors.profileImagePlaceholderBackground }]}>
                                <MaterialCommunityIcons name="account" size={40} color={themeColors.secondaryText} />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.userName, { color: themeColors.text }]}>{fullName}</Text>
                    <Text style={[styles.userRole, { color: themeColors.secondaryText }]}>{formattedCivility}</Text>
                    {user?.company && (
                        <View style={styles.companyBadge}>
                            <MaterialCommunityIcons name="office-building" size={14} color={themeColors.activeTab} />
                            <Text style={[styles.userCompany, { color: themeColors.activeTab }]}>{user?.company}</Text>
                        </View>
                    )}
                </View>

                {/* Informations détaillées */}
                <View style={[styles.detailsSection, { borderTopColor: themeColors.border }]}>
                    <View style={[styles.detailRow, styles.detailRowSpacing]}>
                        <View style={styles.detailIconContainer}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={themeColors.activeTab} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: themeColors.text }]}>Email</Text>
                            <View style={styles.detailValueContainer}>
                                <Text style={[styles.detailValue, { color: themeColors.secondaryText }]} numberOfLines={1}>
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
                            <MaterialCommunityIcons name="account-outline" size={20} color={themeColors.activeTab} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: themeColors.text }]}>Nom d'utilisateur</Text>
                            <Text style={[styles.detailValue, { color: themeColors.secondaryText }]} numberOfLines={1}>
                                {user?.username ? `@${user.username}` : 'Non renseigné'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowSpacing]}>
                        <View style={styles.detailIconContainer}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color={themeColors.activeTab} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: themeColors.text }]}>Téléphone</Text>
                            <Text style={[styles.detailValue, { color: themeColors.secondaryText }]}>
                                {getFlagFromCountryCode(user?.phones?.[0]?.countryCode ?? '')} {user?.phones?.[0]?.digits ?? 'Non renseigné'}
                            </Text>
                        </View>
                    </View>
                    {user?.dateOfBirth && (
                        <View style={[styles.detailRow, styles.detailRowSpacing]}>
                            <View style={styles.detailIconContainer}>
                                <MaterialCommunityIcons name="calendar-outline" size={20} color={themeColors.activeTab} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: themeColors.text }]}>Date de naissance</Text>
                                <Text style={[styles.detailValue, { color: themeColors.secondaryText }]}>{formattedDateOfBirth}</Text>
                            </View>
                        </View>
                    )}
                    {user?.address && (
                        <View style={[styles.detailRow, styles.detailRowSpacing]}>
                            <View style={styles.detailIconContainer}>
                                <MaterialCommunityIcons name="map-marker-outline" size={20} color={themeColors.activeTab} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: themeColors.text }]}>Adresse</Text>
                                <Text style={[styles.detailValue, { color: themeColors.secondaryText, flexWrap: 'wrap' }]} numberOfLines={2}>
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
                    <View style={[styles.emergencySection, { borderTopColor: themeColors.border }]}>
                        <View style={styles.emergencyHeader}>
                            {/* <MaterialCommunityIcons name="alert-circle-outline" size={18} color={themeColors.activeTab} /> */}
                            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Contact d'urgence</Text>
                        </View>
                        <View style={[styles.emergencyInfo, { backgroundColor: themeColors.emergencyInfoBackground }]}>
                            {user?.contactUrgent?.firstName && user?.contactUrgent?.lastName && (
                                <Text style={[styles.emergencyName, { color: themeColors.text }]}>
                                    {user?.contactUrgent?.firstName ?? 'Non renseigné'} {user?.contactUrgent?.lastName ?? 'Non renseigné'}
                                </Text>
                            )}
                            {user?.contactUrgent?.phone?.digits && (
                                <View style={styles.emergencyDetails}>
                                    <View style={styles.emergencyDetailItem}>
                                        <MaterialCommunityIcons name="phone" size={14} color={themeColors.secondaryText} />
                                        <Text style={[styles.emergencyPhone, { color: themeColors.secondaryText }]}>
                                            {getFlagFromCountryCode(user?.contactUrgent?.phone?.countryCode ?? '')} {user?.contactUrgent?.phone?.digits ?? 'Non renseigné'}
                                        </Text>
                                    </View>
                                    <View style={styles.emergencyDetailItem}>
                                        <MaterialCommunityIcons name="account-heart" size={14} color={themeColors.secondaryText} />
                                        <Text style={[styles.emergencyRelation, { color: themeColors.secondaryText }]}>
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

            {/* Statistiques utilisateur */}
            <View style={styles.statsSection}>
                {/* Voyages effectués */}
                <View style={[styles.tripsCompletedCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
                    <View style={[styles.tripsIconContainer, { backgroundColor: themeColors.tripsIconContainerBackground }]}>
                        <MaterialCommunityIcons name="check-circle" size={24} color={themeColors.activeTab} />
                    </View>
                    <View style={styles.statsContent}>
                        <Text style={[styles.statsLabel, { color: themeColors.secondaryText }]}>Voyages effectués</Text>
                        <Text style={[styles.tripsCount, { color: themeColors.activeTab }]}>{user?.customerProfile?.totalTripsPaid ?? 0}</Text>
                    </View>
                </View>

                {/* Type de clients */}
                <View style={[styles.clientTypeCard, { backgroundColor: themeColors.clientTypeCardBackground, borderColor: themeColors.border }]}>
                    <View style={[styles.clientTypeIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                        <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.statsContent}>
                        <Text style={[styles.statsLabel, { color: themeColors.secondaryText }]}>Type de client</Text>
                        <Text style={[styles.clientTypeValue, { color: '#4CAF50' }]}>
                            {user?.customerProfile?.loyaltyTier && user.customerProfile.loyaltyTier.trim()
                                ? user.customerProfile.loyaltyTier.charAt(0).toUpperCase() + user.customerProfile.loyaltyTier.slice(1).toLowerCase()
                                : 'Bronze'}
                        </Text>
                    </View>
                </View>

                {/* AllOn Coin gagnés */}
                <View style={[styles.coinsCard, { backgroundColor: themeColors.coinsCardBackground, borderColor: themeColors.border }]}>
                    <View style={[styles.coinsIconContainer, { backgroundColor: 'rgba(255, 167, 38, 0.15)' }]}>
                        <MaterialCommunityIcons name="star" size={24} color="#FFA726" />
                    </View>
                    <View style={styles.statsContent}>
                        <Text style={[styles.statsLabel, { color: themeColors.secondaryText }]}>AllOn Coin gagnés</Text>
                        <Text style={[styles.coinsValue, { color: '#FFA726' }]}>{user?.customerProfile?.totalCoinsEarned ?? '0.00'}</Text>
                    </View>
                </View>
            </View>

            {/* Toggle Mode Dark */}
            <View style={[styles.themeToggleCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
                <View style={styles.themeToggleContent}>
                    <View style={[
                        styles.themeIconContainer,
                        { backgroundColor: isDarkMode ? 'rgba(255, 167, 38, 0.15)' : 'rgba(255, 193, 7, 0.15)' }
                    ]}>
                        <MaterialCommunityIcons
                            name={isDarkMode ? "weather-night" : "weather-sunny"}
                            size={24}
                            color={isDarkMode ? "#FFA726" : "#FFC107"}
                        />
                    </View>
                    <View style={styles.themeToggleTextContainer}>
                        <Text style={[styles.themeToggleLabel, { color: themeColors.text }]}>Mode sombre</Text>
                        <Text style={[styles.themeToggleDescription, { color: themeColors.secondaryText }]}>
                            {isDarkMode ? 'Activé' : 'Désactivé'}
                        </Text>
                    </View>
                </View>
                <Switch
                    value={isDarkMode}
                    onValueChange={handleThemeToggle}
                    trackColor={{ false: '#E0E0E0', true: '#1776BA' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                />
            </View>

            {/* Partage de l'application */}
            <View style={[styles.themeToggleCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
                <Pressable onPress={() => handleShareApp()} style={styles.themeToggleContent}>
                    <View style={[
                        styles.themeIconContainer,
                        { backgroundColor: themeColors.tripsIconContainerBackground }
                    ]}>
                        <MaterialCommunityIcons
                            name="share-outline"
                            size={24}
                            color={themeColors.activeTab}
                        />
                    </View>
                    <View style={styles.themeToggleTextContainer}>
                        <Text style={[styles.themeToggleLabel, { color: themeColors.text }]}>Partager l'application</Text>
                        <Text style={[styles.themeToggleDescription, { color: themeColors.secondaryText }]}>
                            Partagez l'application avec vos amis et vos proches.
                        </Text>
                    </View>
                </Pressable>
            </View>


            {/* Modify Button */}
            <Pressable
                style={[styles.upgradeButton, { backgroundColor: themeColors.activeTab }]}
                onPress={handleUpdateUserInfo}
            >
                <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Modifier mes informations</Text>
            </Pressable>
        </ScrollView>
    );

    /**
     * Label du statut sélectionné pour le filtre
     * Mémorisé pour éviter les recalculs
     */
    const selectedStatusLabel = useMemo(() => {
        return selectedStatus
            ? STATUS_OPTIONS.find(opt => opt.value === selectedStatus)?.label
            : 'Tous les statuts';
    }, [selectedStatus]);

    /**
     * Rendu du contenu de l'onglet Mes réservations
     */
    const renderTicketsTab = () => (
        <View style={[styles.ticketsContainer, { backgroundColor: themeColors.scrollBackground }]}>
            {/* Barre de recherche et filtre */}
            <View style={[styles.searchFilterContainer, { backgroundColor: themeColors.headerBackground }]}>
                <TextInput
                    style={[
                        styles.searchInput,
                        {
                            backgroundColor: themeColors.inputBackground,
                            borderColor: themeColors.border,
                            color: themeColors.text
                        }
                    ]}
                    placeholder="Rechercher par ville, référence ou compagnie"
                    placeholderTextColor={themeColors.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <Pressable
                    style={[
                        styles.statusFilter,
                        {
                            backgroundColor: themeColors.inputBackground,
                            borderColor: themeColors.border
                        }
                    ]}
                    onPress={() => setShowStatusModal(true)}
                >
                    <Text style={[
                        styles.statusFilterText,
                        { color: selectedStatus ? themeColors.text : themeColors.placeholder }
                    ]}>
                        {selectedStatusLabel}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={themeColors.secondaryText} />
                </Pressable>
            </View>

            {/* Liste des réservations */}
            {filteredBookings.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="ticket-outline" size={64} color={themeColors.inactiveIcon} />
                    <Text style={[styles.emptyStateText, { color: themeColors.text }]}>Aucun ticket disponible</Text>
                    <Text style={[styles.emptyStateSubtext, { color: themeColors.secondaryText }]}>Vos tickets de voyage apparaîtront ici</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={themeColors.activeTab}
                            colors={[themeColors.activeTab]}
                        />
                    }
                >
                    {filteredBookings.map((booking) => (
                        <View key={booking.id} style={[styles.bookingCard, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
                            {/* Route et date */}
                            <View style={styles.bookingHeader}>
                                <Text style={[styles.routeText, { color: themeColors.text }]}>
                                    {booking.trip.stationFrom.city} → {booking.trip.stationTo.city}
                                </Text>
                                <Text style={[styles.dateText, { color: themeColors.secondaryText }]}>
                                    {formatBookingDate(booking.departureDateTime)}
                                </Text>
                                <Text style={[styles.timeText, { color: themeColors.secondaryText }]}>
                                    {booking.departureTime} - {booking.arrivalTime}
                                </Text>
                            </View>

                            {/* Compagnie et passagers */}
                            <View style={styles.bookingInfo}>
                                <Text style={[styles.companyText, { color: themeColors.text }]}>{booking.companyName}</Text>
                                <Text style={[styles.passengersText, { color: themeColors.secondaryText }]}>
                                    {booking.passengers.length} passager(s)
                                </Text>
                            </View>

                            {/* Référence, prix et statut */}
                            <View style={styles.bookingFooter}>
                                <Text style={[styles.referenceText, { color: themeColors.secondaryText }]}>Réf: {booking.code}</Text>
                                <View style={styles.priceStatusContainer}>
                                    <Text style={[styles.priceText, { color: themeColors.activeTab }]}>
                                        {parseFloat(booking.totalAmount).toLocaleString('fr-FR')} {booking.currency}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status || ''), justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={styles.statusBadgeText}>
                                            {formatStatus(booking.status || '')}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Boutons d'action */}
                            <View style={styles.actionButtons}>
                                <Pressable
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: themeColors.activeTab,
                                            borderColor: themeColors.activeTab,
                                            opacity: isLoadingBooking === booking.id ? 0.7 : 1
                                        }
                                    ]}
                                    onPress={() => handleViewBooking(booking.id)}
                                    disabled={isLoadingBooking === booking.id}
                                >
                                    {isLoadingBooking === booking.id ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="eye-outline" size={20} color="#ffffff" />
                                            <Text style={styles.actionButtonText}>Ticket</Text>
                                        </>
                                    )}
                                </Pressable>
                                <Pressable
                                    style={[styles.actionButton, { backgroundColor: 'transparent', borderColor: themeColors.border }]}
                                    onPress={() => {
                                        navigation.navigate('trip/route-viewer' as never, { booking: JSON.stringify(booking) } as never);
                                    }}
                                >
                                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={themeColors.secondaryText} />
                                    <Text style={[styles.actionButtonText, { color: themeColors.secondaryText }]}>Itinéraire</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Modal de sélection du statut */}
            <Modal
                visible={showStatusModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowStatusModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]} onStartShouldSetResponder={() => true}>
                        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Choisir un statut</Text>
                            <Pressable onPress={() => setShowStatusModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={themeColors.icon} />
                            </Pressable>
                        </View>
                        <ScrollView>
                            {STATUS_OPTIONS.map((option) => (
                                <Pressable
                                    key={option.value}
                                    style={[styles.modalOption, { borderBottomColor: themeColors.modalBorder }]}
                                    onPress={() => {
                                        setSelectedStatus(option.value);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, { color: themeColors.text }]}>{option.label}</Text>
                                    {selectedStatus === option.value && (
                                        <MaterialCommunityIcons name="check" size={20} color={themeColors.activeTab} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );

    /**
     * Rendu de l'indicateur de chargement
     */
    const renderLoading = useCallback(() => (
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.scrollBackground }]}>
            <ActivityIndicator size="large" color={themeColors.activeTab} />
        </View>
    ), [themeColors.scrollBackground, themeColors.activeTab]);

    /**
     * Handlers pour les onglets
     * Version corrigée avec meilleure synchronisation
     */
    const handleTabPress = useCallback((tab: 'info' | 'tickets') => {
        // Mise à jour immédiate de l'onglet actif
        setActiveTab(tab);
        const index = tab === 'info' ? 0 : 1;
        const scrollPosition = index * screenWidth;

        // Marquer qu'on fait un scroll programmatique
        isProgrammaticScrollRef.current = true;

        // Scroll du ScrollView UNIQUEMENT
        // On laisse handleScrollEvent mettre à jour scrollX automatiquement
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                x: scrollPosition,
                animated: true
            });
        }

        // Réinitialiser le flag après un délai pour laisser l'animation se terminer
        setTimeout(() => {
            isProgrammaticScrollRef.current = false;
        }, 350); // Légèrement plus long que la durée de l'animation (300ms)

        // Retour haptique
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [screenWidth]);

    /**
     * Gère le scroll en temps réel pour animer l'indicateur
     * Version corrigée - met toujours à jour scrollX
     */
    const handleScrollEvent = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false,
            listener: (event: any) => {
                // Optionnel : logger pour debug
                // console.log('Scroll X:', event.nativeEvent.contentOffset.x);
            }
        }
    );

    /**
     * Gère le changement d'onglet lors du swipe terminé
     * Version corrigée avec tolérance
     */
    const handleScrollEnd = useCallback((event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / screenWidth);
        const newTab = index === 0 ? 'info' : 'tickets';

        if (newTab !== activeTab) {
            setActiveTab(newTab);
            // Retour haptique lors du changement d'onglet par swipe
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // S'assurer que le scroll est bien aligné
        if (Math.abs(offsetX - (index * screenWidth)) > 1) {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                    x: index * screenWidth,
                    animated: true
                });
            }
        }
    }, [screenWidth, activeTab]);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.scrollBackground }]}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: themeColors.headerBackground,
                    borderBottomColor: themeColors.headerBorder
                }
            ]}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Mon profil</Text>
                <Pressable style={styles.headerButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={themeColors.icon} />
                </Pressable>
            </View>

            {/* Tabs Navigation */}
            <View style={[styles.tabsContainer, { backgroundColor: themeColors.headerBackground, borderBottomColor: themeColors.headerBorder }]}>
                <View style={styles.tabsWrapper}>
                    <Pressable
                        style={styles.tab}
                        onPress={() => handleTabPress('info')}
                    >
                        <MaterialCommunityIcons
                            name="account-outline"
                            size={20}
                            color={activeTab === 'info' ? themeColors.activeTab : themeColors.inactiveIcon}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'info' ? themeColors.activeTab : themeColors.inactiveTabText },
                            activeTab === 'info' && styles.tabTextActive
                        ]}>
                            Mes informations
                        </Text>
                    </Pressable>
                    <Pressable
                        style={styles.tab}
                        onPress={() => handleTabPress('tickets')}
                    >
                        <MaterialCommunityIcons
                            name="ticket-outline"
                            size={20}
                            color={activeTab === 'tickets' ? themeColors.activeTab : themeColors.inactiveIcon}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'tickets' ? themeColors.activeTab : themeColors.inactiveTabText },
                            activeTab === 'tickets' && styles.tabTextActive
                        ]}>
                            Mes tickets
                        </Text>
                    </Pressable>
                </View>
                {/* Indicateur animé qui suit le swipe */}
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            backgroundColor: themeColors.activeTab,
                            transform: [{
                                translateX: scrollX.interpolate({
                                    inputRange: [0, screenWidth],
                                    outputRange: [
                                        25.5 + 0.075 * screenWidth,
                                        -4.5 + 0.575 * screenWidth
                                    ],
                                    extrapolate: 'clamp',
                                }),
                            }],
                        },
                    ]}
                />
            </View>

            {/* Tab Content avec swipe horizontal */}
            {isLoading ? (
                renderLoading()
            ) : (
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScrollEvent}
                    onMomentumScrollEnd={handleScrollEnd}
                    scrollEventThrottle={16}
                    style={styles.tabScrollView}
                    contentContainerStyle={{ width: screenWidth * 2 }}
                >
                    <View style={[styles.tabPage, { width: screenWidth }]}>
                        {renderPersonalInfoTab()}
                    </View>
                    <View style={[styles.tabPage, { width: screenWidth }]}>
                        {renderTicketsTab()}
                    </View>
                </ScrollView>
            )}

            {/* Modal de confirmation de déconnexion */}
            <Modal
                visible={showLogoutModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowLogoutModal(false)}
                >
                    <View
                        style={[
                            styles.logoutModalContent,
                            { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={[styles.logoutModalTitle, { color: themeColors.text }]}>
                            Déconnexion
                        </Text>
                        <Text style={[styles.logoutModalMessage, { color: themeColors.secondaryText }]}>
                            Êtes-vous sûr de vouloir vous déconnecter ?
                        </Text>
                        <View style={styles.logoutModalButtons}>
                            <Pressable
                                style={[
                                    styles.logoutModalButton,
                                    styles.logoutModalButtonCancel,
                                    { borderColor: themeColors.border }
                                ]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={[styles.logoutModalButtonText, { color: themeColors.text }]}>
                                    Annuler
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[styles.logoutModalButton, styles.logoutModalButtonConfirm]}
                                onPress={confirmLogout}
                            >
                                <Text style={styles.logoutModalButtonTextConfirm}>
                                    Déconnexion
                                </Text>
                            </Pressable>
                        </View>
                    </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 32,
    },
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
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
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
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
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
    addNewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addNewContent: {
        flex: 1,
    },
    addNewTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    addNewSubtitle: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1776BA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    socialContent: {
        flex: 1,
    },
    socialIcons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    socialCount: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    socialLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    socialDecoration: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1776BA',
        opacity: 0.1,
    },
    upgradeButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
        marginTop: 8,
        borderWidth: 0,
    },
    upgradeButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    logoutButton: {
        backgroundColor: '#DC3545',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    logoutButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    recentFriendsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    recentFriendsTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    friendImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
        marginBottom: 2,
    },
    friendLocation: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    statsSection: {
        gap: 14,
        marginBottom: 20,
    },
    tripsCompletedCard: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
    },
    tripsIconContainer: {
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
    tripsCount: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
    },
    clientTypeCard: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
    },
    clientTypeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clientTypeValue: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
    },
    coinsCard: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
    },
    coinsIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinsValue: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
    },
    tabsContainer: {
        position: 'relative',
        borderBottomWidth: 1,
        paddingHorizontal: 30,
    },
    tabsWrapper: {
        flexDirection: 'row',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '35%',
        height: 2,
        borderRadius: 1,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    tabTextActive: {
        fontFamily: 'Ubuntu_Medium',
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyStateText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    ticketsContainer: {
        flex: 1,
    },
    searchFilterContainer: {
        padding: 16,
        gap: 12,
    },
    searchInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
    },
    statusFilter: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    statusFilterText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    statusFilterPlaceholder: {
        // Couleur gérée dynamiquement
    },
    bookingCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    bookingHeader: {
        marginBottom: 12,
    },
    routeText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    bookingInfo: {
        marginBottom: 12,
    },
    companyText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    passengersText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    referenceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
    priceStatusContainer: {
        alignItems: 'flex-end',
        gap: 8,
    },
    priceText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        minHeight: 44,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
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
        color: '#666',
    },
    logoutModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '50%',
    },
    logoutModalTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    logoutModalMessage: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 24,
    },
    logoutModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 24,
    },
    logoutModalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutModalButtonCancel: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        // backgroundColor: '#FFFFFF',
    },
    logoutModalButtonConfirm: {
        backgroundColor: '#DC3545',
    },
    logoutModalButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    logoutModalButtonTextConfirm: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    themeToggleCard: {
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    themeToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    themeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeToggleTextContainer: {
        flex: 1,
    },
    themeToggleLabel: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    themeToggleDescription: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    tabScrollView: {
        flex: 1,
    },
    tabPage: {
        flex: 1,
    },
});

