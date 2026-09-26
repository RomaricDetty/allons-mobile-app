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

/** Courtes descriptions pour la légende des statuts (filtre réservations). */
export const STATUS_LEGEND: Array<{ label: string; description: string }> = [
    { label: 'Payé', description: 'Paiement reçu, billet valide.' },
    { label: 'Confirmé', description: 'Réservation confirmée par la compagnie.' },
    { label: 'En attente', description: 'Paiement non finalisé.' },
    { label: 'En traitement', description: 'Paiement en cours de confirmation.' },
    { label: 'Terminé', description: 'Trajet effectué.' },
    { label: 'Utilisé', description: 'Billet déjà utilisé à l’embarquement.' },
    { label: 'Annulé', description: 'Réservation annulée.' },
    { label: 'Remboursé', description: 'Montant remboursé.' },
    { label: 'Expiré', description: 'Délai de paiement dépassé.' },
    { label: 'Échoué', description: 'Paiement refusé ou échoué.' },
];

/**
 * Map de civilité pour le formatage
 */
export const CIVILITY_MAP: { [key: string]: string } = {
    'MR': 'Monsieur',
    'MRS': 'Madame',
    'MISS': 'Mademoiselle',
};
