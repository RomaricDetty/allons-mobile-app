import { formatFullDate, formatStatus } from '@/constants/functions';

/**
 * Interface pour les détails d'un ticket (pour le PDF)
 */
interface TicketForPDF {
    id: string;
    code: string;
    status: string;
    totalAmount: string;
    currency: string;
    departureDateTime: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    companyName: string;
    bus: {
        licencePlate: string;
    };
    trip: {
        type?: string;
        stationFrom: {
            city: string;
        };
        stationTo: {
            city: string;
        };
    };
    passengers: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        seatNumber: number;
        price: string;
    }>;
}

/**
 * Formate le prix avec la devise
 */
const formatPriceWithCurrency = (amount: string, currency: string): string => {
    const numAmount = parseFloat(amount);
    return `${numAmount.toLocaleString('fr-FR')} ${currency}`;
};

/**
 * Génère le HTML pour le PDF du ticket
 * @param ticket - Les données du ticket
 * @returns Le HTML formaté pour le PDF
 */
export const generateTicketHTML = (ticket: TicketForPDF): string => {
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
                        <div class="ref">Réf: ${ticket.code}</div>
                        <div class="status">Statut: ${formatStatus(ticket.status)}</div>
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
                            <span class="detail-value">${ticket.bus.licencePlate}</span>
                        </div>
                        ${ticket.trip.type ? `
                        <div class="detail-row">
                            <span class="detail-label">Type de transport:</span>
                            <span class="detail-value">${ticket.trip.type === 'ONE_WAY' ? 'Aller simple' : 'Aller-retour'}</span>
                        </div>
                        ` : ''}
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
                            <span class="detail-value">${formatPriceWithCurrency(ticket.passengers[0]?.price || '0', ticket.currency)}</span>
                        </div>
                        <div class="separator-line"></div>
                        <div class="total-row">
                            <span class="total-label">TOTAL PAYÉ:</span>
                            <span class="total-value">${formatPriceWithCurrency(ticket.totalAmount, ticket.currency)}</span>
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
export const formatDateForFileName = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

