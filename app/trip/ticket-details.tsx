// @ts-nocheck
import { formatFullDate, formatStatus, getStatusColor } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    channel: string;
    createdAt: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    companyName: string;
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
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        seatNumber: number;
        isMainPassenger: boolean;
        passengerType: string;
        price: string;
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

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const primaryBlue = tintColor === '#fff' ? '#1776BA' : tintColor;
    const statusColor = getStatusColor('PAID');

    // Récupération des données du ticket
    const ticket = route.params?.ticketDetails as TicketDetails | undefined;

    if (!ticket) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Ubuntu_Bold' }}>Erreur : Aucun ticket trouvé</Text>
            </View>
        );
    }

    /**
     * Formate le prix avec la devise
     */
    const formatPriceWithCurrency = (amount: string): string => {
        const numAmount = parseFloat(amount);
        return `${numAmount.toLocaleString('fr-FR')} ${ticket.currency}`;
    };

    /**
     * Formate la méthode de paiement
     */
    const formatPaymentMethod = (method: string): string => {
        const methodMap: { [key: string]: string } = {
            'MOBILE_MONEY': 'Mobile Money',
            'CARD': 'Carte bancaire',
            'WAVE': 'Wave',
            'MTN': 'MTN Mobile Money',
            'ORANGE': 'Orange Money',
        };
        return methodMap[method] || method;
    };

    /**
     * Navigue vers l'écran QR code
     */
    const handleViewQRCode = () => {
        navigation.navigate('trip/ticket-qr' as never, { ticketCode: ticket.code, ticketId: ticket.id } as never);
    };

    /**
     * Génère le QR code en base64
     */
    const generateQRCodeBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const qrCodeData = `https://allon-frontoffice-ng.onrender.com/verify-ticket/${ticket.id}?ref=${ticket.code}`;
            const svgRef = React.createRef();

            // Créer un composant QRCode temporaire et le convertir en base64
            const qrSvg = (
                <QRCode
                    value={qrCodeData}
                    size={200}
                    color="#1776BA"
                    backgroundColor="transparent"
                />
            );

            // Pour obtenir le base64, on peut utiliser react-native-view-shot
            // Mais une solution plus simple est de générer le QR code dans le HTML directement
            resolve(''); // On générera le QR code dans le HTML
        });
    };

    /**
     * Génère le HTML pour le PDF
     */
    const generateTicketHTML = (): string => {
        const qrCodeData = `https://allon-frontoffice-ng.onrender.com/verify-ticket/${ticket.id}?ref=${ticket.code}`;
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Ubuntu_Regular', sans-serif;
                            background-color: #FFFFFF;
                            color: #000000;
                            padding: 0;
                            margin: 0;
                        }
                        .header {
                            background-color: #1776BA;
                            color: #FFFFFF;
                            padding: 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                        }
                        .header-left h1 {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .header-left p {
                            font-size: 10px;
                            opacity: 0.9;
                        }
                        .header-right {
                            text-align: right;
                        }
                        .header-right .ref {
                            font-size: 12px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .header-right .status {
                            font-size: 10px;
                            background-color: #4CAF50;
                            padding: 4px 8px;
                            border-radius: 4px;
                            display: inline-block;
                        }
                        .separator {
                            height: 2px;
                            background-color: #1776BA;
                        }
                        .qr-section {
                            text-align: center;
                            padding: 20px 20px 30px 20px;
                            background-color: #FFFFFF;
                        }
                        .qr-code {
                            margin: 0 auto 10px;
                            width: 150px;
                            height: 150px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .qr-code img {
                            width: 100%;
                            height: 100%;
                            display: block;
                            margin: 0 auto;
                            object-fit: contain;
                        }
                        .qr-title {
                            font-size: 14px;
                            font-weight: bold;
                            color: #000000;
                            margin-bottom: 8px;
                        }
                        .qr-subtitle {
                            font-size: 12px;
                            color: #666666;
                            margin-top: 10px;
                        }
                        .route {
                            text-align: center;
                            padding: 20px 15px;
                            background-color: #FFFFFF;
                            margin-top: 10px;
                        }
                        .route-title {
                            font-size: 20px;
                            font-weight: bold;
                            color: #000000;
                        }
                        .content {
                            padding: 20px;
                            background-color: #FFFFFF;
                        }
                        .section {
                            margin-bottom: 25px;
                        }
                        .section-title {
                            font-size: 14px;
                            font-weight: bold;
                            color: #000000;
                            margin-bottom: 15px;
                            text-transform: uppercase;
                        }
                        .detail-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 10px;
                            font-size: 12px;
                        }
                        .detail-label {
                            color: #666666;
                            font-weight: normal;
                        }
                        .detail-value {
                            color: #000000;
                            font-weight: 500;
                            text-align: right;
                        }
                        .passenger-card {
                            background-color: #F5F5F5;
                            padding: 12px;
                            border-radius: 8px;
                            margin-bottom: 12px;
                        }
                        .passenger-name {
                            font-size: 12px;
                            font-weight: bold;
                            color: #000000;
                            margin-bottom: 5px;
                        }
                        .passenger-detail {
                            font-size: 10px;
                            color: #666666;
                            margin-bottom: 3px;
                        }
                        .seat-info {
                            text-align: right;
                            margin-top: -40px;
                        }
                        .seat-label {
                            font-size: 10px;
                            color: #666666;
                        }
                        .seat-number {
                            font-size: 18px;
                            font-weight: bold;
                            color: #1776BA;
                        }
                        .separator-line {
                            height: 1px;
                            background-color: #E0E0E0;
                            margin: 10px 0;
                        }
                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 5px;
                        }
                        .total-label {
                            font-size: 14px;
                            font-weight: bold;
                            color: #000000;
                        }
                        .total-value {
                            font-size: 16px;
                            font-weight: bold;
                            color: #1776BA;
                        }
                        .footer {
                            padding: 15px;
                            background-color: #FFFFFF;
                            border-top: 1px solid #E0E0E0;
                            margin-top: 10px;
                        }
                        .footer-text {
                            font-size: 10px;
                            color: #666666;
                            line-height: 1.6;
                            margin-bottom: 8px;
                        }
                        .footer-date {
                            font-size: 10px;
                            color: #999999;
                            text-align: center;
                            margin-top: 10px;
                        }
                    </style>
                </head>
                <body>
                    <!-- Header -->
                    <div class="header">
                        <div class="header-left">
                            <h1>AllOn</h1>
                            <p>Votre partenaire de voyage</p>
                        </div>
                        <div class="header-right">
                            <div class="ref">Réf: ${ticket.code}</div>
                            <div class="status">Statut: ${formatStatus(ticket.status)}</div>
                        </div>
                    </div>
                    <div class="separator"></div>

                    <!-- QR Code Section -->
                    <div class="qr-section">
                        <div class="qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" style="width: 100%; height: 100%; display: block; margin: 0 auto;" />
                        </div>
                        <div class="qr-subtitle">Scannez pour vérifier l'authenticité du ticket</div>
                    </div>

                    <!-- Route -->
                    <div class="route">
                        <div class="route-title">${ticket.trip.stationFrom.city} - ${ticket.trip.stationTo.city}</div>
                    </div>

                    <!-- Content -->
                    <div class="content">
                        <!-- Détails du voyage -->
                        <div class="section">
                            <div class="section-title">Détails du voyage</div>
                            <div class="detail-row">
                                <span class="detail-label">Date de voyage:</span>
                                <span class="detail-value">${formatFullDate(ticket.departureDateTime)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure de départ:</span>
                                <span class="detail-value">${ticket.departureTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure d'arrivée:</span>
                                <span class="detail-value">${ticket.arrivalTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Durée du voyage:</span>
                                <span class="detail-value">${ticket.duration}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Compagnie:</span>
                                <span class="detail-value">${ticket.companyName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Véhicule:</span>
                                <span class="detail-value">N/A</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Type de transport:</span>
                                <span class="detail-value">Aller simple</span>
                            </div>
                        </div>

                        <!-- Passagers -->
                        <div class="section">
                            <div class="section-title">PASSAGERS (${ticket.passengers.length})</div>
                            ${ticket.passengers.map((passenger, index) => `
                                <div class="passenger-card">
                                    <div class="passenger-name">${index + 1}. ${passenger.firstName} ${passenger.lastName}</div>
                                    <div class="passenger-detail">Tel: ${passenger.phone}</div>
                                    <div class="passenger-detail">Email: ${passenger.email}</div>
                                    <div class="seat-info">
                                        <div class="seat-label">Siège</div>
                                        <div class="seat-number">${passenger.seatNumber}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Détails du paiement -->
                        <div class="section">
                            <div class="section-title">DÉTAILS DU PAIEMENT</div>
                            <div class="detail-row">
                                <span class="detail-label">Prix par personne:</span>
                                <span class="detail-value">${formatPriceWithCurrency(ticket.passengers[0]?.price || '0')}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Nombre de passagers:</span>
                                <span class="detail-value">${ticket.passengers.length}</span>
                            </div>
                            <div class="separator-line"></div>
                            <div class="total-row">
                                <span class="total-label">TOTAL PAYÉ:</span>
                                <span class="total-value">${formatPriceWithCurrency(ticket.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-text">
                            Ce ticket est valable uniquement pour la date et l'heure spécifiées.
                        </div>
                        <div class="footer-text">
                            Veuillez vous présenter 30 minutes avant le départ avec une pièce d'identité.
                        </div>
                        <div class="footer-text">
                            Pour toute assistance: +225 XX XX XX XX XX | contact@allon.ci
                        </div>
                        <div class="footer-date">
                            Document généré le ${formattedDate}
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    /**
     * Formate la date au format YYMMDDHHmmss pour le nom de fichier
     */
    const formatDateForFileName = (): string => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); // 2 derniers chiffres de l'année
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mois (01-12)
        const day = now.getDate().toString().padStart(2, '0'); // Jour (01-31)
        const hours = now.getHours().toString().padStart(2, '0'); // Heure (00-23)
        const minutes = now.getMinutes().toString().padStart(2, '0'); // Minute (00-59)
        const seconds = now.getSeconds().toString().padStart(2, '0'); // Seconde (00-59)
        
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };

    /**
     * Télécharge le ticket en PDF
     */
    const handleDownloadTicket = async () => {
        if (!ticket) return;

        setIsGeneratingPDF(true);
        try {
            // Générer le HTML
            const html = await generateTicketHTML();

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

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header avec bouton retour */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
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
                {/* Header bleu avec route et référence */}
                <View style={[styles.blueHeader, { backgroundColor: primaryBlue }]}>
                    <Text style={[styles.routeTitle, { width: '80%', textAlign: 'left' }]}>
                        {ticket.trip.stationFrom.city} → {ticket.trip.stationTo.city}
                    </Text>
                    <Text style={[styles.referenceText, { width: '80%', textAlign: 'left' }]}>
                        Référence: {ticket.code}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{formatStatus(ticket.status)}</Text>
                    </View>
                </View>

                {/* Section: Détails du voyage */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="map-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du voyage</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatFullDate(ticket.departureDateTime)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure de départ</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{ticket.departureTime}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure d'arrivée estimée</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{ticket.arrivalTime}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Durée</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{ticket.duration}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Compagnie</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{ticket.companyName}</Text>
                    </View>
                </View>

                {/* Section: Gares */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="map-marker-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Gares</Text>
                    </View>
                    <View style={styles.stationsContainer}>
                        <View style={styles.stationRow}>
                            <View style={[styles.stationDot, { backgroundColor: '#4CAF50' }]} />
                            <View style={styles.stationInfo}>
                                <Text style={[styles.stationLabel, { color: textColor }]}>Départ</Text>
                                <Text style={[styles.stationName, { color: secondaryTextColor }]}>
                                    {ticket.trip.stationFrom.name}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.stationLine, { backgroundColor: borderColor }]} />
                        <View style={styles.stationRow}>
                            <View style={[styles.stationDot, { backgroundColor: '#F44336' }]} />
                            <View style={styles.stationInfo}>
                                <Text style={[styles.stationLabel, { color: textColor }]}>Arrivée</Text>
                                <Text style={[styles.stationName, { color: secondaryTextColor }]}>
                                    {ticket.trip.stationTo.name}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Section: Passagers */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="account-group-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            {ticket.passengers.length > 1 ? 'Passagers' : 'Passager'} ({ticket.passengers.length})
                        </Text>
                    </View>
                    {ticket.passengers.map((passenger, index) => (
                        <View
                            key={index}
                            style={[
                                styles.passengerCard,
                                {
                                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
                                    borderColor: borderColor
                                }
                            ]}
                        >
                            <View style={styles.passengerInfo}>
                                <Text style={[styles.passengerName, { color: textColor }]}>
                                    {passenger.firstName} {passenger.lastName}
                                </Text>
                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                    {passenger.email}
                                </Text>
                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                    {passenger.phone}
                                </Text>
                            </View>
                            <View style={styles.seatInfo}>
                                <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>Siège</Text>
                                <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                                    {passenger.seatNumber}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Section: Détails du paiement */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="wallet-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du paiement</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Prix du ticket</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatPriceWithCurrency(ticket.passengers[0]?.price || '0')}
                        </Text>
                    </View>
                    {/* <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Nombre de passagers</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{ticket.passengers.length}</Text>
                    </View> */}
                    <View style={[styles.separator, { backgroundColor: borderColor }]} />
                    <View style={styles.detailRow}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Total payé</Text>
                        <Text style={[styles.totalValue, { color: primaryBlue }]}>
                            {formatPriceWithCurrency(ticket.totalAmount)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Méthode de paiement</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>
                            {formatPaymentMethod(ticket.channel)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date de réservation</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatFullDate(ticket.createdAt)}
                        </Text>
                    </View>
                </View>

                {/* Section: QR Code */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="qrcode" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Code QR de vérification</Text>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                        <QRCode value={`https://allon-frontoffice-ng.onrender.com/verify-ticket/${ticket.id}?ref=${ticket.code}`} size={150} color={primaryBlue} backgroundColor="transparent" />
                    </View>
                </View>

                {/* Section: Actions */}
                {/* <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}> */}
                {/* <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 20 }]}>Actions</Text> */}
                <Pressable
                    style={[styles.actionButton, { borderColor: primaryBlue }]}
                    onPress={handleDownloadTicket}
                    disabled={isGeneratingPDF}
                >
                    {isGeneratingPDF ? (
                        <ActivityIndicator size="small" color={primaryBlue} />
                    ) : (
                        <>
                            <Icon name="download" size={20} color={primaryBlue} />
                            <Text style={[styles.actionButtonText, { color: primaryBlue }]}>
                                Télécharger le ticket
                            </Text>
                        </>
                    )}
                </Pressable>
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
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'right',
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    totalValue: {
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
    stationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    stationInfo: {
        flex: 1,
    },
    stationLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    stationName: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    stationLine: {
        width: 2,
        height: 20,
        marginLeft: 5,
        marginBottom: 8,
    },
    passengerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    passengerDetail: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 2,
    },
    seatInfo: {
        alignItems: 'flex-end',
    },
    seatLabel: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 4,
    },
    seatNumber: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
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
});

export default TicketDetails;
