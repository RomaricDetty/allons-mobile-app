// @ts-nocheck
import { authGetUserInfo, bookingListInfo } from '@/api/auth_register';
import { formatBookingDate, formatStatus, getStatusColor } from '@/constants/functions';
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
    const [user, setUser] = useState<User | null>(null);
    const [bookingList, setBookingList] = useState<Booking[] | any>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
    const [searchQuery, setSearchQuery] = useState<string | any>('');
    const [selectedStatus, setSelectedStatus] = useState<string | any>('');
    const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
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
     * Supprime tous les éléments d'AsyncStorage sauf 'onboarding'
     */
    const handleLogout = async () => {
        Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
                {
                    text: 'Annuler',
                    style: 'cancel',
                    color: '#000',
                },
                {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Récupérer la valeur d'onboarding avant de tout supprimer
                            const onboardingValue = await AsyncStorage.getItem('onboarding');

                            // Supprimer toutes les clés
                            await AsyncStorage.multiRemove([
                                'token',
                                'refresh_token',
                                'expires_at',
                                'token_type',
                            ]);

                            // Remettre la valeur d'onboarding si elle existait
                            if (onboardingValue) {
                                await AsyncStorage.setItem('onboarding', onboardingValue);
                            }

                            // Appeler le callback de déconnexion
                            onLogout();
                        } catch (error) {
                            console.error('Erreur lors de la déconnexion:', error);
                            Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
                        }
                    },
                },
            ]
        );
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
                <View style={styles.profileCard}>
                    <View style={styles.profileCardHeader}>
                        <Text style={styles.businessLabel}>Profil Utilisateur</Text>
                        <View style={[styles.statusBadge, { flexDirection: 'row', alignItems: 'center', gap: 6,justifyContent: 'space-between', alignItems: 'center' }]}>
                            <View style={[styles.statusDot, { backgroundColor: user?.active ? '#4CAF50' : '#9E9E9E' }]} />
                            <Text style={styles.statusLabel}>{user?.active ? 'Actif' : 'Inactif'}</Text>
                        </View>
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.profileImageContainer}>
                            {user?.picture ? (
                                <Image
                                    source={{ uri: user?.picture }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={styles.profileImagePlaceholder}>
                                    <MaterialCommunityIcons name="account" size={40} color="#666" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.userName}>{getFullName() || 'Non renseigné'}</Text>
                        <Text style={styles.userRole}>{formatCivility()}</Text>
                        {user?.company && (
                            <Text style={styles.userCompany}>{user?.company}</Text>
                        )}
                    </View>

                    {/* Informations détaillées */}
                    <View style={styles.detailsSection}>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="email-outline" size={18} color="#666" />
                            <Text style={styles.detailLabel}>Email:</Text>
                            <Text style={styles.detailValue}>{user?.email}</Text>
                            {user?.isEmailVerified && (
                                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                            )}
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="account-outline" size={18} color="#666" />
                            <Text style={styles.detailLabel}>Nom d'utilisateur:</Text>
                            <Text style={styles.detailValue}>@{user?.username}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color="#666" />
                            <Text style={styles.detailLabel}>Téléphone:</Text>
                            <Text style={styles.detailValue}>+225 {user?.phones?.[0]?.digits}</Text>
                        </View>
                        {user?.dateOfBirth && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="calendar-outline" size={18} color="#666" />
                                <Text style={styles.detailLabel}>Date de naissance:</Text>
                                <Text style={styles.detailValue}>{formatDateOfBirth()}</Text>
                            </View>
                        )}
                        {user?.address && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#666" />
                                <Text style={styles.detailLabel}>Adresse:</Text>
                                <Text style={styles.detailValue}>{user?.address}</Text>
                            </View>
                        )}
                    </View>

                    {/* Contact d'urgence */}
                    {user?.contactUrgent && (
                        <View style={styles.emergencySection}>
                            <Text style={styles.sectionTitle}>Contact d'urgence</Text>
                            <View style={styles.emergencyInfo}>
                                <Text style={styles.emergencyName}>{user?.contactUrgent.fullName}</Text>
                                <Text style={styles.emergencyPhone}>{user?.contactUrgent.phone}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Statistiques utilisateur */}
                <View style={styles.statsSection}>
                    {/* Voyages effectués */}
                    <View style={styles.tripsCompletedCard}>
                        <View style={styles.tripsIconContainer}>
                            <MaterialCommunityIcons name="check-circle" size={24} color="#1776BA" />
                        </View>
                        <View style={styles.statsContent}>
                            <Text style={styles.statsLabel}>Voyages effectués</Text>
                            <Text style={styles.tripsCount}>{user?.customerProfile?.totalTripsPaid ?? 0}</Text>
                        </View>
                    </View>

                    {/* Type de clients */}
                    <View style={styles.clientTypeCard}>
                        <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                        <View style={styles.statsContent}>
                            <Text style={styles.statsLabel}>Type de client</Text>
                            <Text style={styles.clientTypeValue}>{user?.customerProfile?.loyaltyTier ?? 'bronze'}</Text>
                        </View>
                    </View>

                    {/* AllOn Coin gagnés */}
                    <View style={styles.coinsCard}>
                        <MaterialCommunityIcons name="star" size={24} color="#FFA726" />
                        <View style={styles.statsContent}>
                            <Text style={styles.statsLabel}>AllOn Coin gagnés</Text>
                            <Text style={styles.coinsValue}>{user?.customerProfile?.totalCoinsEarned ?? '0.00'}</Text>
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
        <View style={styles.ticketsContainer}>
            {/* Barre de recherche et filtre */}
            <View style={styles.searchFilterContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher par ville, référence ou compagnie"
                    placeholderTextColor="#A6A6AA"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <Pressable
                    style={styles.statusFilter}
                    onPress={() => setShowStatusModal(true)}
                >
                    <Text style={[styles.statusFilterText, !selectedStatus && styles.statusFilterPlaceholder]}>
                        {selectedStatus ? statusOptions.find(opt => opt.value === selectedStatus)?.label : '-- Choisir un statut --'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                </Pressable>
            </View>

            {/* Liste des réservations */}
            {filteredBookings.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="ticket-outline" size={64} color="#9E9E9E" />
                    <Text style={styles.emptyStateText}>Aucun ticket disponible</Text>
                    <Text style={styles.emptyStateSubtext}>Vos tickets de voyage apparaîtront ici</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredBookings.map((booking) => (
                        <View key={booking.id} style={styles.bookingCard}>
                            {/* Route et date */}
                            <View style={styles.bookingHeader}>
                                <Text style={styles.routeText}>
                                    {booking.trip.stationFrom.city} → {booking.trip.stationTo.city}
                                </Text>
                                <Text style={styles.dateText}>
                                    {formatBookingDate(booking.departureDateTime)}
                                </Text>
                                <Text style={styles.timeText}>
                                    {booking.departureTime} - {booking.arrivalTime}
                                </Text>
                            </View>

                            {/* Compagnie et passagers */}
                            <View style={styles.bookingInfo}>
                                <Text style={styles.companyText}>{booking.companyName}</Text>
                                <Text style={styles.passengersText}>
                                    {booking.passengers.length} passager(s)
                                </Text>
                            </View>

                            {/* Référence, prix et statut */}
                            <View style={styles.bookingFooter}>
                                <Text style={styles.referenceText}>Réf: {booking.code}</Text>
                                <View style={styles.priceStatusContainer}>
                                    <Text style={styles.priceText}>
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
                                <Pressable style={[styles.actionButton, { backgroundColor: '#1776BA' }]}>
                                    <MaterialCommunityIcons name="eye-outline" size={20} color="#ffffff" />
                                </Pressable>
                                <Pressable style={styles.actionButton}>
                                    <MaterialCommunityIcons name="download" size={20} color="#666" />
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
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choisir un statut</Text>
                            <Pressable onPress={() => setShowStatusModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#000" />
                            </Pressable>
                        </View>
                        <ScrollView>
                            {statusOptions.map((option) => (
                                <Pressable
                                    key={option.value}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        setSelectedStatus(option.value);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{option.label}</Text>
                                    {selectedStatus === option.value && (
                                        <MaterialCommunityIcons name="check" size={20} color="#1776BA" />
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
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1776BA" />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>Mon profil</Text>
                <Pressable style={styles.headerButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color="#000" />
                </Pressable>
            </View>

            {/* Tabs Navigation */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                    onPress={() => setActiveTab('info')}
                >
                    <MaterialCommunityIcons
                        name="account-outline"
                        size={20}
                        color={activeTab === 'info' ? '#1776BA' : '#9E9E9E'}
                    />
                    <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                        Mes informations
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
                    onPress={() => setActiveTab('tickets')}
                >
                    <MaterialCommunityIcons
                        name="ticket-outline"
                        size={20}
                        color={activeTab === 'tickets' ? '#1776BA' : '#9E9E9E'}
                    />
                    <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>
                        Mes tickets
                    </Text>
                </Pressable>
            </View>

            {/* Tab Content */}
            {isLoading ? renderLoading() : (activeTab === 'info' ? renderPersonalInfoTab() : renderTicketsTab())}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F3F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        // paddingTop: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
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
        color: '#666',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        backgroundColor: '#E0E0E0',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
        marginBottom: 4,
    },
    userCompany: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#1776BA',
    },
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E0E0E0',
    },
    detailsSection: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
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
        color: '#000',
        minWidth: 120,
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    emergencySection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 8,
    },
    emergencyInfo: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
    },
    emergencyName: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
        marginBottom: 4,
    },
    emergencyPhone: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    tripsIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContent: {
        flex: 1,
    },
    statsLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
        marginBottom: 4,
    },
    tripsCount: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
    },
    clientTypeCard: {
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    clientTypeValue: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#4CAF50',
        textTransform: 'lowercase',
    },
    coinsCard: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    coinsValue: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFA726',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
    tabActive: {
        borderBottomColor: '#1776BA',
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#9E9E9E',
    },
    tabTextActive: {
        fontFamily: 'Ubuntu_Medium',
        color: '#1776BA',
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
        color: '#000',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    ticketsContainer: {
        flex: 1,
        backgroundColor: '#F3F3F7',
    },
    searchFilterContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        gap: 12,
    },
    searchInput: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    statusFilter: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    statusFilterText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    statusFilterPlaceholder: {
        color: '#A6A6AA',
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    bookingHeader: {
        marginBottom: 12,
    },
    routeText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    bookingInfo: {
        marginBottom: 12,
    },
    companyText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 4,
    },
    passengersText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        color: '#666',
        flex: 1,
    },
    priceStatusContainer: {
        alignItems: 'flex-end',
        gap: 8,
    },
    priceText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
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
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
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
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F3F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
});

