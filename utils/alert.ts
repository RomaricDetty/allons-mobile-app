import { Alert, AlertButton, AlertOptions, Platform } from 'react-native';

/**
 * Alerte native : UIAlertController (iOS) / AlertDialog (Android).
 * Point d'entrée unique pour uniformiser les messages de l'app.
 */
export function showAlert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
): void {
    Alert.alert(
        title,
        message,
        buttons?.length ? buttons : [{ text: 'OK' }],
        {
            cancelable: Platform.OS === 'android',
            ...options,
        },
    );
}

/**
 * Confirmation native avec Annuler / action.
 */
export function showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        onCancel?: () => void;
    },
): void {
    showAlert(title, message, [
        {
            text: options?.cancelText ?? 'Annuler',
            style: 'cancel',
            onPress: options?.onCancel,
        },
        {
            text: options?.confirmText ?? 'OK',
            style: options?.destructive ? 'destructive' : 'default',
            onPress: onConfirm,
        },
    ]);
}

/**
 * Affiche une ou plusieurs erreurs de validation en alerte native.
 */
export function showErrors(title: string, errors: string[]): void {
    if (!errors.length) return;
    const message =
        errors.length === 1
            ? errors[0]
            : errors.map((error) => `• ${error}`).join('\n');
    showAlert(title, message);
}
