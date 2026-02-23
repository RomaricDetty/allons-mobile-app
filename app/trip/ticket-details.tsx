// @ts-nocheck
import { getBookingDetails } from '@/api/booking';
import { DetailRow } from '@/components/ticket/DetailRow';
import { PassengerCard } from '@/components/ticket/PassengerCard';
import { QrCodeSection } from '@/components/ticket/QrCodeSection';
import { StationRow } from '@/components/ticket/StationRow';
import { formatFullDate, formatFullDateWithTime, formatStatus, getStatusColor } from '@/constants/functions';
import { formatPaymentMethod } from '@/constants/paymentMethods';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTicketQrCode } from '@/hooks/useTicketQrCode';
import { getAuthToken } from '@/utils/storage';
import { formatDateForFileName, generateTicketHTML } from '@/utils/ticketPdfGenerator';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';

/**
 * Interface pour les détails complets d'un ticket
 */
interface TicketDetails {
    id: string;
    code: string;
    status: string;
    totalAmount: string;
    currency: string;
    method: string;
    provider: string;
    paymentProvider: string;
    createdAt: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    companyName: string;
    bus: {
        licencePlate: string;
    };
    trip: {
        label: string;
        stationFrom: {
            city: string;
            name: string;
        };
        stationTo: {
            city: string;
            name: string;
        };
    };
    passengers: Array<{
        id?: string; // ID du booking item (bookingItemId)
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        seatNumber: number;
        isMainPassenger: boolean;
        passengerType: string;
        price: string;
        status?: string; // Statut du passager (CONFIRMED, CANCELLED, etc.)
    }>;
    contact: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
}

/**
 * Écran de détails d'un ticket de réservation
 */
const TicketDetails = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [ticketFetched, setTicketFetched] = useState<TicketDetails | null | undefined>(undefined);
    const [loadingTicket, setLoadingTicket] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const bookingId = route.params?.bookingId as string | undefined;
    const ticketParam = route.params?.ticketDetails;

    /** Ticket issu des params (legacy) */
    const ticketFromParams = useMemo(() => {
        if (!ticketParam) return undefined;
        try {
            if (typeof ticketParam === 'string') return JSON.parse(ticketParam) as TicketDetails;
            return ticketParam as TicketDetails;
        } catch (error) {
            console.error('Erreur parsing ticketDetails:', error);
            return undefined;
        }
    }, [ticketParam]);

    /** Chargement des détails par API quand on reçoit un bookingId */
    const fetchTicket = useCallback(async () => {
        if (!bookingId) return;
        setLoadingTicket(true);
        setFetchError(null);
        try {
            const token = await getAuthToken();
            if (!token?.trim()) {
                setFetchError('Session expirée. Reconnectez-vous.');
                return;
            }
            const response = await getBookingDetails(bookingId, token);
            if (response.status === 200) {
                setTicketFetched(response.data as TicketDetails);
            } else {
                setFetchError('Impossible de charger les détails du ticket.');
            }
        } catch (error) {
            console.error('Erreur chargement ticket:', error);
            setFetchError('Une erreur est survenue.');
        } finally {
            setLoadingTicket(false);
        }
    }, [bookingId]);

    useEffect(() => {
        if (bookingId) fetchTicket();
    }, [bookingId, fetchTicket]);

    /** Ticket affiché : priorité aux données fetchées, sinon params */
    const ticket = ticketFetched !== undefined ? ticketFetched : ticketFromParams;
    const refreshed = route.params?.refreshed;

    // Hook personnalisé pour le QR code
    const { qrCode, isLoadingQrCode, error: qrCodeError, retry: retryQrCode } = useTicketQrCode(ticket?.id);

    // Référence pour capturer la section QR code
    const ticketViewRef = useRef<View>(null);

    // Couleurs dynamiques basées sur le thème (mémorisées)
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Couleurs spécifiques pour l'écran (mémorisées pour éviter les recalculs)
    const themeColors = useMemo(() => ({
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        scrollBackgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        primaryBlue: tintColor === '#fff' ? '#1776BA' : tintColor,
        passengerCardBackground: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
    }), [colorScheme, tintColor]);

    // Valeurs dérivées du ticket (mémorisées)
    const ticketDerivedValues = useMemo(() => {
        if (!ticket) return null;

        return {
            statusColor: getStatusColor(ticket.status),
            formattedStatus: formatStatus(ticket.status),
            routeText: `${(ticket.trip.stationFrom as any)?.city ?? (ticket.trip.stationFrom as any)?.cityName ?? '—'} → ${(ticket.trip.stationTo as any)?.city ?? (ticket.trip.stationTo as any)?.cityName ?? '—'}`,
            passengerCountText: ticket.passengers.length > 1 ? 'Passagers' : 'Passager',
            formattedPaymentMethod: formatPaymentMethod(ticket.paymentProvider),
        };
    }, [ticket]);

    /**
     * Vérifie si l'annulation est possible
     * Retourne true si :
     * - La date de départ n'est pas passée et qu'on est à plus de 24h avant
     * - La réservation n'est pas déjà annulée
     * - Tous les passagers ne sont pas annulés (au moins un passager actif)
     */
    const canCancelReservation = useMemo(() => {
        if (!ticket) return false;

        // Vérifier si la réservation elle-même est annulée
        if (ticket.status && (ticket.status.toUpperCase() === 'CANCELLED' || ticket.status.toUpperCase() === 'CANCELED')) {
            return false;
        }

        // Vérifier si tous les passagers sont annulés
        const allPassengersCancelled = ticket.passengers.every(passenger =>
            passenger.status &&
            (passenger.status.toUpperCase() === 'CANCELLED' || passenger.status.toUpperCase() === 'CANCELED')
        );

        if (allPassengersCancelled) {
            return false;
        }

        // Convertir la date de départ en objet Date
        const departureDate = new Date(ticket.departureDateTime);
        const now = new Date();

        // Vérifier si la date de départ est passée
        if (departureDate < now) {
            return false;
        }

        // Calculer la différence en heures
        const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // L'annulation est possible si on est à plus de 24h avant le départ
        return hoursUntilDeparture >= 24;
    }, [ticket]);

    const canGiveFeedback = useMemo(() => ticket?.status?.toUpperCase() === 'USED', [ticket]);

    /**
     * Formate le prix avec la devise
     */
    const formatPriceWithCurrency = (amount: string): string => {
        if (!ticket) return '';
        const numAmount = parseFloat(amount);
        return `${numAmount.toLocaleString('fr-FR')} ${ticket.currency}`;
    };

    /**
     * Navigue vers l'écran QR code
     */
    const handleViewQRCode = () => {
        if (!ticket) return;
        navigation.navigate('trip/ticket-qr' as never, { ticketCode: ticket.code, ticketId: ticket.id } as never);
    };

    if (loadingTicket) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.primaryBlue} />
                <Text style={[styles.loadingTicketText, { color: textColor }]}>Chargement des détails...</Text>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Ubuntu_Bold', textAlign: 'center' }}>{fetchError}</Text>
                <Pressable style={[styles.retryButton, { marginTop: 16 }]} onPress={fetchTicket}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </Pressable>
            </View>
        );
    }

    if (!ticket || !ticketDerivedValues) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.scrollBackgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Ubuntu_Bold' }}>Erreur : Aucun ticket trouvé</Text>
            </View>
        );
    }

    /**
     * Télécharge le ticket en PDF
     */
    const handleDownloadTicket = async () => {
        if (!ticket) return;

        setIsGeneratingPDF(true);
        try {
            // Générer le HTML
            const html = generateTicketHTML(ticket);

            // Formater la date pour le nom de fichier
            const dateFormatted = formatDateForFileName();

            // Définir le nom du fichier
            const fileName = `Invoice-${ticket.code}-${dateFormatted}.pdf`;

            // Générer le PDF avec le nom de fichier
            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 595, // A4 width in points
                height: 842, // A4 height in points
                fileName: fileName,
            });

            // Vérifier si le partage est disponible
            const isAvailable = await Sharing.isAvailableAsync();

            // Définir le nom final du fichier avec la même date formatée
            const finalFileName = `Invoice-${ticket.code}-${dateFormatted}.pdf`;
            const finalFileUri = `${FileSystemLegacy.documentDirectory}${finalFileName}`;

            // Utiliser l'API legacy pour copier le fichier
            await FileSystemLegacy.copyAsync({
                from: uri,
                to: finalFileUri,
            });

            if (isAvailable) {
                // Partager le fichier avec le bon nom
                await Sharing.shareAsync(finalFileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Télécharger le ticket',
                });
            } else {
                Alert.alert(
                    'Succès',
                    `Le ticket a été sauvegardé dans vos documents.\n\nFichier: ${finalFileName}`,
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
    };

    /**
     * Sauvegarde le billet dans Photos (iOS) ou Galerie (Android)
     */
    const handleSaveToPhotos = async () => {
        try {
            // Demande la permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission requise',
                    'Veuillez autoriser l\'accès à la galerie pour sauvegarder votre billet'
                );
                return;
            }

            // Capture l'image du billet complet
            if (!ticketViewRef.current) return;

            const uri = await captureRef(ticketViewRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            // Sauvegarde dans la galerie
            await MediaLibrary.saveToLibraryAsync(uri);

            Alert.alert(
                'Billet sauvegardé',
                Platform.OS === 'ios'
                    ? 'Votre billet a été sauvegardé dans Photos'
                    : 'Votre billet a été sauvegardé dans la galerie',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            Alert.alert(
                'Erreur',
                'Impossible de sauvegarder le billet. Veuillez réessayer.'
            );
        }
    };

    /**
     * Navigue vers l'écran d'annulation de réservation
     */
    const handleCancelReservation = () => {
        if (!ticket) return;
        navigation.navigate('trip/cancel-reservation' as never, {
            ticketDetails: JSON.stringify(ticket)
        } as never);
    };

    const handleGiveFeedback = () => {
        if (!ticket) return;
        navigation.navigate('trip/feedback-passenger' as never, { bookingId: ticket.id, departureId: ticket.departureId } as never);
    };

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
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View ref={ticketViewRef} collapsable={false}>
                    {/* Header bleu avec route et référence */}
                    <View style={[styles.blueHeader, { backgroundColor: themeColors.primaryBlue }]}>
                        <Text style={[styles.routeTitle, { width: '80%', textAlign: 'left' }]}>
                            {ticketDerivedValues.routeText}
                        </Text>
                        <Text style={[styles.referenceText, { width: '80%', textAlign: 'left' }]}>
                            Référence: {ticket.code}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: ticketDerivedValues.statusColor }]}>
                            <Text style={styles.statusBadgeText}>{ticketDerivedValues.formattedStatus}</Text>
                        </View>
                    </View>

                    {/* Section: QR Code */}
                    <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                        <View style={styles.sectionHeader}>
                            <Icon name="qrcode" size={20} color={themeColors.primaryBlue} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Code QR de vérification</Text>
                        </View>
                        <QrCodeSection
                            qrCode={qrCode}
                            isLoadingQrCode={isLoadingQrCode}
                            error={qrCodeError}
                            primaryBlue={themeColors.primaryBlue}
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            onRetry={retryQrCode}
                            onViewQRCode={handleViewQRCode}
                        />
                    </View>
                </View>

                {/* Section: Détails du voyage */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="map-outline" size={20} color={themeColors.primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du voyage</Text>
                    </View>
                    <DetailRow
                        label="Date"
                        value={formatFullDate(ticket.departureDateTime)}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                        valueWidth="45%"
                    />
                    <DetailRow
                        label="Heure de départ"
                        value={ticket.departureTime}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Heure d'arrivée estimée"
                        value={ticket.arrivalTime}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Durée"
                        value={ticket.duration}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Compagnie"
                        value={ticket.companyName}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Véhicule"
                        value={ticket.bus.licencePlate}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                </View>

                {/* Section: Gares */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="map-marker-outline" size={20} color={themeColors.primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Gares</Text>
                    </View>
                    <View style={styles.stationsContainer}>
                        <StationRow
                            label="Départ"
                            stationName={ticket.trip.stationFrom.name}
                            dotColor="#4CAF50"
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            borderColor={themeColors.borderColor}
                        />
                        <StationRow
                            label="Arrivée"
                            stationName={ticket.trip.stationTo.name}
                            dotColor="#F44336"
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            borderColor={themeColors.borderColor}
                            isLast
                        />
                    </View>
                </View>

                {/* Section: Passagers */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="account-group-outline" size={20} color={themeColors.primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            {ticketDerivedValues.passengerCountText} ({ticket.passengers.length})
                        </Text>
                    </View>
                    {ticket.passengers.map((passenger, index) => (
                        <PassengerCard
                            key={index}
                            passenger={{
                                ...passenger,
                                phone: passenger.phone ? {
                                    type: 'MOBILE',
                                    countryCode: passenger.phone.countryCode,
                                    digits: passenger.phone.digits,
                                } : {
                                    type: 'MOBILE',
                                    countryCode: '',
                                    digits: '',
                                },
                            }}
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            primaryBlue={themeColors.primaryBlue}
                            backgroundColor={themeColors.passengerCardBackground}
                            borderColor={themeColors.borderColor}
                            bookingItemId={passenger.id}
                            departureId={ticket.departureId}
                        />
                    ))}
                </View>

                {/* Section: Détails du paiement */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.cardBackgroundColor, borderColor: themeColors.borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="wallet-outline" size={20} color={themeColors.primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du paiement</Text>
                    </View>
                    <DetailRow
                        label="Prix du ticket"
                        value={formatPriceWithCurrency(ticket.passengers[0]?.price || '0')}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                        valueWidth="45%"
                    />
                    <View style={[styles.separator, { backgroundColor: themeColors.borderColor }]} />
                    <DetailRow
                        label="Total payé"
                        value={formatPriceWithCurrency(ticket.totalAmount)}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                        isTotal
                        totalValueColor={themeColors.primaryBlue}
                    />
                    <DetailRow
                        label="Méthode de paiement"
                        value={ticketDerivedValues.formattedPaymentMethod.replaceAll('_', ' ')}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Date de réservation"
                        value={formatFullDateWithTime(ticket.createdAt)}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                        valueWidth="45%"
                    />
                </View>

                {/* Section: Actions */}
                <Pressable
                    style={[styles.actionButton, { borderColor: themeColors.primaryBlue, borderWidth: 1 }]}
                    onPress={handleDownloadTicket}
                    disabled={isGeneratingPDF}
                >
                    {isGeneratingPDF ? (
                        <ActivityIndicator size="small" color={themeColors.primaryBlue} />
                    ) : (
                        <>
                            <Icon name="download" size={20} color={themeColors.primaryBlue} />
                            <Text style={[styles.actionButtonText, { color: themeColors.primaryBlue }]}>
                                Télécharger le reçu
                            </Text>
                        </>
                    )}
                </Pressable>
                {canCancelReservation && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: '#DC3545', marginTop: 12 }]}
                        onPress={handleCancelReservation}
                    >
                        <Icon name="cancel" size={20} color={'#FFFFFF'} />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                            Annuler la réservation
                        </Text>
                    </Pressable>
                )}

                {canGiveFeedback && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: themeColors.primaryBlue, marginTop: 12 }]}
                        onPress={handleGiveFeedback}
                    >
                        <Icon name="star-outline" size={20} color={'#FFFFFF'} />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                            Donner mon avis
                        </Text>
                    </Pressable>
                )}
                {/* Bouton sauvegarder dans Photos/Galerie */}
                {/* <Pressable
                    style={[styles.actionButton, { backgroundColor: primaryBlue, borderColor: primaryBlue, marginTop: 20 }]}
                    onPress={handleSaveToPhotos}
                >
                    <Icon name={Platform.OS === 'ios' ? 'image-outline' : 'download'} size={20} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                        {Platform.OS === 'ios' ? 'Sauvegarder dans Photos' : 'Sauvegarder dans la galerie'}
                    </Text>
                </Pressable> */}
                {/* <Pressable
                        style={[styles.actionButton, { borderColor: primaryBlue, marginTop: 12 }]}
                        onPress={handleViewQRCode}
                    >
                        <Icon name="qrcode" size={20} color={primaryBlue} />
                        <Text style={[styles.actionButtonText, { color: primaryBlue }]}>
                            Voir le code QR
                        </Text>
                    </Pressable> */}
                {/* </View> */}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingTicketText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 12,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#1776BA',
    },
    retryButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
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
    separator: {
        height: 1,
        marginVertical: 12,
    },
    stationsContainer: {
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        // borderWidth: 1,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
});

export default TicketDetails;
