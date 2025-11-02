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