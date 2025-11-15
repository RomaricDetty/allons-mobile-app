// @ts-nocheck
import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { formatBookingDate, formatStatus, getStatusColor } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Booking, ProfileScreenProps, User } from '@/interfaces';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const ProfileScreen = ({ onLogout }: ProfileScreenProps) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F3F3F7';
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const inactiveIconColor = colorScheme === 'dark' ? '#9BA1A6' : '#9E9E9E';
    const inactiveTabTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#9E9E9E';
    const activeTabColor = tintColor === '#fff' ? '#1776BA' : tintColor;
    const modalBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const modalBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#F0F0F0';
    const emergencyInfoBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5';
    const profileImagePlaceholderBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const tripsIconContainerBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#E3F2FD';
    const clientTypeCardBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#E8F5E9';
    const coinsCardBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#FFF3E0';
    const actionButtonBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

    const [user, setUser] = useState<User | null>(null);
    const [bookingList, setBookingList] = useState<Booking[] | any>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
    const [searchQuery, setSearchQuery] = useState<string | any>('');
    const [selectedStatus, setSelectedStatus] = useState<string | any>('');
    const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // Ajouter un état pour le modal de confirmation
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    /**
     * Formate le nom complet de l'utilisateur
     */
    const getFullName = () => {
        const parts = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean);
        return parts.join(' ');
    };

    /**
     * Formate la date de naissance pour l'affichage
     */
    const formatDateOfBirth = () => {
        if (!user?.dateOfBirth) return 'Non renseigné';
        const date = new Date(user?.dateOfBirth);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    /**
     * Formate la civilité pour l'affichage
     */
    const formatCivility = () => {
        const civilityMap: { [key: string]: string } = {
            'MR': 'Monsieur',
            'MRS': 'Madame',
            'MISS': 'Mademoiselle',
        };
        return civilityMap[user?.civility] || user?.civility;
    };

    /**
     * Gère la déconnexion de l'utilisateur
     */
    const handleLogout = async () => {
        setShowLogoutModal(true);
    };

    /**
     * Confirme et exécute la déconnexion
     */
    const confirmLogout = async () => {
        setShowLogoutModal(false);
        try {
            const onboardingValue = await AsyncStorage.getItem('onboarding');
            await AsyncStorage.multiRemove([
                'token',
                'refresh_token',
                'expires_at',
                'token_type',
            ]);
            if (onboardingValue) {
                await AsyncStorage.setItem('onboarding', onboardingValue);
            }
            onLogout();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
        }
    };

    /**
     * Récupère les informations de l'utilisateur
     */
    const getUserInfo = async () => {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('user_id');
        const response = await authGetUserInfo(userId, token);
        // console.log('response user info: ', response);
        if (response.status === 200) {
            return response.data;
        } else {
            Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations de l\'utilisateur');
            return null;
        }
    };

    /**
     * Récupère la liste des réservations de l'utilisateur
     */
    const getBookingList = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('user_id');
            console.log('userId getBookingList : ', userId);
            console.log('token getBookingList : ', token);
            const response = await bookingListInfo(userId as string, token as string);
            console.log('response booking list: ', response);
            if (response.status === 200 && response.data?.items) {
                setBookingList(response.data.items);
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération de la liste des réservations');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste des réservations:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération de la liste des réservations');
        }
    };

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
                    getFullName();
                    formatDateOfBirth();
                    formatCivility();
                    await getBookingList();
                } catch (error) {
                    console.error('Erreur lors du chargement des données:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }, [])
    );

    /**
     * Navigue vers l'écran de modification du profil
     */
    const handleUpdateUserInfo = () => {
        router.push('/profile/edit');
    };

    /**
     * Options de statut pour le filtre
     */
    const statusOptions = [
        { value: '', label: '--Choisir un statut--' },
        { value: 'PAID', label: 'Payé' },
        { value: 'PENDING', label: 'En attente' },
        { value: 'CANCELLED', label: 'Annulé' },
        { value: 'REFUNDED', label: 'Remboursé' },
    ];

    /**
     * Filtre et recherche les réservations
     */
    const filteredBookings = useMemo(() => {
        return bookingList.filter((booking) => {
            // Filtre par recherche
            const matchesSearch = 
                !searchQuery ||
                booking.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip.stationFrom.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip.stationTo.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.companyName.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Filtre par statut
            const matchesStatus = !selectedStatus || booking.status === selectedStatus;
            
            return matchesSearch && matchesStatus;
        });
    }, [bookingList, searchQuery, selectedStatus]);

    /**
     * Rendu du contenu de l'onglet Mes informations
     */
    const renderPersonalInfoTab = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
                {/* Main Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.profileCardHeader}>
                        <Text style={[styles.businessLabel, { color: secondaryTextColor }]}>Profil Utilisateur</Text>
                        <View style={[styles.statusBadge, { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between', alignItems: 'center' }]}>
                            <View style={[styles.statusDot, { backgroundColor: user?.active ? '#4CAF50' : '#9E9E9E' }]} />
                            <Text style={[styles.statusLabel, { color: secondaryTextColor }]}>{user?.active ? 'Actif' : 'Inactif'}</Text>
                        </View>
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={[styles.profileImageContainer, { backgroundColor: profileImagePlaceholderBackgroundColor }]}>
                            {user?.picture ? (
                                <Image
                                    source={{ uri: user?.picture }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={[styles.profileImagePlaceholder, { backgroundColor: profileImagePlaceholderBackgroundColor }]}>
                                    <MaterialCommunityIcons name="account" size={40} color={secondaryTextColor} />
                                </View>
                            )}
                        </View>
                        <Text style={[styles.userName, { color: textColor }]}>{getFullName() || 'Non renseigné'}</Text>
                        <Text style={[styles.userRole, { color: secondaryTextColor }]}>{formatCivility()}</Text>
                        {user?.company && (
                            <Text style={[styles.userCompany, { color: activeTabColor }]}>{user?.company}</Text>
                        )}
                    </View>

                    {/* Informations détaillées */}
                    <View style={[styles.detailsSection, { borderTopColor: borderColor }]}>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="email-outline" size={18} color={secondaryTextColor} />
                            <Text style={[styles.detailLabel, { color: textColor }]}>Email:</Text>
                            <Text style={[styles.detailValue, { color: secondaryTextColor }]}>{user?.email}</Text>
                            {user?.isEmailVerified && (
                                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                            )}
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="account-outline" size={18} color={secondaryTextColor} />
                            <Text style={[styles.detailLabel, { color: textColor }]}>Nom d'utilisateur:</Text>
                            <Text style={[styles.detailValue, { color: secondaryTextColor }]}>@{user?.username}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color={secondaryTextColor} />
                            <Text style={[styles.detailLabel, { color: textColor }]}>Téléphone:</Text>
                            <Text style={[styles.detailValue, { color: secondaryTextColor }]}>+225 {user?.phones?.[0]?.digits}</Text>
                        </View>
                        {user?.dateOfBirth && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="calendar-outline" size={18} color={secondaryTextColor} />
                                <Text style={[styles.detailLabel, { color: textColor }]}>Date de naissance:</Text>
                                <Text style={[styles.detailValue, { color: secondaryTextColor }]}>{formatDateOfBirth()}</Text>
                            </View>
                        )}
                        {user?.address && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="map-marker-outline" size={18} color={secondaryTextColor} />
                                <Text style={[styles.detailLabel, { color: textColor }]}>Adresse:</Text>
                                <Text style={[styles.detailValue, { color: secondaryTextColor }]}>{user?.address}</Text>
                            </View>
                        )}
                    </View>

                    {/* Contact d'urgence */}
                    {user?.contactUrgent && (
                        <View style={[styles.emergencySection, { borderTopColor: borderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Contact d'urgence</Text>
                            <View style={[styles.emergencyInfo, { backgroundColor: emergencyInfoBackgroundColor }]}>
                                <Text style={[styles.emergencyName, { color: textColor }]}>{user?.contactUrgent.fullName}</Text>
                                <Text style={[styles.emergencyPhone, { color: secondaryTextColor }]}>{user?.contactUrgent.phone}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Statistiques utilisateur */}
                <View style={styles.statsSection}>
                    {/* Voyages effectués */}
                    <View style={[styles.tripsCompletedCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <View style={[styles.tripsIconContainer, { backgroundColor: tripsIconContainerBackgroundColor }]}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={activeTabColor} />
                        </View>
                        <View style={styles.statsContent}>
                            <Text style={[styles.statsLabel, { color: secondaryTextColor }]}>Voyages effectués</Text>
                            <Text style={[styles.tripsCount, { color: activeTabColor }]}>{user?.customerProfile?.totalTripsPaid ?? 0}</Text>
                        </View>
                    </View>

                    {/* Type de clients */}
                    <View style={[styles.clientTypeCard, { backgroundColor: clientTypeCardBackgroundColor, borderColor }]}>
                        <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                        <View style={styles.statsContent}>
                            <Text style={[styles.statsLabel, { color: secondaryTextColor }]}>Type de client</Text>
                            <Text style={[styles.clientTypeValue, { color: '#4CAF50' }]}>{user?.customerProfile?.loyaltyTier ?? 'bronze'}</Text>
                        </View>
                    </View>

                    {/* AllOn Coin gagnés */}
                    <View style={[styles.coinsCard, { backgroundColor: coinsCardBackgroundColor, borderColor }]}>
                        <MaterialCommunityIcons name="star" size={24} color="#FFA726" />
                        <View style={styles.statsContent}>
                            <Text style={[styles.statsLabel, { color: secondaryTextColor }]}>AllOn Coin gagnés</Text>
                            <Text style={[styles.coinsValue, { color: '#FFA726' }]}>{user?.customerProfile?.totalCoinsEarned ?? '0.00'}</Text>
                        </View>
                    </View>
                </View>

                {/* Modify Button */}
                <Pressable style={styles.upgradeButton} onPress={handleUpdateUserInfo}>
                    <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
                    <Text style={styles.upgradeButtonText}>Modifier mes informations</Text>
                </Pressable>
        </ScrollView>
    );

    /**
     * Rendu du contenu de l'onglet Mes réservations
     */
    const renderTicketsTab = () => (
        <View style={[styles.ticketsContainer, { backgroundColor: scrollBackgroundColor }]}>
            {/* Barre de recherche et filtre */}
            <View style={[styles.searchFilterContainer, { backgroundColor: headerBackgroundColor }]}>
                <TextInput
                    style={[
                        styles.searchInput,
                        {
                            backgroundColor: inputBackgroundColor,
                            borderColor,
                            color: textColor
                        }
                    ]}
                    placeholder="Rechercher par ville, référence ou compagnie"
                    placeholderTextColor={placeholderColor}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <Pressable
                    style={[
                        styles.statusFilter,
                        {
                            backgroundColor: inputBackgroundColor,
                            borderColor
                        }
                    ]}
                    onPress={() => setShowStatusModal(true)}
                >
                    <Text style={[
                        styles.statusFilterText,
                        { color: selectedStatus ? textColor : placeholderColor }
                    ]}>
                        {selectedStatus ? statusOptions.find(opt => opt.value === selectedStatus)?.label : '-- Choisir un statut --'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={secondaryTextColor} />
                </Pressable>
            </View>

            {/* Liste des réservations */}
            {filteredBookings.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="ticket-outline" size={64} color={inactiveIconColor} />
                    <Text style={[styles.emptyStateText, { color: textColor }]}>Aucun ticket disponible</Text>
                    <Text style={[styles.emptyStateSubtext, { color: secondaryTextColor }]}>Vos tickets de voyage apparaîtront ici</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredBookings.map((booking) => (
                        <View key={booking.id} style={[styles.bookingCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            {/* Route et date */}
                            <View style={styles.bookingHeader}>
                                <Text style={[styles.routeText, { color: textColor }]}>
                                    {booking.trip.stationFrom.city} → {booking.trip.stationTo.city}
                                </Text>
                                <Text style={[styles.dateText, { color: secondaryTextColor }]}>
                                    {formatBookingDate(booking.departureDateTime)}
                                </Text>
                                <Text style={[styles.timeText, { color: secondaryTextColor }]}>
                                    {booking.departureTime} - {booking.arrivalTime}
                                </Text>
                            </View>

                            {/* Compagnie et passagers */}
                            <View style={styles.bookingInfo}>
                                <Text style={[styles.companyText, { color: textColor }]}>{booking.companyName}</Text>
                                <Text style={[styles.passengersText, { color: secondaryTextColor }]}>
                                    {booking.passengers.length} passager(s)
                                </Text>
                            </View>

                            {/* Référence, prix et statut */}
                            <View style={styles.bookingFooter}>
                                <Text style={[styles.referenceText, { color: secondaryTextColor }]}>Réf: {booking.code}</Text>
                                <View style={styles.priceStatusContainer}>
                                    <Text style={[styles.priceText, { color: activeTabColor }]}>
                                        {parseFloat(booking.totalAmount).toLocaleString('fr-FR')} {booking.currency}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status), justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={styles.statusBadgeText}>
                                            {formatStatus(booking.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Boutons d'action */}
                            <View style={styles.actionButtons}>
                                <Pressable style={[styles.actionButton, { backgroundColor: activeTabColor, borderColor: activeTabColor }]}>
                                    <MaterialCommunityIcons name="eye-outline" size={20} color="#ffffff" />
                                </Pressable>
                                <Pressable style={[styles.actionButton, { backgroundColor: actionButtonBackgroundColor, borderColor }]}>
                                    <MaterialCommunityIcons name="download" size={20} color={secondaryTextColor} />
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
                animationType="slide"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowStatusModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: modalBackgroundColor }]} onStartShouldSetResponder={() => true}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Choisir un statut</Text>
                            <Pressable onPress={() => setShowStatusModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={iconColor} />
                            </Pressable>
                        </View>
                        <ScrollView>
                            {statusOptions.map((option) => (
                                <Pressable
                                    key={option.value}
                                    style={[styles.modalOption, { borderBottomColor: modalBorderColor }]}
                                    onPress={() => {
                                        setSelectedStatus(option.value);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, { color: textColor }]}>{option.label}</Text>
                                    {selectedStatus === option.value && (
                                        <MaterialCommunityIcons name="check" size={20} color={activeTabColor} />
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
    const renderLoading = () => (
        <View style={[styles.loadingContainer, { backgroundColor: scrollBackgroundColor }]}>
            <ActivityIndicator size="large" color={activeTabColor} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Text style={[styles.headerTitle, { color: textColor }]}>Mon profil</Text>
                <Pressable style={styles.headerButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={iconColor} />
                </Pressable>
            </View>

            {/* Tabs Navigation */}
            <View style={[styles.tabsContainer, { backgroundColor: headerBackgroundColor, borderBottomColor: headerBorderColor }]}>
                <Pressable
                    style={[styles.tab, activeTab === 'info' && { borderBottomColor: activeTabColor }]}
                    onPress={() => setActiveTab('info')}
                >
                    <MaterialCommunityIcons
                        name="account-outline"
                        size={20}
                        color={activeTab === 'info' ? activeTabColor : inactiveIconColor}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'info' ? activeTabColor : inactiveTabTextColor },
                        activeTab === 'info' && styles.tabTextActive
                    ]}>
                        Mes informations
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'tickets' && { borderBottomColor: activeTabColor }]}
                    onPress={() => setActiveTab('tickets')}
                >
                    <MaterialCommunityIcons
                        name="ticket-outline"
                        size={20}
                        color={activeTab === 'tickets' ? activeTabColor : inactiveIconColor}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'tickets' ? activeTabColor : inactiveTabTextColor },
                        activeTab === 'tickets' && styles.tabTextActive
                    ]}>
                        Mes tickets
                    </Text>
                </Pressable>
            </View>

            {/* Tab Content */}
            {isLoading ? renderLoading() : (activeTab === 'info' ? renderPersonalInfoTab() : renderTicketsTab())}

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
                            { backgroundColor: cardBackgroundColor, borderColor }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={[styles.logoutModalTitle, { color: textColor }]}>
                            Déconnexion
                        </Text>
                        <Text style={[styles.logoutModalMessage, { color: secondaryTextColor }]}>
                            Êtes-vous sûr de vouloir vous déconnecter ?
                        </Text>
                        <View style={styles.logoutModalButtons}>
                            <Pressable
                                style={[
                                    styles.logoutModalButton,
                                    styles.logoutModalButtonCancel,
                                    { borderColor }
                                ]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={[styles.logoutModalButtonText, { color: textColor }]}>
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
        padding: 16,
    },
    profileCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    profileCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    businessLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    profileInfo: {
        alignItems: 'center',
        marginBottom: 16,
    },
    profileImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 12,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    userCompany: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsSection: {
        paddingTop: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        minWidth: 120,
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    emergencySection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    emergencyInfo: {
        borderRadius: 8,
        padding: 12,
    },
    emergencyName: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    emergencyPhone: {
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
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
        marginTop: 16,
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
        gap: 12,
        marginBottom: 16,
    },
    tripsCompletedCard: {
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
    },
    tripsIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContent: {
        flex: 1,
    },
    statsLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    tripsCount: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
    },
    clientTypeCard: {
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
    },
    clientTypeValue: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        textTransform: 'lowercase',
    },
    coinsCard: {
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
    },
    coinsValue: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingHorizontal: 30,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
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
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 100,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});

