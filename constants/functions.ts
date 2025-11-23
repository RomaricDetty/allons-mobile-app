/**
* Formate la durée en minutes en format lisible (ex: 180 -> "3H")
*/
export const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return mins > 0 ? `${hours}H${mins}` : `${hours}H`;
};

/**
 * Formate le prix en francs CFA
 */
export const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} F CFA`;
};

/**
* Capitalise la première lettre du type de bus
*/
export const capitalizeBusType = (busType: string) => {
   return busType.charAt(0).toUpperCase() + busType.slice(1);
};

/**
 * Formate la date en français complet
 */
export const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 
        'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 
        'Octobre', 'Novembre', 'Décembre'
    ];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} ${month} ${year}`;
};

/**
 * Formate la date en français complet avec l'heure
 */
export const formatFullDateWithTime = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 
        'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 
        'Octobre', 'Novembre', 'Décembre'
    ];
    const dayName = days[date.getDay()];
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const day = date.getDate();
    const month = months[date.getMonth()];
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${capitalizedDayName} ${day} ${capitalizedMonth} ${year} à ${hours}:${minutes}`;
};

/**
     * Formate la date pour l'affichage
     */
export const formatBookingDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Formate le statut pour l'affichage
 */
export const formatStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
        'PAID': 'Payé',
        'PENDING': 'En attente',
        'CANCELLED': 'Annulé',
        'REFUNDED': 'Remboursé',
    };
    return statusMap[status] || status;
};

/**
 * Retourne la couleur du badge de statut
 */
export const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
        'PAID': '#4CAF50',
        'PENDING': '#FFA726',
        'CANCELLED': '#F44336',
        'REFUNDED': '#2196F3',
    };
    return colorMap[status] || '#9E9E9E';
};

/**
     * Valide le format de l'email
     */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Valide le format du numéro de téléphone (format français)
 */
export const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^0[1-9][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};