/**
 * Mappe les méthodes de paiement vers leurs libellés en français
 */
export const PAYMENT_METHODS: { [key: string]: string } = {
    'MOBILE_MONEY': 'Mobile Money',
    'CARD': 'Carte bancaire',
    'WAVE': 'Wave',
    'MTN': 'MTN Mobile Money',
    'ORANGE': 'Orange Money',
};

/**
 * Formate la méthode de paiement pour l'affichage
 * @param method - La méthode de paiement
 * @returns Le libellé formaté
 */
export const formatPaymentMethod = (method: string): string => {
    if (!method) return 'N/A';
    
    // Nettoyer la méthode (enlever les underscores)
    const cleanedMethod = method.split('_').join(' ');
    
    // Chercher dans le mapping
    return PAYMENT_METHODS[cleanedMethod] || PAYMENT_METHODS[method] || method;
};

