/**
 * Utilitaire de logging pour l'application
 * Permet de contrôler les logs en production
 */

const isDevelopment = __DEV__;

/**
 * Log un message en mode développement uniquement
 */
export const log = (...args: any[]): void => {
    if (isDevelopment) {
        console.log(...args);
    }
};

/**
 * Log une erreur (toujours affiché, même en production)
 */
export const logError = (...args: any[]): void => {
    console.error(...args);
};

/**
 * Log un avertissement en mode développement uniquement
 */
export const logWarn = (...args: any[]): void => {
    if (isDevelopment) {
        console.warn(...args);
    }
};

