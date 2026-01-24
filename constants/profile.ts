/**
 * Constantes pour l'écran de profil
 */

/**
 * Options de statut pour le filtre des réservations
 */
export const STATUS_OPTIONS = [
    { value: '', label: 'Tous les statuts' },
    { value: 'PAID', label: 'Payé' },
    { value: 'CONFIRMED', label: 'Confirmé' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'PROCESSING', label: 'En traitement' },
    { value: 'COMPLETED', label: 'Terminé' },
    { value: 'USED', label: 'Utilisé' },
    { value: 'CANCELLED', label: 'Annulé' },
    { value: 'REFUNDED', label: 'Remboursé' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'FAILED', label: 'Échoué' },
] as const;

/**
 * Map de civilité pour le formatage
 */
export const CIVILITY_MAP: { [key: string]: string } = {
    'MR': 'Monsieur',
    'MRS': 'Madame',
    'MISS': 'Mademoiselle',
};
