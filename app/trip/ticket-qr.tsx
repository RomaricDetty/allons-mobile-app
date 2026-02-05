import { getBookingQrCode } from '@/api/booking';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getAuthToken } from '@/utils/storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore - react-native-vector-icons n'a pas de types TypeScript
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Paramètres de route pour l'écran TicketQR
 */
type TicketQRRouteParams = {
    ticketCode: string;
    ticketId: string;
};

type TicketQRRouteProp = RouteProp<{ params: TicketQRRouteParams }, 'params'>;

/**
 * Écran d'affichage du QR code de vérification du ticket
 */
const TicketQR = () => {
    const route = useRoute<TicketQRRouteProp>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // Récupération des paramètres de route
    const ticketCode = route.params?.ticketCode;
    const ticketId = route.params?.ticketId;

    // États
    const [qrCode, setQrCode] = useState<string>('');
    const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Optimisation : calcul des couleurs avec useMemo
    const colors = useMemo(() => {
        const isDark = colorScheme === 'dark';
        return {
            headerBackground: isDark ? '#1C1C1E' : '#FFFFFF',
            headerBorder: isDark ? '#3A3A3C' : '#E0E0E0',
            scrollBackground: isDark ? '#000000' : '#F5F5F5',
            qrCodeBackground: isDark ? '#2C2C2E' : '#FFFFFF',
            primaryBlue: tintColor === '#fff' ? '#1776BA' : tintColor,
            errorText: isDark ? '#FF6B6B' : '#D32F2F',
        };
    }, [colorScheme, tintColor]);

    // Optimisation : calcul des dimensions avec useMemo
    const dimensions = useMemo(() => {
        const screenHeight = Dimensions.get('window').height;
        return {
            screenHeight,
            scrollMinHeight: screenHeight - insets.top - 60,
        };
    }, [insets.top]);

    /**
     * Génère le QR Code en récupérant le hash depuis l'API
     */
    const generateQRCodeBase64 = useCallback(async () => {
        if (!ticketId) {
            setError('Identifiant de ticket manquant');
            setIsLoadingQrCode(false);
            return;
        }

        setIsLoadingQrCode(true);
        setError(null);

        try {
            const token = await getAuthToken();

            if (!token || token.trim() === '') {
                const errorMsg = 'Token d\'authentification manquant. Veuillez vous reconnecter.';
                setError(errorMsg);
                setQrCode('');
                return;
            }

            const response = await getBookingQrCode(ticketId, token);

            if (response?.status === 200 && response.data) {
                const hash = response.data.hash || response.data;

                if (hash && typeof hash === 'string' && hash.trim() !== '') {
                    setQrCode(hash);
                    setError(null);
                } else {
                    const errorMsg = 'Le QR code reçu est invalide.';
                    setError(errorMsg);
                    setQrCode('');
                }
            } else {
                const errorMsg = 'Impossible de récupérer le QR code.';
                setError(errorMsg);
                setQrCode('');
            }
        } catch (error: unknown) {
            console.error('Erreur lors de la récupération du QR Code:', error);
            
            let errorMsg = 'Une erreur est survenue lors du chargement du QR code.';
            
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: unknown } };
                if (axiosError.response?.status === 401) {
                    errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                } else if (axiosError.response?.status === 404) {
                    errorMsg = 'Ticket non trouvé.';
                }
            }
            
            setError(errorMsg);
            setQrCode('');
        } finally {
            setIsLoadingQrCode(false);
        }
    }, [ticketId]);

    useEffect(() => {
        generateQRCodeBase64();
    }, [generateQRCodeBase64]);

    // Gestion du cas où les paramètres sont manquants
    if (!ticketCode || !ticketId) {
        return (
            <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={48} color={colors.errorText} />
                    <Text style={[styles.errorText, { color: colors.errorText }]}>
                        Aucun code de ticket trouvé
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primaryBlue }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.retryButtonText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }


    /**
     * Gère le retour en arrière
     */
    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /**
     * Réessaie de charger le QR code
     */
    const handleRetry = useCallback(() => {
        generateQRCodeBase64();
    }, [generateQRCodeBase64]);

    return (
        <View style={[styles.container, { backgroundColor: colors.headerBackground }]}>
            {/* Header avec bouton retour */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + 10,
                        backgroundColor: colors.headerBackground,
                        borderBottomColor: colors.headerBorder,
                    },
                ]}
            >
                <Pressable
                    onPress={handleGoBack}
                    style={styles.backButton}
                    accessibilityLabel="Retour"
                    accessibilityRole="button"
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor, alignSelf: 'center' }]}>
                    Code QR de vérification
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { minHeight: dimensions.scrollMinHeight },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.mainCard}>
                    {/* Container QR Code */}
                    <View
                        style={[
                            styles.qrContainer,
                            { backgroundColor: colors.qrCodeBackground },
                        ]}
                    >
                        {isLoadingQrCode ? (
                            <ActivityIndicator size="large" color={colors.primaryBlue} />
                        ) : error ? (
                            <View style={styles.errorStateContainer}>
                                <Icon name="alert-circle" size={48} color={colors.errorText} />
                                <Text style={[styles.errorMessage, { color: colors.errorText }]}>
                                    {error}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.retryButton, { backgroundColor: colors.primaryBlue }]}
                                    onPress={handleRetry}
                                    accessibilityLabel="Réessayer"
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.retryButtonText}>Réessayer</Text>
                                </TouchableOpacity>
                            </View>
                        ) : qrCode ? (
                            <>
                                <QRCode
                                    value={qrCode}
                                    size={300}
                                    color={colors.primaryBlue}
                                    backgroundColor="transparent"
                                />
                                <Text style={[styles.ticketIdentifier, { color: textColor }]}>
                                    {ticketCode}
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>
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
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
    },
    mainCard: {
        borderRadius: 16,
        padding: 10,
        width: '100%',
        maxWidth: 450,
    },
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 16,
        minHeight: 400,
    },
    ticketIdentifier: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'center',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    errorMessage: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
});

export default TicketQR;
