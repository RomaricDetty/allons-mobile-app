// @ts-nocheck
import { getLocationList } from '@/api/auth_register';
import { useAppColors } from '@/hooks/use-app-colors';
import { useProfileData } from '@/hooks/useProfileData';
import { Booking, ProfileScreenProps } from '@/interfaces';
import { showAlert, showConfirm } from '@/utils/alert';
import { useAuth } from '@/contexts/AuthContext';
import { AppButton } from '@/components/ui/AppButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    BookingCard,
    BookingFilters,
    BusRentalRequestCard,
    BusRentalRequestDetailModal,
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
    const { signOut } = useAuth();
    const { user, bookingList, isLoading, refreshing, fetchData, handleRefresh } = useProfileData();

    const [activeTab, setActiveTab] = useState<'info' | 'tickets' | 'locations'>('info');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
    const [locationList, setLocationList] = useState<any[]>([]);
    const [locationsRefreshing, setLocationsRefreshing] = useState(false);
    const [selectedBusRequest, setSelectedBusRequest] = useState<any | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;
    const scrollX = useRef(new Animated.Value(0)).current;
    const isProgrammaticScrollRef = useRef(false);

    /**
     * Confirme et exécute la déconnexion
     */
    const confirmLogout = useCallback(async () => {
        try {
            const onboardingValue = await AsyncStorage.getItem('onboarding');
            await signOut();
            if (onboardingValue) {
                await AsyncStorage.setItem('onboarding', onboardingValue);
            }
            onLogout();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            showAlert('Erreur', 'Une erreur est survenue lors de la déconnexion');
        }
    }, [onLogout, signOut]);

    /**
     * Demande confirmation avant déconnexion (alerte native)
     */
    const handleLogout = useCallback(() => {
        showConfirm(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            () => {
                void confirmLogout();
            },
            {
                confirmText: 'Se déconnecter',
                destructive: true,
            },
        );
    }, [confirmLogout]);

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
            <AppButton
                title="Modifier mes informations"
                onPress={handleUpdateUserInfo}
                icon={<MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />}
                style={styles.upgradeButton}
            />
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
                    <View style={[styles.emptyIconBlock, { borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="ticket-confirmation" size={28} color={colors.activeTabColor} />
                    </View>
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>Aucune réservation</Text>
                    <Text style={[styles.emptyStateSubtext, { color: colors.secondaryText }]}>
                        Vos billets de voyage apparaîtront ici
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.ticketsScrollContent, { paddingBottom: 100 }]}
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
            <View style={styles.locationsTopButtonWrap}>
                <AppButton
                    title="Nouvelle demande"
                    onPress={() => router.push('/profile/bus-rental-request')}
                    icon={<MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />}
                />
            </View>

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
                            onViewDetails={setSelectedBusRequest}
                            onPayRequest={(req) => {
                                setSelectedBusRequest(null);
                                router.push({ pathname: '/profile/bus-rental-payment', params: { item: JSON.stringify(req) } });
                            }}
                        />
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyStateContainer}>
                    <View style={[styles.emptyIconBlock, { borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="bus" size={28} color={colors.activeTabColor} />
                    </View>
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

            <BusRentalRequestDetailModal
                visible={!!selectedBusRequest}
                item={selectedBusRequest}
                onClose={() => setSelectedBusRequest(null)}
                onPayRequest={(req) => {
                    setSelectedBusRequest(null);
                    router.push({ pathname: '/profile/bus-rental-payment', params: { item: JSON.stringify(req) } });
                }}
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
        marginBottom: 20,
        marginTop: 8,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
        gap: 8,
    },
    emptyIconBlock: {
        width: 56,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        lineHeight: 20,
    },
    ticketsContainer: {
        flex: 1,
    },
    ticketsScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    locationsBusContainer: {
        flex: 1,
    },
    locationsTopButtonWrap: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
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

