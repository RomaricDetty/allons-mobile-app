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
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const months = [
        'janvier', 'février', 'mars', 'avril', 
        'mai', 'juin', 'juillet', 'août', 'septembre', 
        'octobre', 'novembre', 'décembre'
    ];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} ${month} ${year}`;
};