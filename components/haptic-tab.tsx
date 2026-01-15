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
                // Ajoute un retour haptique avec intensité moyenne lors de l'appui sur les onglets
                if (Platform.OS === 'android') {
                    // Utilise impactAsync avec style Medium pour une intensité plus forte
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                    // iOS utilise impactAsync avec style Medium pour une intensité plus forte
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                props.onPressIn?.(ev);
            }}
        />
    );
}
