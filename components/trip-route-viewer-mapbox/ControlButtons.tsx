// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Boutons flottants ronds : bus, ma position, vue globale de l’itinéraire.
 */
function ControlButtonsInner({
    styles,
    containerStyle,
    themeColors,
    textColor,
    busPosition,
    centerOnBus,
    centerOnMe,
    centerMapOnRoute,
}: any) {
    return (
        <View style={[styles.controlButtonsContainer, containerStyle]}>
            {busPosition && (
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        { backgroundColor: themeColors.iconCircleBackground },
                    ]}
                    onPress={centerOnBus}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Centrer sur le bus"
                >
                    <Ionicons name="locate" size={20} color={textColor} />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: themeColors.iconCircleBackground },
                ]}
                onPress={centerOnMe}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Centrer sur ma position"
            >
                <Ionicons name="person" size={20} color={textColor} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: themeColors.iconCircleBackground },
                ]}
                onPress={centerMapOnRoute}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Voir tout l'itinéraire"
            >
                <Ionicons name="expand-outline" size={20} color={textColor} />
            </TouchableOpacity>
        </View>
    );
}

export const ControlButtons = memo(ControlButtonsInner);
