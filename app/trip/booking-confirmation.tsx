// @ts-nocheck
import { formatFullDate, formatFullDateWithTime, formatStatus, getStatusColor } from '@/constants/functions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRoute } from '@react-navigation/native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
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
    // const navigation = useNavigation();
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

    // Récupération des données de la réservation
    const { bookingResponse, paymentResponse, trip, returnTrip, passengers, searchParams } = (route.params as {
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
        if (!bookingResponse?.data || !paymentResponse?.data) {
            return null;
        }

        const booking = bookingResponse.data;
        const payment = paymentResponse.data;
        const bookingId = booking.bookingId || booking.id;
        const bookingCode = booking.code || booking.bookingCode || `BK-${bookingId?.slice(-8)}`;
        
        // Extraire les informations du trajet
        const departureInfo = booking.departure || trip;
        const returnDepartureInfo = booking.returnDeparture || returnTrip;
        
        // Déterminer le type de trajet
        const tripType = booking.type || (returnTrip ? 'ROUND_TRIP' : 'ONE_WAY');
        const isRoundTrip = tripType === 'ROUND_TRIP';
        
        // Logs de débogage pour identifier les problèmes
        console.log('=== DEBUG BOOKING CONFIRMATION ===');
        console.log('departureInfo:', JSON.stringify(departureInfo, null, 2));
        console.log('trip:', JSON.stringify(trip, null, 2));
        console.log('booking:', JSON.stringify(booking, null, 2));
        console.log('passengers (from params):', JSON.stringify(passengers, null, 2));
        console.log('booking.passengers:', JSON.stringify(booking.passengers, null, 2));
        
        // Extraire les informations des passagers depuis la réponse ou les données passées
        // La réponse de l'API peut avoir les passagers groupés par leg (OUTBOUND/RETURN)
        // ou dans un format simple avec seatNumber et seatNumberReturn
        let processedPassengers: Array<any> = [];
        
        if (booking.passengers && booking.passengers.length > 0) {
            // Si les passagers viennent de l'API, ils peuvent être groupés par leg
            // On doit les regrouper par passager (même firstName/lastName/phone/email)
            const passengersMap = new Map<string, any>();
            
            booking.passengers.forEach((p: any) => {
                const key = `${p.firstName}_${p.lastName}_${p.phone}_${p.email}`;
                
                if (!passengersMap.has(key)) {
                    passengersMap.set(key, {
                        firstName: p.firstName || '',
                        lastName: p.lastName || '',
                        email: p.email || '',
                        phone: p.phone || '',
                        seatNumber: null,
                        seatNumberReturn: null,
                        isMainPassenger: p.isMainPassenger || false,
                        passengerType: p.passengerType || 'adult',
                        price: p.price || trip?.price || '0'
                    });
                }
                
                const passenger = passengersMap.get(key)!;
                // Assigner le siège selon le leg
                if (p.leg === 'OUTBOUND' || p.leg === 'OUT') {
                    passenger.seatNumber = p.seatNumber || passenger.seatNumber;
                } else if (p.leg === 'RETURN' || p.leg === 'RET') {
                    passenger.seatNumberReturn = p.seatNumber || passenger.seatNumberReturn;
                } else {
                    // Si pas de leg spécifié, on assume que c'est l'aller
                    passenger.seatNumber = p.seatNumber || passenger.seatNumber;
                }
            });
            
            processedPassengers = Array.from(passengersMap.values());
        } else if (passengers && passengers.length > 0) {
            // Si on utilise les passagers passés en paramètre
            processedPassengers = passengers.map((p: any) => ({
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                email: p.email || '',
                phone: p.phone || '',
                seatNumber: p.seatNumber || null,
                seatNumberReturn: p.seatNumberReturn || null,
                isMainPassenger: p.isMainPassenger || false,
                passengerType: p.passengerType || 'adult',
                price: p.price || trip?.price || '0'
            }));
        }
        
        // Extraire les informations de la compagnie et du véhicule pour l'aller
        const outboundCompanyName = 
            departureInfo?.companyName || 
            departureInfo?.company?.name ||
            departureInfo?.company ||
            trip?.companyName || 
            trip?.company?.name ||
            trip?.company ||
            booking.companyName ||
            booking.company?.name ||
            booking.company ||
            'N/A';
        
        const outboundLicencePlate = 
            departureInfo?.bus?.licencePlate || 
            departureInfo?.bus?.licensePlate ||
            departureInfo?.licencePlate ||
            departureInfo?.licensePlate ||
            trip?.bus?.licencePlate ||
            trip?.bus?.licensePlate ||
            trip?.licencePlate ||
            trip?.licensePlate ||
            booking.bus?.licencePlate ||
            booking.bus?.licensePlate ||
            'N/A';
        
        // Extraire les informations de la compagnie et du véhicule pour le retour (si aller-retour)
        const returnCompanyName = isRoundTrip ? (
            returnDepartureInfo?.companyName || 
            returnDepartureInfo?.company?.name ||
            returnDepartureInfo?.company ||
            returnTrip?.companyName || 
            returnTrip?.company?.name ||
            returnTrip?.company ||
            'N/A'
        ) : null;
        
        const returnLicencePlate = isRoundTrip ? (
            returnDepartureInfo?.bus?.licencePlate || 
            returnDepartureInfo?.bus?.licensePlate ||
            returnDepartureInfo?.licencePlate ||
            returnDepartureInfo?.licensePlate ||
            returnTrip?.bus?.licencePlate ||
            returnTrip?.bus?.licensePlate ||
            returnTrip?.licencePlate ||
            returnTrip?.licensePlate ||
            'N/A'
        ) : null;
        
        // Calculer les prix pour l'affichage
        const numberOfPassengers = processedPassengers.length || passengers?.length || 1;
        const outboundPricePerPerson = departureInfo?.price || trip?.price || 0;
        const returnPricePerPerson = isRoundTrip ? (returnDepartureInfo?.price || returnTrip?.price || 0) : 0;
        const outboundTotalPrice = outboundPricePerPerson * numberOfPassengers;
        const returnTotalPrice = isRoundTrip ? returnPricePerPerson * numberOfPassengers : 0;
        
        return {
            id: bookingId,
            code: bookingCode,
            status: payment.status || booking.status || 'PAID',
            totalAmount: payment.amount || booking.totalAmount || '0',
            currency: payment.currency || booking.currency || trip?.currency || 'XOF',
            method: payment.method || 'MOBILE_MONEY',
            provider: payment.provider || payment.paymentProvider || 'N/A',
            paymentProvider: payment.provider || payment.paymentProvider || 'N/A',
            createdAt: booking.createdAt || new Date().toISOString(),
            // Informations du voyage aller
            departureDateTime: departureInfo?.departureDateTime || trip?.departureDateTime || '',
            departureTime: departureInfo?.departureTime || trip?.departureTime || '',
            arrivalTime: departureInfo?.arrivalTime || trip?.arrivalTime || '',
            duration: departureInfo?.duration || trip?.duration || '',
            companyName: outboundCompanyName,
            bus: {
                licencePlate: outboundLicencePlate
            },
            trip: {
                label: departureInfo?.label || trip?.label || '',
                type: tripType,
                stationFrom: {
                    city: departureInfo?.departureCity || trip?.departureCity || '',
                    name: departureInfo?.departureStation || trip?.departureStation || ''
                },
                stationTo: {
                    city: departureInfo?.arrivalCity || trip?.arrivalCity || '',
                    name: departureInfo?.arrivalStation || trip?.arrivalStation || ''
                }
            },
            // Informations du voyage retour (si aller-retour)
            returnTrip: isRoundTrip ? {
                departureDateTime: returnDepartureInfo?.departureDateTime || returnTrip?.departureDateTime || '',
                departureTime: returnDepartureInfo?.departureTime || returnTrip?.departureTime || '',
                arrivalTime: returnDepartureInfo?.arrivalTime || returnTrip?.arrivalTime || '',
                duration: returnDepartureInfo?.duration || returnTrip?.duration || '',
                companyName: returnCompanyName,
                bus: {
                    licencePlate: returnLicencePlate
                },
                stationFrom: {
                    city: returnDepartureInfo?.departureCity || returnTrip?.departureCity || '',
                    name: returnDepartureInfo?.departureStation || returnTrip?.departureStation || ''
                },
                stationTo: {
                    city: returnDepartureInfo?.arrivalCity || returnTrip?.arrivalCity || '',
                    name: returnDepartureInfo?.arrivalStation || returnTrip?.arrivalStation || ''
                },
                price: returnPricePerPerson
            } : null,
            // Prix pour l'affichage
            prices: {
                outboundPricePerPerson: outboundPricePerPerson,
                returnPricePerPerson: returnPricePerPerson,
                outboundTotalPrice: outboundTotalPrice,
                returnTotalPrice: returnTotalPrice,
                numberOfPassengers: numberOfPassengers
            },
            passengers: processedPassengers,
            contact: booking.contact || {}
        };
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
                console.log('Back button pressed - navigation blocked');
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
    const handleNavigateToHome = () => {
        router.replace('/(tabs)');
    };

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
    const formatPriceWithCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${numAmount.toLocaleString('fr-FR')} ${bookingData.currency}`;
    };

    /**
     * Formate la méthode de paiement
     */
    const formatPaymentMethod = (method: string): string => {
        const methodMap: { [key: string]: string } = {
            'MOBILE_MONEY': 'Mobile Money',
            'CREDIT_CARD': 'Carte bancaire',
            'WAVE': 'Wave',
            'MTN_MONEY': 'MTN Mobile Money',
            'ORANGE_MONEY': 'Orange Money',
        };
        return methodMap[method] || method;
    };

    /**
     * Génère le HTML pour le reçu PDF
     */
    const generateReceiptHTML = (): string => {
        const qrCodeData = `https://allon-frontoffice-ng.onrender.com/verify-ticket/${bookingData.id}?ref=${bookingData.code}`;
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
                            width: 100px;
                            height: 100px;
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
                        .qr-subtitle {
                            font-size: 12px;
                            color: #666666;
                            margin-top: 10px;
                        }
                        .route {
                            text-align: center;
                            padding: 20px 15px;
                            background-color: #FFFFFF;
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
                            <div class="ref">Réf: ${bookingData.code}</div>
                            <div class="status">Statut: ${formatStatus(bookingData.status)}</div>
                        </div>
                    </div>
                    <div class="separator"></div>

                    <!-- QR Code Section -->
                    <div class="qr-section">
                        <div class="qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" style="width: 100%; height: 100%; display: block; margin: 0 auto;" />
                        </div>
                        <div class="qr-subtitle">Scannez pour vérifier l'authenticité du ticket</div>
                    </div>

                    <!-- Route -->
                    <div class="route">
                        <div class="route-title">${bookingData.trip.stationFrom.city} - ${bookingData.trip.stationTo.city}${bookingData.returnTrip ? ` - ${bookingData.returnTrip.stationTo.city}` : ''}</div>
                    </div>

                    <!-- Content -->
                    <div class="content">
                        <!-- Détails du voyage aller -->
                        <div class="section">
                            <div class="section-title">${bookingData.returnTrip ? 'Détails du voyage aller' : 'Détails du voyage'}</div>
                            <div class="detail-row">
                                <span class="detail-label">Itinéraire:</span>
                                <span class="detail-value">${bookingData.trip.stationFrom.city} → ${bookingData.trip.stationTo.city}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date de voyage:</span>
                                <span class="detail-value">${formatFullDate(bookingData.departureDateTime)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure de départ:</span>
                                <span class="detail-value">${bookingData.departureTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure d'arrivée:</span>
                                <span class="detail-value">${bookingData.arrivalTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Durée du voyage:</span>
                                <span class="detail-value">${bookingData.duration}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Compagnie:</span>
                                <span class="detail-value">${bookingData.companyName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Véhicule:</span>
                                <span class="detail-value">${bookingData.bus.licencePlate}</span>
                            </div>
                        </div>

                        ${bookingData.returnTrip ? `
                        <!-- Détails du voyage retour -->
                        <div class="section">
                            <div class="section-title">Détails du voyage retour</div>
                            <div class="detail-row">
                                <span class="detail-label">Itinéraire:</span>
                                <span class="detail-value">${bookingData.returnTrip.stationFrom.city} → ${bookingData.returnTrip.stationTo.city}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date de voyage:</span>
                                <span class="detail-value">${formatFullDate(bookingData.returnTrip.departureDateTime)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure de départ:</span>
                                <span class="detail-value">${bookingData.returnTrip.departureTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heure d'arrivée:</span>
                                <span class="detail-value">${bookingData.returnTrip.arrivalTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Durée du voyage:</span>
                                <span class="detail-value">${bookingData.returnTrip.duration}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Compagnie:</span>
                                <span class="detail-value">${bookingData.returnTrip.companyName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Véhicule:</span>
                                <span class="detail-value">${bookingData.returnTrip.bus.licencePlate}</span>
                            </div>
                        </div>
                        ` : ''}

                        ${bookingData.returnTrip ? `
                        <!-- Passagers - Voyage aller -->
                        <div class="section">
                            <div class="section-title">PASSAGERS - VOYAGE ALLER (${bookingData.passengers.length})</div>
                            ${bookingData.passengers.map((passenger: any, index: number) => {
                                const hasOutboundSeat = passenger.seatNumber !== null && passenger.seatNumber !== undefined;
                                
                                return `
                                    <div class="passenger-card">
                                        <div class="passenger-name">${index + 1}. ${passenger.firstName} ${passenger.lastName}</div>
                                        ${passenger.phone ? `<div class="passenger-detail">Tel: ${passenger.phone}</div>` : ''}
                                        ${passenger.email ? `<div class="passenger-detail">Email: ${passenger.email}</div>` : ''}
                                        ${hasOutboundSeat ? `
                                            <div class="seat-info">
                                                <div class="seat-label">Siège</div>
                                                <div class="seat-number">${passenger.seatNumber}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Passagers - Voyage retour -->
                        <div class="section">
                            <div class="section-title">PASSAGERS - VOYAGE RETOUR (${bookingData.passengers.length})</div>
                            ${bookingData.passengers.map((passenger: any, index: number) => {
                                const hasReturnSeat = passenger.seatNumberReturn !== null && passenger.seatNumberReturn !== undefined;
                                
                                return `
                                    <div class="passenger-card">
                                        <div class="passenger-name">${index + 1}. ${passenger.firstName} ${passenger.lastName}</div>
                                        ${passenger.phone ? `<div class="passenger-detail">Tel: ${passenger.phone}</div>` : ''}
                                        ${passenger.email ? `<div class="passenger-detail">Email: ${passenger.email}</div>` : ''}
                                        ${hasReturnSeat ? `
                                            <div class="seat-info">
                                                <div class="seat-label">Siège</div>
                                                <div class="seat-number">${passenger.seatNumberReturn}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ` : `
                        <!-- Passagers -->
                        <div class="section">
                            <div class="section-title">PASSAGERS (${bookingData.passengers.length})</div>
                            ${bookingData.passengers.map((passenger: any, index: number) => {
                                const hasOutboundSeat = passenger.seatNumber !== null && passenger.seatNumber !== undefined;
                                
                                return `
                                    <div class="passenger-card">
                                        <div class="passenger-name">${index + 1}. ${passenger.firstName} ${passenger.lastName}</div>
                                        ${passenger.phone ? `<div class="passenger-detail">Tel: ${passenger.phone}</div>` : ''}
                                        ${passenger.email ? `<div class="passenger-detail">Email: ${passenger.email}</div>` : ''}
                                        ${hasOutboundSeat ? `
                                            <div class="seat-info">
                                                <div class="seat-label">Siège</div>
                                                <div class="seat-number">${passenger.seatNumber}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        `}

                        <!-- Détails du paiement -->
                        <div class="section">
                            <div class="section-title">DÉTAILS DU PAIEMENT</div>
                            ${bookingData.returnTrip ? `
                                <div class="detail-row">
                                    <span class="detail-label">Prix voyage aller:</span>
                                    <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.outboundTotalPrice)}</span>
                                </div>
                                ${bookingData.prices.numberOfPassengers > 1 ? `
                                    <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                        <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.outboundPricePerPerson)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                    </div>
                                ` : ''}
                                <div class="detail-row">
                                    <span class="detail-label">Prix voyage retour:</span>
                                    <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.returnTotalPrice)}</span>
                                </div>
                                ${bookingData.prices.numberOfPassengers > 1 ? `
                                    <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                        <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.returnPricePerPerson)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="detail-row">
                                    <span class="detail-label">Prix du ticket:</span>
                                    <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.outboundTotalPrice)}</span>
                                </div>
                                ${bookingData.prices.numberOfPassengers > 1 ? `
                                    <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                        <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.outboundPricePerPerson)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                    </div>
                                ` : ''}
                            `}
                            <div class="separator-line"></div>
                            <div class="total-row">
                                <span class="total-label">TOTAL PAYÉ:</span>
                                <span class="total-value">${formatPriceWithCurrency(bookingData.totalAmount)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Méthode de paiement:</span>
                                <span class="detail-value">${formatPaymentMethod(bookingData.provider)}</span>
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
    const handleDownloadReceipt = async () => {
        if (!bookingData) return;

        setIsGeneratingPDF(true);
        try {
            // Générer le HTML
            const html = await generateReceiptHTML();

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
    };

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
                        <QRCode
                            value={`https://allon-frontoffice-ng.onrender.com/verify-ticket/${bookingData.id}?ref=${bookingData.code}`}
                            size={150}
                            color={primaryBlue}
                            backgroundColor="transparent"
                        />
                    </View>
                </View>

                {/* Section: Détails du voyage aller */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="map-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            {bookingData.returnTrip ? 'Détails du voyage aller' : 'Détails du voyage'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Itinéraire</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {bookingData.trip.stationFrom.city} → {bookingData.trip.stationTo.city}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatFullDate(bookingData.departureDateTime)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure de départ</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.departureTime}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure d'arrivée estimée</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.arrivalTime}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Durée</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.duration}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Compagnie</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.companyName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Véhicule</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}> {bookingData.bus.licencePlate} </Text>
                    </View>
                </View>

                {/* Section: Détails du voyage retour (si aller-retour) */}
                {bookingData.returnTrip && (
                    <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                            <Icon name="map-outline" size={20} color={primaryBlue} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du voyage retour</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Itinéraire</Text>
                            <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                                {bookingData.returnTrip.stationFrom.city} → {bookingData.returnTrip.stationTo.city}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date</Text>
                            <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                                {formatFullDate(bookingData.returnTrip.departureDateTime)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure de départ</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.returnTrip.departureTime}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Heure d'arrivée estimée</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.returnTrip.arrivalTime}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Durée</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.returnTrip.duration}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Compagnie</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}>{bookingData.returnTrip.companyName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Véhicule</Text>
                            <Text style={[styles.detailValue, { color: textColor }]}> {bookingData.returnTrip.bus.licencePlate} </Text>
                        </View>
                    </View>
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
                            {bookingData.passengers.map((passenger: any, index: number) => {
                                const hasOutboundSeat = passenger.seatNumber !== null && passenger.seatNumber !== undefined;
                                
                                return (
                                    <View
                                        key={`outbound-${index}`}
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
                                            {passenger.email && (
                                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                    {passenger.email}
                                                </Text>
                                            )}
                                            {passenger.phone && (
                                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                    {passenger.phone}
                                                </Text>
                                            )}
                                        </View>
                                        {hasOutboundSeat && (
                                            <View style={styles.seatInfo}>
                                                <View style={styles.seatInfoItem}>
                                                    <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>
                                                        Siège
                                                    </Text>
                                                    <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                                                        {passenger.seatNumber}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Passagers - Voyage retour */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="account-group-outline" size={20} color={primaryBlue} />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                    Passagers - Voyage retour ({bookingData.passengers.length})
                                </Text>
                            </View>
                            {bookingData.passengers.map((passenger: any, index: number) => {
                                const hasReturnSeat = passenger.seatNumberReturn !== null && passenger.seatNumberReturn !== undefined;
                                
                                return (
                                    <View
                                        key={`return-${index}`}
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
                                            {passenger.email && (
                                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                    {passenger.email}
                                                </Text>
                                            )}
                                            {passenger.phone && (
                                                <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                    {passenger.phone}
                                                </Text>
                                            )}
                                        </View>
                                        {hasReturnSeat && (
                                            <View style={styles.seatInfo}>
                                                <View style={styles.seatInfoItem}>
                                                    <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>
                                                        Siège
                                                    </Text>
                                                    <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                                                        {passenger.seatNumberReturn}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
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
                        {bookingData.passengers.map((passenger: any, index: number) => {
                            const hasOutboundSeat = passenger.seatNumber !== null && passenger.seatNumber !== undefined;
                            
                            return (
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
                                        {passenger.email && (
                                            <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                {passenger.email}
                                            </Text>
                                        )}
                                        {passenger.phone && (
                                            <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                                                {passenger.phone}
                                            </Text>
                                        )}
                                    </View>
                                    {hasOutboundSeat && (
                                        <View style={styles.seatInfo}>
                                            <View style={styles.seatInfoItem}>
                                                <Text style={[styles.seatLabel, { color: secondaryTextColor }]}>
                                                    Siège
                                                </Text>
                                                <Text style={[styles.seatNumber, { color: primaryBlue }]}>
                                                    {passenger.seatNumber}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Section: Détails du paiement */}
                <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
                        <Icon name="wallet-outline" size={20} color={primaryBlue} />
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Détails du paiement</Text>
                    </View>
                    
                    {/* Prix du voyage aller */}
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>
                            {bookingData.returnTrip ? 'Prix voyage aller' : 'Prix du ticket'}
                        </Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatPriceWithCurrency(bookingData.prices.outboundTotalPrice)}
                        </Text>
                    </View>
                    {bookingData.prices.numberOfPassengers > 1 && (
                        <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                            ({formatPriceWithCurrency(bookingData.prices.outboundPricePerPerson)} × {bookingData.prices.numberOfPassengers} passager{bookingData.prices.numberOfPassengers > 1 ? 's' : ''})
                        </Text>
                    )}
                    
                    {/* Prix du voyage retour (si aller-retour) */}
                    {bookingData.returnTrip && (
                        <>
                            <View style={[styles.detailRow, { marginTop: 12 }]}>
                                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Prix voyage retour</Text>
                                <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                                    {formatPriceWithCurrency(bookingData.prices.returnTotalPrice)}
                                </Text>
                            </View>
                            {bookingData.prices.numberOfPassengers > 1 && (
                                <Text style={[styles.priceSubtext, { color: secondaryTextColor }]}>
                                    ({formatPriceWithCurrency(bookingData.prices.returnPricePerPerson)} × {bookingData.prices.numberOfPassengers} passager{bookingData.prices.numberOfPassengers > 1 ? 's' : ''})
                                </Text>
                            )}
                        </>
                    )}
                    
                    <View style={[styles.separator, { backgroundColor: borderColor, marginTop: 12 }]} />
                    <View style={styles.detailRow}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Total payé</Text>
                        <Text style={[styles.totalValue, { color: primaryBlue }]}>
                            {formatPriceWithCurrency(bookingData.totalAmount)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Méthode de paiement</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>
                            {formatPaymentMethod(bookingData.provider)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date de réservation</Text>
                        <Text style={[styles.detailValue, { color: textColor, textAlign: 'right', width: '45%' }]}>
                            {formatFullDateWithTime(bookingData.createdAt)}
                        </Text>
                    </View>
                </View>

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
    priceSubtext: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Regular',
        marginTop: -4,
        marginBottom: 4,
        marginLeft: 0,
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
    seatInfoItem: {
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

