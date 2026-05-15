// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Pilule « Recentrer » en bas à gauche, juste au-dessus de la carte d’infos du trajet.
 */
function RecenterRouteButtonInner({
    visible,
    onPress,
    styles,
    containerStyle,
    themeColors,
    textColor,
}: any) {
    if (!visible) return null;

    return (
        <View style={[styles.recenterButtonContainer, containerStyle]}>
            <TouchableOpacity
                style={[
                    styles.recenterButton,
                    {
                        backgroundColor: themeColors.iconCircleBackground,
                        borderColor: themeColors.border,
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.85}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Recentrer sur l'itinéraire du bus"
            >
                <Ionicons name="navigate" size={18} color={textColor} />
                <Text style={[styles.recenterLabel, { color: textColor }]}>Recentrer</Text>
            </TouchableOpacity>
        </View>
    );
}

export const RecenterRouteButton = memo(RecenterRouteButtonInner);
