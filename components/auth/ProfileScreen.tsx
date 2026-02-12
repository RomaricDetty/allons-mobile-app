// @ts-nocheck
import { getLocationList } from '@/api/auth_register';
import { useAppColors } from '@/hooks/use-app-colors';
import { useProfileData } from '@/hooks/useProfileData';
import { Booking, ProfileScreenProps } from '@/interfaces';
import { clearAuthData } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    BookingCard,
    BookingFilters,
    BusRentalRequestCard,
    LogoutModal,
    PersonalInfoCard,
    ProfileHeader,
    StatusModal,
    TabNavigation,
    ThemeAndShareCards,
    UserStatsSection,
} from './profile';

/**
 * Écran de profil utilisateur avec onglets (Informations / Tickets)
 * Utilise une architecture modulaire avec des composants réutilisables
 */

export const ProfileScreen = ({ onLogout }: ProfileScreenProps) => {
    const colors = useAppColors();
    const { user, bookingList, isLoading, refreshing, fetchData, handleRefresh } = useProfileData();

    const [activeTab, setActiveTab] = useState<'info' | 'tickets' | 'locations'>('info');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [locationList, setLocationList] = useState<any[]>([]);
    const [locationsRefreshing, setLocationsRefreshing] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;
    const scrollX = useRef(new Animated.Value(0)).current;
    const isProgrammaticScrollRef = useRef(false);

    /**
     * Gère la déconnexion de l'utilisateur
     */
    const handleLogout = useCallback(() => {
        setShowLogoutModal(true);
    }, []);

    /**
     * Confirme et exécute la déconnexion
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
     * Charge les données au montage et au focus de l'écran (profil + réservations + demandes de location)
     */
    useFocusEffect(
        useCallback(() => {
            fetchData();
            fetchLocationList();
        }, [fetchData, fetchLocationList])
    );

    /**
     * Charge la liste des demandes de location de bus (onglet Locations bus)
     */
    const fetchLocationList = useCallback(async () => {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('user_id');
        if (!token || !userId) return;
        const queryParams = `customerId=${userId}&pageSize=50`;
        const res = await getLocationList(token, queryParams);
        console.log("getLocationList response ==>, ", res.data.items);
        if (res?.data?.items) setLocationList(res.data.items);
    }, []);

    /**
     * Initialise la position du scroll
     */
    useEffect(() => {
        if (!isLoading && scrollViewRef.current) {
            setTimeout(() => {
                const index = activeTab === 'info' ? 0 : activeTab === 'tickets' ? 1 : 2;
                const scrollPosition = index * screenWidth;
                scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
                scrollX.setValue(scrollPosition);
            }, 100);
        }
    }, [isLoading]);

    /**
     * Navigue vers l'écran de modification du profil
     */
    const handleUpdateUserInfo = useCallback(() => {
        router.push('/profile/edit');
    }, []);

    /**
     * Filtre et recherche les réservations
     */
    const filteredBookings = useMemo(() => {
        return bookingList.filter((booking: Booking) => {
            const matchesSearch =
                !searchQuery ||
                booking.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip?.stationFrom?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.trip?.stationTo?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = !selectedStatus ||
                booking.status?.toUpperCase() === selectedStatus.toUpperCase();

            return matchesSearch && matchesStatus;
        });
    }, [bookingList, searchQuery, selectedStatus]);

    /**
     * Rendu de l'onglet informations personnelles
     */
    const renderPersonalInfoTab = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 70 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.activeTabColor}
                    colors={[colors.activeTabColor]}
                />
            }
        >
            <PersonalInfoCard user={user} />
            <UserStatsSection user={user} />
            <ThemeAndShareCards />
            <Pressable
                style={[styles.upgradeButton, { backgroundColor: colors.activeTabColor }]}
                onPress={handleUpdateUserInfo}
            >
                <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Modifier mes informations</Text>
            </Pressable>
        </ScrollView>
    );

    /**
     * Rendu de l'onglet des tickets/réservations
     */
    const renderTicketsTab = () => (
        <View style={[styles.ticketsContainer, { backgroundColor: colors.scrollBackground }]}>
            <BookingFilters
                searchQuery={searchQuery}
                selectedStatus={selectedStatus}
                onSearchChange={setSearchQuery}
                onStatusPress={() => setShowStatusModal(true)}
            />

            {filteredBookings.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="ticket-outline" size={64} color={colors.inactiveIcon} />
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>Aucun ticket disponible</Text>
                    <Text style={[styles.emptyStateSubtext, { color: colors.secondaryText }]}>
                        Vos tickets de voyage apparaîtront ici
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 70 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.activeTabColor}
                            colors={[colors.activeTabColor]}
                        />
                    }
                >
                    {filteredBookings.map((booking: Booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                    ))}
                </ScrollView>
            )}

            <StatusModal
                visible={showStatusModal}
                selectedStatus={selectedStatus}
                onClose={() => setShowStatusModal(false)}
                onSelectStatus={setSelectedStatus}
            />
        </View>
    );

    /**
     * Rafraîchit la liste des demandes de location
     */
    const handleRefreshLocations = useCallback(async () => {
        setLocationsRefreshing(true);
        await fetchLocationList();
        setLocationsRefreshing(false);
    }, [fetchLocationList]);

    /**
     * Rendu de l'onglet Locations bus (bouton Nouvelle demande en haut, puis liste ou état vide)
     */
    const renderLocationsBusTab = () => (
        <View style={[styles.locationsBusContainer, { backgroundColor: colors.scrollBackground }]}>
            {/* Bouton en haut : + Nouvelle demande */}
            <Pressable
                style={[styles.locationsTopButton, { backgroundColor: colors.activeTabColor }]}
                onPress={() => router.push('/profile/bus-rental-request')}
            >
                <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                <Text style={styles.locationsTopButtonText}>Nouvelle demande</Text>
            </Pressable>

            {locationList.length > 0 ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={locationsRefreshing}
                            onRefresh={handleRefreshLocations}
                            tintColor={colors.activeTabColor}
                            colors={[colors.activeTabColor]}
                        />
                    }
                >
                    {locationList.map((item: any) => (
                        <BusRentalRequestCard
                            key={item.id}
                            item={item}
                            onPayRequest={(req) => router.push({ pathname: '/profile/bus-rental-payment', params: { item: JSON.stringify(req) } })}
                        />
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="bus-clock" size={64} color={colors.inactiveIcon} />
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>Aucune demande de location</Text>
                    <Text style={[styles.emptyStateSubtext, { color: colors.secondaryText }]}>
                        Créez une demande pour louer un bus.
                    </Text>
                </View>
            )}
        </View>
    );

    /**
     * Rendu de l'indicateur de chargement
     */
    const renderLoading = useCallback(() => (
        <View style={[styles.loadingContainer, { backgroundColor: colors.scrollBackground }]}>
            <ActivityIndicator size="large" color={colors.activeTabColor} />
        </View>
    ), [colors.scrollBackground, colors.activeTabColor]);

    /**
     * Gère le changement d'onglet
     */
    const handleTabPress = useCallback((tab: 'info' | 'tickets' | 'locations') => {
        setActiveTab(tab);
        const index = tab === 'info' ? 0 : tab === 'tickets' ? 1 : 2;
        const scrollPosition = index * screenWidth;

        isProgrammaticScrollRef.current = true;
        scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });

        setTimeout(() => {
            isProgrammaticScrollRef.current = false;
        }, 350);
    }, [screenWidth]);

    /**
     * Gère le scroll pour animer l'indicateur
     */
    const handleScrollEvent = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    /**
     * Gère le changement d'onglet lors du swipe
     */
    const handleScrollEnd = useCallback((event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / screenWidth);
        const newTab = index === 0 ? 'info' : index === 1 ? 'tickets' : 'locations';

        if (newTab !== activeTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(newTab);
        }

        if (Math.abs(offsetX - (index * screenWidth)) > 1) {
            scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
        }
    }, [screenWidth, activeTab]);

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            <ProfileHeader onLogout={handleLogout} />
            <TabNavigation activeTab={activeTab} onTabPress={handleTabPress} />

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
                    contentContainerStyle={{ width: screenWidth * 3, paddingBottom: Platform.OS === 'android' ? 100 : 0 }}
                >
                    <View style={[styles.tabPage, { width: screenWidth }]}>
                        {renderPersonalInfoTab()}
                    </View>
                    <View style={[styles.tabPage, { width: screenWidth }]}>
                        {renderTicketsTab()}
                    </View>
                    <View style={[styles.tabPage, { width: screenWidth }]}>
                        {renderLocationsBusTab()}
                    </View>
                    {Platform.OS === 'ios' && (
                        <View style={{ paddingBottom: 100 }} />
                    )}
                </ScrollView>
            )}

            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 32,
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
    locationsBusContainer: {
        flex: 1,
    },
    locationsTopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    locationsTopButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabScrollView: {
        flex: 1,
    },
    tabPage: {
        flex: 1,
    },
});

