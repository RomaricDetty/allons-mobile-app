import { getBookingQrCode } from '@/api/booking';
import { formatFullDate, formatStatus } from '@/constants/functions';
import { getAuthToken } from '@/utils/storage';
// Génération QR en SVG (sans canvas) pour affichage fiable dans le PDF
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode') as { toString: (text: string, opts: { type: 'svg'; width?: number; margin?: number; color?: { dark: string; light: string } }) => Promise<string> };

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
 * Interface pour les données de réservation formatées
 */
interface BookingData {
    id: string;
    code: string;
    status: string;
    totalAmount: string | number;
    currency: string;
    provider: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    companyName: string;
    bus: {
        licencePlate: string;
    };
    trip: {
        stationFrom: {
            city: string;
        };
        stationTo: {
            city: string;
        };
    };
    returnTrip?: {
        departureDateTime: string;
        departureTime: string;
        arrivalTime: string;
        duration: string;
        companyName: string;
        bus: {
            licencePlate: string;
        };
        stationFrom: {
            city: string;
        };
        stationTo: {
            city: string;
        };
    } | null;
    prices: {
        outboundPricePerPerson: number;
        returnPricePerPerson: number;
        outboundTotalPrice: number;
        returnTotalPrice: number;
        numberOfPassengers: number;
    };
    passengers: Array<{
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        seatNumber?: number | null;
        seatNumberReturn?: number | null;
    }>;
}

/**
 * Formate le prix avec la devise
 */
const formatPriceWithCurrency = (amount: string | number, currency: string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toLocaleString('fr-FR')} ${currency}`;
};

/**
 * Récupère le hash du QR code via l'API (même source que l'écran de confirmation).
 */
const fetchQRCodeHash = async (bookingId: string): Promise<string | null> => {
    const token = await getAuthToken();
    if (!token?.trim()) return null;
    try {
        const response = await getBookingQrCode(bookingId, token);
        if (response?.status === 200 && response?.data) {
            const hash = response.data.hash ?? response.data;
            return typeof hash === 'string' && hash.trim() !== '' ? hash : null;
        }
    } catch {
        // ignore
    }
    return null;
};

/**
 * Génère le QR en SVG à partir du hash (sans ref ni data URL, fiable pour le PDF).
 */
const hashToQRCodeSVG = async (hash: string): Promise<string | null> => {
    try {
        const svg = await QRCode.toString(hash, {
            type: 'svg',
            width: 100,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
        });
        return typeof svg === 'string' && svg.trim() !== '' ? svg : null;
    } catch {
        return null;
    }
};

/**
 * Génère le HTML du reçu en récupérant le hash QR via l'API et en générant le SVG ici.
 * @param bookingData - Données de la réservation
 */
export const generateReceiptHTMLAsync = async (bookingData: BookingData): Promise<string> => {
    const hash = await fetchQRCodeHash(bookingData.id);
    const qrSvg = hash ? await hashToQRCodeSVG(hash) : null;
    return generateReceiptHTML(bookingData, qrSvg ?? undefined);
};

/**
 * Génère le HTML pour le reçu PDF.
 * @param bookingData - Données de la réservation
 * @param qrCodeSvg - QR code en SVG (généré à partir du hash, affichage fiable dans le PDF)
 */
export const generateReceiptHTML = (bookingData: BookingData, qrCodeSvg?: string): string => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const isRoundTrip = !!bookingData.returnTrip;

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
                    .qr-code img,
                    .qr-code svg {
                        width: 100%;
                        height: 100%;
                        display: block;
                        margin: 0 auto;
                        object-fit: contain;
                    }
                    .qr-unavailable {
                        font-size: 11px;
                        color: #999999;
                        margin: 0;
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

                <!-- QR Code Section (SVG généré à partir du hash, pas de data URL) -->
                <div class="qr-section">
                    <div class="qr-code">
                        ${qrCodeSvg && qrCodeSvg.trim() !== ''
                            ? `__QR_SVG_PLACEHOLDER__`
                            : '<p class="qr-unavailable">Code QR non disponible</p>'}
                    </div>
                    <div class="qr-subtitle">Scannez pour vérifier l'authenticité du ticket</div>
                </div>

                <!-- Route -->
                <div class="route">
                    <div class="route-title">${bookingData.trip.stationFrom.city} - ${bookingData.trip.stationTo.city}${isRoundTrip ? ` - ${bookingData.returnTrip!.stationTo.city}` : ''}</div>
                </div>

                <!-- Content -->
                <div class="content">
                    <!-- Détails du voyage aller -->
                    <div class="section">
                        <div class="section-title">${isRoundTrip ? 'Détails du voyage aller' : 'Détails du voyage'}</div>
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

                    ${isRoundTrip ? `
                    <!-- Détails du voyage retour -->
                    <div class="section">
                        <div class="section-title">Détails du voyage retour</div>
                        <div class="detail-row">
                            <span class="detail-label">Itinéraire:</span>
                            <span class="detail-value">${bookingData.returnTrip!.stationFrom.city} → ${bookingData.returnTrip!.stationTo.city}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date de voyage:</span>
                            <span class="detail-value">${formatFullDate(bookingData.returnTrip!.departureDateTime)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Heure de départ:</span>
                            <span class="detail-value">${bookingData.returnTrip!.departureTime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Heure d'arrivée:</span>
                            <span class="detail-value">${bookingData.returnTrip!.arrivalTime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Durée du voyage:</span>
                            <span class="detail-value">${bookingData.returnTrip!.duration}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Compagnie:</span>
                            <span class="detail-value">${bookingData.returnTrip!.companyName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Véhicule:</span>
                            <span class="detail-value">${bookingData.returnTrip!.bus.licencePlate}</span>
                        </div>
                    </div>
                    ` : ''}

                    ${isRoundTrip ? `
                    <!-- Passagers - Voyage aller -->
                    <div class="section">
                        <div class="section-title">PASSAGERS - VOYAGE ALLER (${bookingData.passengers.length})</div>
                        ${bookingData.passengers.map((passenger, index) => {
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
                        ${bookingData.passengers.map((passenger, index) => {
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
                        ${bookingData.passengers.map((passenger, index) => {
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
                        ${isRoundTrip ? `
                            <div class="detail-row">
                                <span class="detail-label">Prix voyage aller:</span>
                                <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.outboundTotalPrice, bookingData.currency)}</span>
                            </div>
                            ${bookingData.prices.numberOfPassengers > 1 ? `
                                <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                    <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.outboundPricePerPerson, bookingData.currency)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Prix voyage retour:</span>
                                <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.returnTotalPrice, bookingData.currency)}</span>
                            </div>
                            ${bookingData.prices.numberOfPassengers > 1 ? `
                                <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                    <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.returnPricePerPerson, bookingData.currency)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="detail-row">
                                <span class="detail-label">Prix du ticket:</span>
                                <span class="detail-value">${formatPriceWithCurrency(bookingData.prices.outboundTotalPrice, bookingData.currency)}</span>
                            </div>
                            ${bookingData.prices.numberOfPassengers > 1 ? `
                                <div class="detail-row" style="font-size: 10px; color: #666666; margin-top: -8px; margin-bottom: 8px;">
                                    <span class="detail-label">(${formatPriceWithCurrency(bookingData.prices.outboundPricePerPerson, bookingData.currency)} × ${bookingData.prices.numberOfPassengers} passager${bookingData.prices.numberOfPassengers > 1 ? 's' : ''})</span>
                                </div>
                            ` : ''}
                        `}
                        <div class="separator-line"></div>
                        <div class="total-row">
                            <span class="total-label">TOTAL PAYÉ:</span>
                            <span class="total-value">${formatPriceWithCurrency(bookingData.totalAmount, bookingData.currency)}</span>
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
    `.replace('__QR_SVG_PLACEHOLDER__', (qrCodeSvg && qrCodeSvg.trim() !== '') ? qrCodeSvg : '');
};

