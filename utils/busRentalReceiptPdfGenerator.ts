import { formatFullDate, formatStatus } from '@/constants/functions';

interface BusRentalReceiptData {
    id?: string;
    code?: string;
    reference?: string;
    status?: string;
    firstName?: string;
    lastName?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    email?: string;
    phone?: string | { countryCode?: string; digits?: string; number?: string };
    departureDate?: string;
    returnDate?: string | null;
    departureCity?: { name?: string };
    arrivalCity?: { name?: string };
    departureCityDetail?: string;
    arrivalCityDetail?: string;
    tripType?: string;
    passengerCount?: number;
    requiredCapacity?: number;
    passengerType?: string;
    busType?: string;
    luggageNeeds?: string;
    accessibilityNeeds?: string;
    tripPurpose?: string;
    additionalServices?: string[];
    specialInstructions?: string;
    quotedAmount?: number | string;
    quoteAmount?: number | string;
    amount?: number | string;
    totalAmount?: number | string;
    currency?: string;
    companyName?: string;
    company?: { name?: string };
    quote?: { companyName?: string };
    paymentReference?: string;
    paymentProvider?: string;
    provider?: string;
    method?: string;
    createdAt?: string;
    updatedAt?: string;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
    ONE_WAY: 'Aller simple',
    ROUND_TRIP: 'Aller-retour',
};

const PASSENGER_TYPE_LABELS: Record<string, string> = {
    ADULTS: 'Adultes',
    CHILDREN: 'Enfants',
    MIXED: 'Mixte',
};

const BUS_TYPE_LABELS: Record<string, string> = {
    BUS: 'Bus standard',
    LUXURY_BUS: 'Bus de luxe',
    MINIBUS: 'Minibus',
    STANDARD: 'Bus standard',
};

const LUGGAGE_LABELS: Record<string, string> = {
    LOW: 'Faible',
    MEDIUM: 'Moyen',
    HIGH: 'Élevé',
    NONE: 'Aucun',
};

const ACCESSIBILITY_LABELS: Record<string, string> = {
    NONE: 'Aucune',
    ELDERLY_FRIENDLY: 'Adapté aux seniors',
    WHEELCHAIR: 'Fauteuil roulant',
};

const TRIP_PURPOSE_LABELS: Record<string, string> = {
    CORPORATE: 'Entreprise',
    SCHOOL: 'Scolaire',
    RELIGIOUS: 'Religieux',
    WEDDING: 'Mariage',
    TOUR: 'Tour / Excursion',
    OTHER: 'Autre',
};

const ADDITIONAL_SERVICE_LABELS: Record<string, string> = {
    CLIMATE_CONTROL: 'Climatisation',
    AIR_CONDITIONING: 'Climatisation',
    WIFI: 'WiFi',
    TOILET: 'Toilettes',
    BOARDING_SERVICE: "Service d'embarquement",
    ENTERTAINMENT: 'Divertissement',
    BRANDING: 'Marquage / Branding',
};

/**
 * Retourne une référence stable pour nommer le reçu de location de bus.
 */
export const getBusRentalReceiptReference = (item: BusRentalReceiptData): string => {
    return item.code ?? item.reference ?? item.paymentReference ?? item.id ?? 'location-bus';
};

/**
 * Génère le HTML du reçu PDF pour une location de bus confirmée.
 */
export const generateBusRentalReceiptHTML = (item: BusRentalReceiptData): string => {
    const currentDate = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const reference = getBusRentalReceiptReference(item);
    const currency = item.currency ?? 'XOF';
    const amount = item.quotedAmount ?? item.quoteAmount ?? item.amount ?? item.totalAmount;
    const companyName = item.quote?.companyName ?? item.company?.name ?? item.companyName ?? '—';
    const clientName = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.customerName || '—';
    const passengerCount = item.passengerCount ?? item.requiredCapacity;
    const serviceLabels = Array.isArray(item.additionalServices)
        ? item.additionalServices.map((service) => ADDITIONAL_SERVICE_LABELS[service] ?? service).join(', ')
        : '—';

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Ubuntu_Regular', sans-serif;
                        background-color: #FFFFFF;
                        color: #000000;
                    }
                    .header {
                        background-color: #1776BA;
                        color: #FFFFFF;
                        padding: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                    .header h1 { font-size: 24px; margin-bottom: 5px; }
                    .header p { font-size: 10px; opacity: 0.9; }
                    .header-right { text-align: right; }
                    .ref { font-size: 12px; font-weight: bold; margin-bottom: 5px; }
                    .status {
                        font-size: 10px;
                        background-color: #4CAF50;
                        padding: 4px 8px;
                        border-radius: 4px;
                        display: inline-block;
                    }
                    .separator { height: 2px; background-color: #1776BA; }
                    .route {
                        text-align: center;
                        padding: 22px 15px;
                        border-bottom: 1px solid #E0E0E0;
                    }
                    .route-title {
                        font-size: 20px;
                        font-weight: bold;
                    }
                    .route-subtitle {
                        font-size: 12px;
                        color: #666666;
                        margin-top: 8px;
                    }
                    .content { padding: 20px; }
                    .section { margin-bottom: 24px; }
                    .section-title {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 14px;
                        text-transform: uppercase;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 16px;
                        margin-bottom: 10px;
                        font-size: 12px;
                    }
                    .detail-label { color: #666666; }
                    .detail-value {
                        color: #000000;
                        font-weight: 500;
                        text-align: right;
                    }
                    .total-box {
                        background-color: #F5F5F5;
                        border-radius: 8px;
                        padding: 14px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .total-label {
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .total-value {
                        font-size: 18px;
                        font-weight: bold;
                        color: #1776BA;
                    }
                    .footer {
                        padding: 15px;
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
                <div class="header">
                    <div>
                        <h1>AllOn</h1>
                        <p>Votre partenaire de voyage</p>
                    </div>
                    <div class="header-right">
                        <div class="ref">Réf: ${escapeHtml(reference)}</div>
                        <div class="status">Statut: ${escapeHtml(formatStatus(item.status ?? 'CONFIRMED'))}</div>
                    </div>
                </div>
                <div class="separator"></div>

                <div class="route">
                    <div class="route-title">${escapeHtml(getCityName(item.departureCity, item.departureCityDetail))} → ${escapeHtml(getCityName(item.arrivalCity, item.arrivalCityDetail))}</div>
                    <div class="route-subtitle">Reçu de location de bus</div>
                </div>

                <div class="content">
                    <div class="section">
                        <div class="section-title">Informations client</div>
                        ${renderRow('Nom', clientName)}
                        ${renderRow('Téléphone', formatPhone(item.phone ?? item.customerPhone))}
                        ${renderRow('Email', item.email ?? item.customerEmail ?? '—')}
                    </div>

                    <div class="section">
                        <div class="section-title">Détails de la location</div>
                        ${renderRow('Type de trajet', getLabel(TRIP_TYPE_LABELS, item.tripType))}
                        ${renderRow('Date de départ', formatDate(item.departureDate))}
                        ${renderRow('Date de retour', item.returnDate ? formatDate(item.returnDate) : '—')}
                        ${renderRow('Passagers', passengerCount ? String(passengerCount) : '—')}
                        ${renderRow('Type de passagers', getLabel(PASSENGER_TYPE_LABELS, item.passengerType))}
                        ${renderRow('Type de bus', getLabel(BUS_TYPE_LABELS, item.busType))}
                        ${renderRow('Capacité demandée', item.requiredCapacity ? `${item.requiredCapacity} places` : '—')}
                    </div>

                    <div class="section">
                        <div class="section-title">Préférences</div>
                        ${renderRow('Bagages', getLabel(LUGGAGE_LABELS, item.luggageNeeds))}
                        ${renderRow('Accessibilité', getLabel(ACCESSIBILITY_LABELS, item.accessibilityNeeds))}
                        ${renderRow('Objet du voyage', getLabel(TRIP_PURPOSE_LABELS, item.tripPurpose))}
                        ${renderRow('Services supplémentaires', serviceLabels)}
                        ${renderRow('Instructions spéciales', item.specialInstructions ?? 'RAS')}
                    </div>

                    <div class="section">
                        <div class="section-title">Paiement</div>
                        ${renderRow('Compagnie', companyName)}
                        ${renderRow('Référence paiement', item.paymentReference ?? '—')}
                        ${renderRow('Méthode', item.method ?? item.provider ?? item.paymentProvider ?? '—')}
                        <div class="total-box">
                            <div class="total-row">
                                <span class="total-label">TOTAL PAYÉ:</span>
                                <span class="total-value">${escapeHtml(formatAmount(amount, currency))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-text">
                        Ce reçu confirme le paiement de votre location de bus.
                    </div>
                    <div class="footer-text">
                        Pour toute assistance: +225 XX XX XX XX XX | contact@allon.ci
                    </div>
                    <div class="footer-date">
                        Document généré le ${escapeHtml(currentDate)}
                    </div>
                </div>
            </body>
        </html>
    `;
};

/**
 * Échappe les valeurs injectées dans le HTML du reçu.
 */
const escapeHtml = (value: string | number): string => {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Retourne le libellé utilisateur d'une valeur d'énumération.
 */
const getLabel = (map: Record<string, string>, value?: string): string => {
    if (!value) return '—';
    return map[value] ?? value;
};

/**
 * Formate une ville depuis l'objet API ou son détail texte.
 */
const getCityName = (city?: { name?: string }, detail?: string): string => {
    return city?.name ?? detail ?? '—';
};

/**
 * Formate une date si elle est disponible.
 */
const formatDate = (date?: string | null): string => {
    return date ? formatFullDate(date) : '—';
};

/**
 * Formate un numéro de téléphone quelle que soit la forme renvoyée par l'API.
 */
const formatPhone = (phone?: BusRentalReceiptData['phone']): string => {
    if (!phone) return '—';
    if (typeof phone === 'string') return phone;
    if (phone.number) return phone.number;
    return [phone.countryCode, phone.digits].filter(Boolean).join(' ') || '—';
};

/**
 * Formate un montant avec sa devise.
 */
const formatAmount = (amount: BusRentalReceiptData['quotedAmount'], currency: string): string => {
    if (amount == null || amount === '') return '—';
    const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(numericAmount)) return `${amount} ${currency}`;
    return `${numericAmount.toLocaleString('fr-FR')} ${currency}`;
};

/**
 * Génère une ligne libellé / valeur pour le reçu.
 */
const renderRow = (label: string, value: string | number): string => {
    return `
        <div class="detail-row">
            <span class="detail-label">${escapeHtml(label)}:</span>
            <span class="detail-value">${escapeHtml(value || '—')}</span>
        </div>
    `;
};
