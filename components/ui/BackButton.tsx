import React, { memo } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const BACK_ICON_SIZE = 24;
export const BACK_HIT_SIZE = 44;

interface BackButtonProps {
    onPress: () => void;
    color: string;
    /** Réduit légèrement l’icône (ex. clavier ouvert) */
    compact?: boolean;
    style?: StyleProp<ViewStyle>;
    /** Fond optionnel pour overlays carte */
    backgroundColor?: string;
    bordered?: boolean;
    borderColor?: string;
}

/**
 * Bouton retour uniforme (flèche gauche, zone tactile 44×44).
 */
export const BackButton = memo<BackButtonProps>(({
    onPress,
    color,
    compact = false,
    style,
    backgroundColor,
    bordered = false,
    borderColor,
}) => (
    <Pressable
        onPress={onPress}
        style={[
            styles.button,
            backgroundColor ? { backgroundColor } : null,
            bordered ? { borderWidth: 1, borderColor: borderColor ?? 'rgba(0,0,0,0.12)' } : null,
            style,
        ]}
        hitSlop={8}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true, radius: 22 }}
        accessibilityRole="button"
        accessibilityLabel="Retour"
    >
        <Icon
            name="arrow-left"
            size={compact ? 20 : BACK_ICON_SIZE}
            color={color}
        />
    </Pressable>
));

BackButton.displayName = 'BackButton';

const styles = StyleSheet.create({
    button: {
        width: BACK_HIT_SIZE,
        height: BACK_HIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
});
