// @ts-nocheck
import { getBookingDetails } from '@/api/booking';
import { DetailRow } from '@/components/ticket/DetailRow';
import { PassengerCard } from '@/components/ticket/PassengerCard';
import { QrCodeSection } from '@/components/ticket/QrCodeSection';
import { StationRow } from '@/components/ticket/StationRow';
import {
    formatFullDate,
    formatFullDateWithTime,
    formatStatus,
} from '@/constants/functions';
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
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import { showAlert } from '@/utils/alert';
import { AppButton } from '@/components/ui/AppButton';
import { BackButton } from '@/components/ui/BackButton';

/**
 * Retourne la première ville non vide parmi les candidats.
 */
const pickCity = (...values: (string | undefined | null)[]): string | null => {
    for (const value of values) {
        const trimmed = value?.trim();
        if (trimmed && trimmed !== '—') return trimmed;
    }
    return null;
};

/**
 * Construit le libellé de route (départ → arrivée) avec repli sur les villes de l'écran précédent.
 */
const buildRouteText = (
    ticket: TicketDetails,
    fallbackDepartureCity?: string,
    fallbackArrivalCity?: string
): string => {
    const fromCity = pickCity(
        ticket.trip?.stationFrom?.city,
        (ticket.trip?.stationFrom as { cityName?: string })?.cityName,
        fallbackDepartureCity
    );
    const toCity = pickCity(
        ticket.trip?.stationTo?.city,
        (ticket.trip?.stationTo as { cityName?: string })?.cityName,
        fallbackArrivalCity
    );
    if (fromCity && toCity) return `${fromCity} → ${toCity}`;
    if (fromCity || toCity) return `${fromCity ?? '—'} → ${toCity ?? '—'}`;
    return '';
};

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
    const fallbackDepartureCity = route.params?.departureCity as string | undefined;
    const fallbackArrivalCity = route.params?.arrivalCity as string | undefined;
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
                console.log('Ticket fetched:', response.data);
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
            formattedStatus: formatStatus(ticket.status),
            routeText: buildRouteText(ticket, fallbackDepartureCity, fallbackArrivalCity),
            passengerCountText: ticket.passengers.length > 1 ? 'Passagers' : 'Passager',
            formattedPaymentMethod: formatPaymentMethod(ticket.paymentProvider),
        };
    }, [ticket, fallbackDepartureCity, fallbackArrivalCity]);

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
                showAlert(
                    'Succès',
                    `Le ticket a été sauvegardé dans vos documents.\n\nFichier: ${finalFileName}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error);
            showAlert(
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
                showAlert(
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

            showAlert(
                'Billet sauvegardé',
                Platform.OS === 'ios'
                    ? 'Votre billet a été sauvegardé dans Photos'
                    : 'Votre billet a été sauvegardé dans la galerie',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            showAlert(
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
                <BackButton onPress={() => navigation.goBack()} color={iconColor} />
                <Text style={[styles.headerTitle, { color: textColor }]}>Mon billet</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                <View ref={ticketViewRef} collapsable={false} style={styles.captureBlock}>
                    <View style={[styles.heroCard, { backgroundColor: themeColors.primaryBlue }]}>
                        <View style={styles.heroTop}>
                            <View style={styles.heroRouteWrap}>
                                {ticketDerivedValues.routeText ? (
                                    <Text style={styles.heroRoute}>{ticketDerivedValues.routeText}</Text>
                                ) : null}
                                <Text style={styles.heroReference} numberOfLines={2}>
                                    Réf. {ticket.code}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.35)' },
                                ]}
                            >
                                <Text style={styles.statusBadgeText}>{ticketDerivedValues.formattedStatus}</Text>
                            </View>
                        </View>

                        <View style={styles.heroMetaRow}>
                            <View style={styles.heroMetaItem}>
                                <Text style={styles.heroMetaLabel}>Date</Text>
                                <Text style={styles.heroMetaValue} numberOfLines={2}>
                                    {formatFullDate(ticket.departureDateTime)}
                                </Text>
                            </View>
                            <View style={styles.heroMetaDivider} />
                            <View style={styles.heroMetaItem}>
                                <Text style={styles.heroMetaLabel}>Départ</Text>
                                <Text style={styles.heroMetaValue}>{ticket.departureTime}</Text>
                            </View>
                            <View style={styles.heroMetaDivider} />
                            <View style={styles.heroMetaItem}>
                                <Text style={styles.heroMetaLabel}>Durée</Text>
                                <Text style={styles.heroMetaValue}>{ticket.duration}</Text>
                            </View>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.sectionCard,
                            {
                                backgroundColor: themeColors.cardBackgroundColor,
                                borderColor: themeColors.borderColor,
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconBlock}>
                                <Icon name="qrcode" size={22} color={themeColors.primaryBlue} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                Code QR de vérification
                            </Text>
                        </View>
                        <QrCodeSection
                            qrCode={qrCode}
                            isLoadingQrCode={isLoadingQrCode}
                            error={qrCodeError}
                            primaryBlue={themeColors.primaryBlue}
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            frameBackground={themeColors.passengerCardBackground}
                            borderColor={themeColors.borderColor}
                            onRetry={retryQrCode}
                            onViewQRCode={handleViewQRCode}
                        />
                    </View>
                </View>

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: themeColors.cardBackgroundColor,
                            borderColor: themeColors.borderColor,
                        },
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconBlock}>
                            <Icon name="map-marker-path" size={22} color={themeColors.primaryBlue} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Itinéraire</Text>
                    </View>

                    <View style={styles.stationsContainer}>
                        <StationRow
                            label="Départ"
                            stationName={ticket.trip.stationFrom.name}
                            cityName={ticket.trip.stationFrom.city}
                            time={ticket.departureTime}
                            dotColor="#2D7A4F"
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            borderColor={themeColors.borderColor}
                        />
                        <StationRow
                            label="Arrivée"
                            stationName={ticket.trip.stationTo.name}
                            cityName={ticket.trip.stationTo.city}
                            time={ticket.arrivalTime}
                            dotColor="#C44747"
                            textColor={textColor}
                            secondaryTextColor={themeColors.secondaryTextColor}
                            borderColor={themeColors.borderColor}
                            isLast
                        />
                    </View>

                    <View style={[styles.infoGrid, { borderColor: themeColors.borderColor }]}>
                        <View style={styles.infoGridItem}>
                            <Text style={[styles.infoGridLabel, { color: themeColors.secondaryTextColor }]}>
                                Compagnie
                            </Text>
                            <Text style={[styles.infoGridValue, { color: textColor }]} numberOfLines={2}>
                                {ticket.companyName}
                            </Text>
                        </View>
                        <View style={[styles.infoGridDivider, { backgroundColor: themeColors.borderColor }]} />
                        <View style={styles.infoGridItem}>
                            <Text style={[styles.infoGridLabel, { color: themeColors.secondaryTextColor }]}>
                                Véhicule
                            </Text>
                            <Text style={[styles.infoGridValue, { color: textColor }]} numberOfLines={2}>
                                {ticket.bus.licencePlate}
                            </Text>
                        </View>
                    </View>
                </View>

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: themeColors.cardBackgroundColor,
                            borderColor: themeColors.borderColor,
                        },
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconBlock}>
                            <Icon name="account-group" size={22} color={themeColors.primaryBlue} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            {ticketDerivedValues.passengerCountText} ({ticket.passengers.length})
                        </Text>
                    </View>
                    {ticket.passengers.map((passenger, index) => (
                        <PassengerCard
                            key={passenger.id || index}
                            passenger={{
                                ...passenger,
                                phone: passenger.phone
                                    ? {
                                          type: 'MOBILE',
                                          countryCode: passenger.phone.countryCode,
                                          digits: passenger.phone.digits,
                                      }
                                    : {
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

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: themeColors.cardBackgroundColor,
                            borderColor: themeColors.borderColor,
                        },
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconBlock}>
                            <Icon name="wallet" size={22} color={themeColors.primaryBlue} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Paiement</Text>
                    </View>

                    <DetailRow
                        label="Prix du ticket"
                        value={formatPriceWithCurrency(ticket.passengers[0]?.price || '0')}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Méthode"
                        value={ticketDerivedValues.formattedPaymentMethod.replaceAll('_', ' ')}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />
                    <DetailRow
                        label="Réservé le"
                        value={formatFullDateWithTime(ticket.createdAt)}
                        textColor={textColor}
                        secondaryTextColor={themeColors.secondaryTextColor}
                    />

                    <View
                        style={[
                            styles.totalBox,
                            {
                                backgroundColor: themeColors.passengerCardBackground,
                                borderColor: themeColors.borderColor,
                            },
                        ]}
                    >
                        <Text style={[styles.totalBoxLabel, { color: textColor }]}>Total payé</Text>
                        <Text style={[styles.totalBoxValue, { color: themeColors.primaryBlue }]}>
                            {formatPriceWithCurrency(ticket.totalAmount)}
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <AppButton
                        title="Télécharger le reçu"
                        onPress={handleDownloadTicket}
                        loading={isGeneratingPDF}
                        variant="secondary"
                        icon={<Icon name="download" size={20} color={themeColors.primaryBlue} />}
                    />
                    {canCancelReservation && (
                        <AppButton
                            title="Annuler la réservation"
                            onPress={handleCancelReservation}
                            variant="danger"
                            icon={<Icon name="cancel" size={20} color="#FFFFFF" />}
                        />
                    )}
                    {canGiveFeedback && (
                        <AppButton
                            title="Donner mon avis"
                            onPress={handleGiveFeedback}
                            icon={<Icon name="star" size={20} color="#FFFFFF" />}
                        />
                    )}
                </View>
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
        borderRadius: 10,
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
        paddingHorizontal: 8,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 44,
        height: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    captureBlock: {
        gap: 14,
    },
    heroCard: {
        borderRadius: 12,
        padding: 18,
        gap: 18,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    heroRouteWrap: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    heroRoute: {
        fontSize: 22,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
        lineHeight: 28,
    },
    heroReference: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        color: 'rgba(255,255,255,0.9)',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    heroMetaRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.28)',
        paddingTop: 14,
    },
    heroMetaItem: {
        flex: 1,
        gap: 4,
    },
    heroMetaDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.28)',
        marginHorizontal: 10,
    },
    heroMetaLabel: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        color: 'rgba(255,255,255,0.75)',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    heroMetaValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        gap: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },
    sectionIconBlock: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
    },
    stationsContainer: {
        marginBottom: 4,
    },
    infoGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 14,
        marginTop: 4,
    },
    infoGridItem: {
        flex: 1,
        gap: 4,
    },
    infoGridDivider: {
        width: StyleSheet.hairlineWidth,
        marginHorizontal: 12,
    },
    infoGridLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    infoGridValue: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    totalBox: {
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    totalBoxLabel: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    totalBoxValue: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
    },
    actions: {
        gap: 12,
        marginTop: 2,
    },
});

export default TicketDetails;
