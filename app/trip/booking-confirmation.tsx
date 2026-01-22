// @ts-nocheck
import { getBookingQrCode } from '@/api/booking';
import { PassengerCardExtended } from '@/components/booking/PassengerCardExtended';
import { PaymentDetailsSection } from '@/components/booking/PaymentDetailsSection';
import { TripDetailsSection } from '@/components/booking/TripDetailsSection';
import { formatStatus, getStatusColor } from '@/constants/functions';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { transformBookingData } from '@/utils/bookingDataTransformer';
import { generateReceiptHTML } from '@/utils/receiptPdfGenerator';
import { getAuthToken } from '@/utils/storage';
import { useRoute } from '@react-navigation/native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran de confirmation de réservation (Étape 3 sur 3)
 * Affiche les détails de la réservation créée avec possibilité de télécharger le reçu
 */
const BookingConfirmation = () => {
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [qrCode, setQrCode] = useState<string>('');
    const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(true);

    // Couleurs dynamiques basées sur le thème
    const colors = useAppColors();
    const textColor = colors.text;
    const iconColor = colors.icon;
    const tintColor = colors.tint;
    const cardBackgroundColor = colors.cardBackground;
    const borderColor = colors.border;
    const secondaryTextColor = colors.secondaryText;
    const headerBackgroundColor = colors.headerBackground;
    const headerBorderColor = colors.headerBorder;
    const scrollBackgroundColor = colors.scrollBackground;
    const primaryBlue = colors.activeTabColor;
    const statusColor = getStatusColor('PAID');

    // Récupération des données de la réservation
    const { bookingResponse, paymentResponse, trip, returnTrip, passengers } = (route.params as {
        bookingResponse?: any;
        paymentResponse?: any;
        trip?: any;
        returnTrip?: any;
        passengers?: Array<any>;
        searchParams?: any;
    }) || {};

    /**
     * Formate les données de réservation pour l'affichage
     */
    const bookingData = useMemo(() => {
        return transformBookingData({
            bookingResponse,
            paymentResponse,
            trip,
            returnTrip,
            passengers,
        });
    }, [bookingResponse, paymentResponse, trip, returnTrip, passengers]);


    /**
     * Empêche le retour en arrière depuis cet écran
     * Bloque le bouton retour hardware sur Android et le geste de retour
    */
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                // Bloquer complètement le retour arrière
                return true; // true = empêcher l'action par défaut
            }
        );

        // Cleanup lors du démontage du composant
        return () => backHandler.remove();
    }, []);

    /**
     * Navigue vers l'écran d'accueil en réinitialisant complètement la pile de navigation
     * L'utilisateur ne pourra pas revenir en arrière sur cet écran de confirmation
     */
    const handleNavigateToHome = useCallback(() => {
        router.replace('/(tabs)');
    }, []);

    if (!bookingData) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Ubuntu_Bold' }}>Erreur : Aucune donnée de réservation</Text>
            </View>
        );
    }

    /**
     * Formate le prix avec la devise
     */
    const formatPriceWithCurrency = useCallback((amount: string | number): string => {
        if (!bookingData) return '';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${numAmount.toLocaleString('fr-FR')} ${bookingData.currency}`;
    }, [bookingData]);

    /**
     * Formate la méthode de paiement
     */
    const formatPaymentMethod = useCallback((method: string): string => {
        const methodMap: { [key: string]: string } = {
            'MOBILE_MONEY': 'Mobile Money',
            'CREDIT_CARD': 'Carte bancaire',
            'WAVE': 'Wave',
            'MTN_MONEY': 'MTN Mobile Money',
            'ORANGE_MONEY': 'Orange Money',
        };
        return methodMap[method] || method;
    }, []);


    /**
     * Formate la date au format YYMMDDHHmmss pour le nom de fichier
     */
    const formatDateForFileName = (): string => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };

    /**
     * Télécharge le reçu en PDF
     */
    const handleDownloadReceipt = useCallback(async () => {
        if (!bookingData) return;

        setIsGeneratingPDF(true);
        try {
            // Générer le HTML
            const html = generateReceiptHTML(bookingData);

            // Formater la date pour le nom de fichier
            const dateFormatted = formatDateForFileName();

            // Définir le nom du fichier
            const fileName = `Invoice-${bookingData.code}-${dateFormatted}.pdf`;

            // Générer le PDF
            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 595,
                height: 842,
                fileName: fileName,
            });

            // Vérifier si le partage est disponible
            const isAvailable = await Sharing.isAvailableAsync();

            // Définir le nom final du fichier
            const finalFileName = `Receipt-${bookingData.code}-${dateFormatted}.pdf`;
            const finalFileUri = `${FileSystemLegacy.documentDirectory}${finalFileName}`;

            // Copier le fichier
            await FileSystemLegacy.copyAsync({
                from: uri,
                to: finalFileUri,
            });

            if (isAvailable) {
                // Partager le fichier
                await Sharing.shareAsync(finalFileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Télécharger le reçu',
                });
            } else {
                Alert.alert(
                    'Succès',
                    `Le reçu a été sauvegardé dans vos documents.\n\nFichier: ${finalFileName}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error);
            Alert.alert(
                'Erreur',
                'Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.'
            );
        } finally {
            setIsGeneratingPDF(false);
        }
    }, [bookingData]);

    /**
     * Génère le QR Code en récupérant le hash depuis l'API
     */
    const generateQRCodeBase64 = useCallback(async () => {
        if (!bookingData?.id) return;
        
        setIsLoadingQrCode(true);
        try {
            const token = await getAuthToken() || null;

            const response = await getBookingQrCode(bookingData.id, token || '');
            
            // Vérifier que la réponse est valide
            if (response && response.status === 200 && response.data) {
                // Le hash peut être dans response.data.hash ou directement dans response.data
                const hash = response.data.hash || response.data;
                
                if (hash && typeof hash === 'string' && hash.trim() !== '') {
                    setQrCode(hash);
                } else {
                    console.error('Hash QR Code vide ou invalide');
                    setQrCode('');
                }
            } else {
                console.error('Réponse API invalide:', response);
                setQrCode('');
            }
        } catch (error: any) {
            console.error('Erreur lors de la récupération du QR Code:', error);
            // Afficher un message d'erreur plus détaillé
            if (error?.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            setQrCode('');
        } finally {
            setIsLoadingQrCode(false);
        }
    }, [bookingData?.id]);

    useEffect(() => {
        generateQRCodeBase64();
    }, [generateQRCodeBase64]);

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header sans bouton retour */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: textColor }]}>Confirmation</Text>
                <Pressable onPress={handleNavigateToHome} style={styles.homeButton}>
                    <Icon name="home" size={25} color={iconColor} />
                </Pressable>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressContainer, { backgroundColor: headerBackgroundColor }]}>
                <Text style={[styles.progressTitle, { color: textColor }]}>Confirmation de réservation</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
                        <View style={[styles.progressFill, { width: '100%', backgroundColor: tintColor }]} />
                    </View>
                    <Text style={[styles.progressText, { color: secondaryTextColor }]}>100%</Text>
                </View>
            </View>

            {/* Indicateurs de progression */}
            <View style={[styles.progressIndicators, { backgroundColor: headerBackgroundColor }]}>
                <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Message de succès */}
                <View style={[styles.successCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <Icon name="check-circle" size={48} color="#4CAF50" />
                    <Text style={[styles.successTitle, { color: textColor }]}>Réservation confirmée !</Text>
                    <Text style={[styles.successMessage, { color: secondaryTextColor }]}>
                        Votre réservation a été créée avec succès. Vous pouvez télécharger votre reçu ci-dessous.
                    </Text>
                </View>

                {/* Header bleu avec route et référence */}
                <View style={[styles.blueHeader, { backgroundColor: primaryBlue }]}>
                    <Text style={[styles.routeTitle, { width: '80%', textAlign: 'left' }]}>
                        {bookingData.trip.stationFrom.city} → {bookingData.trip.stationTo.city}
                        {bookingData.returnTrip && (
                            <> → {bookingData.returnTrip.stationTo.city}</>
                        )}
                    </Text>
                    <Text style={[styles.referenceText, { width: '80%', textAlign: 'left' }]}>
                        Référence: {bookingData.code}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{formatStatus(bookingData.status)}</Text>
                    </View>
                </View>

                {/* Section: QR Code */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="qrcode" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Code QR de vérification</Text>
                    </View>
                    <View style={styles.qrCodeContainer}>
                        {isLoadingQrCode || !qrCode ? (
                            <ActivityIndicator size="large" color={primaryBlue} />
                        ) : (
                            <QRCode
                                value={qrCode}
                                size={150}
                                color={primaryBlue}
                                backgroundColor="transparent"
                            />
                        )}
                    </View>
                </View>

                {/* Section: Détails du voyage aller */}
                <TripDetailsSection
                    trip={{
                        stationFrom: bookingData.trip.stationFrom,
                        stationTo: bookingData.trip.stationTo,
                        departureDateTime: bookingData.departureDateTime,
                        departureTime: bookingData.departureTime,
                        arrivalTime: bookingData.arrivalTime,
                        duration: bookingData.duration,
                        companyName: bookingData.companyName,
                        bus: bookingData.bus,
                    }}
                    title={bookingData.returnTrip ? 'Détails du voyage aller' : 'Détails du voyage'}
                    cardBackgroundColor={cardBackgroundColor}
                    borderColor={borderColor}
                    textColor={textColor}
                    secondaryTextColor={secondaryTextColor}
                    primaryBlue={primaryBlue}
                />

                {/* Section: Détails du voyage retour (si aller-retour) */}
                {bookingData.returnTrip && (
                    <TripDetailsSection
                        trip={{
                            stationFrom: bookingData.returnTrip.stationFrom,
                            stationTo: bookingData.returnTrip.stationTo,
                            departureDateTime: bookingData.returnTrip.departureDateTime,
                            departureTime: bookingData.returnTrip.departureTime,
                            arrivalTime: bookingData.returnTrip.arrivalTime,
                            duration: bookingData.returnTrip.duration,
                            companyName: bookingData.returnTrip.companyName,
                            bus: bookingData.returnTrip.bus,
                        }}
                        title="Détails du voyage retour"
                        cardBackgroundColor={cardBackgroundColor}
                        borderColor={borderColor}
                        textColor={textColor}
                        secondaryTextColor={secondaryTextColor}
                        primaryBlue={primaryBlue}
                    />
                )}

                {/* Section: Passagers */}
                {bookingData.returnTrip ? (
                    <>
                        {/* Passagers - Voyage aller */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="account-group-outline" size={20} color={primaryBlue} />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                    Passagers - Voyage aller ({bookingData.passengers.length})
                                </Text>
                            </View>
                            {bookingData.passengers.map((passenger: any, index: number) => (
                                <PassengerCardExtended
                                    key={`outbound-${index}`}
                                    passenger={passenger}
                                    textColor={textColor}
                                    secondaryTextColor={secondaryTextColor}
                                    primaryBlue={primaryBlue}
                                    backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5'}
                                    borderColor={borderColor}
                                    seatNumber={passenger.seatNumber}
                                />
                            ))}
                        </View>

                        {/* Passagers - Voyage retour */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="account-group-outline" size={20} color={primaryBlue} />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                    Passagers - Voyage retour ({bookingData.passengers.length})
                                </Text>
                            </View>
                            {bookingData.passengers.map((passenger: any, index: number) => (
                                <PassengerCardExtended
                                    key={`return-${index}`}
                                    passenger={passenger}
                                    textColor={textColor}
                                    secondaryTextColor={secondaryTextColor}
                                    primaryBlue={primaryBlue}
                                    backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5'}
                                    borderColor={borderColor}
                                    seatNumber={passenger.seatNumberReturn}
                                />
                            ))}
                        </View>
                    </>
                ) : (
                    /* Passagers - Voyage simple */
                    <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <View style={styles.sectionHeader}>
                            <Icon name="account-group-outline" size={20} color={primaryBlue} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                {bookingData.passengers.length > 1 ? 'Passagers' : 'Passager'} ({bookingData.passengers.length})
                            </Text>
                        </View>
                        {bookingData.passengers.map((passenger: any, index: number) => (
                            <PassengerCardExtended
                                key={index}
                                passenger={passenger}
                                textColor={textColor}
                                secondaryTextColor={secondaryTextColor}
                                primaryBlue={primaryBlue}
                                backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5'}
                                borderColor={borderColor}
                                seatNumber={passenger.seatNumber}
                            />
                        ))}
                    </View>
                )}

                {/* Section: Détails du paiement */}
                <PaymentDetailsSection
                    payment={{
                        prices: bookingData.prices,
                        totalAmount: bookingData.totalAmount,
                        currency: bookingData.currency,
                        provider: bookingData.provider,
                        createdAt: bookingData.createdAt,
                    }}
                    isRoundTrip={!!bookingData.returnTrip}
                    cardBackgroundColor={cardBackgroundColor}
                    borderColor={borderColor}
                    textColor={textColor}
                    secondaryTextColor={secondaryTextColor}
                    primaryBlue={primaryBlue}
                    formatPriceWithCurrency={formatPriceWithCurrency}
                    formatPaymentMethod={formatPaymentMethod}
                />

                {/* Bouton de téléchargement */}
                <Pressable
                    style={[styles.actionButton, { borderColor: primaryBlue }]}
                    onPress={handleDownloadReceipt}
                    disabled={isGeneratingPDF}
                >
                    {isGeneratingPDF ? (
                        <ActivityIndicator size="small" color={primaryBlue} />
                    ) : (
                        <>
                            <Icon name="download" size={20} color={primaryBlue} />
                            <Text style={[styles.actionButtonText, { color: primaryBlue }]}>
                                Télécharger le reçu
                            </Text>
                        </>
                    )}
                </Pressable>

                {/* Bouton pour retourner à l'accueil */}
                <Pressable
                    style={[styles.homeButtonBottom, { backgroundColor: primaryBlue }]}
                    onPress={handleNavigateToHome}
                >
                    <Icon name="home" size={20} color="#FFFFFF" />
                    <Text style={styles.homeButtonText}>
                        Retour à l'accueil
                    </Text>
                </Pressable>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    homeButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 12,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 12,
    },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    successCard: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginTop: 12,
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        lineHeight: 20,
    },
    blueHeader: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        position: 'relative',
    },
    routeTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    referenceText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#FFFFFF',
        opacity: 0.9,
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    qrCodeContainer: {
        width: 150,
        height: 150,
        alignSelf: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    homeButtonBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    homeButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});

export default BookingConfirmation;

