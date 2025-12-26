import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Composant de bouton d'onglet avec retour haptique
 * Active le retour haptique sur iOS et Android lors de l'appui sur les onglets
 */
export function HapticTab(props: BottomTabBarButtonProps) {
    return (
        <PlatformPressable
            {...props}
            onPressIn={(ev) => {
                // Ajoute un retour haptique léger lors de l'appui sur les onglets
                if (Platform.OS === 'android') {
                    // Utilise la méthode spécifique Android avec une valeur string
                    Haptics.performAndroidHapticsAsync('context-click' as any);
                } else {
                    // iOS utilise impactAsync
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                props.onPressIn?.(ev);
            }}
        />
    );
}
