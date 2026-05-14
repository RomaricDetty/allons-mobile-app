// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Boutons flottants (centrer bus / moi / itinéraire) avec zone tactile élargie.
 */
function ControlButtonsInner({
    styles,
    containerStyle,
    themeColors,
    isManualMode,
    toggleLocationMode,
    textColor,
    busPosition,
    isFollowingBus,
    toggleFollowBus,
    centerOnBus,
    centerOnMe,
    centerMapOnRoute,
    colors,
}: any) {
    return (
        <View style={[styles.controlButtonsContainer, containerStyle]}>
            {/* <TouchableOpacity
                style={[
                    styles.controlButton,
                    {
                        backgroundColor: isManualMode
                            ? colors.ACCENT
                            : themeColors.iconCircleBackground,
                    },
                ]}
                onPress={toggleLocationMode}
            >
                <Ionicons
                    name={isManualMode ? "location" : "location-outline"}
                    size={20}
                    color={isManualMode ? colors.WHITE : textColor}
                />
            </TouchableOpacity> */}

            {/* {busPosition && (
                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        {
                            backgroundColor: isFollowingBus
                                ? colors.ACCENT
                                : themeColors.iconCircleBackground,
                        },
                    ]}
                    onPress={toggleFollowBus}
                >
                    <Ionicons
                        name={isFollowingBus ? "eye" : "eye-outline"}
                        size={20}
                        color={isFollowingBus ? colors.WHITE : textColor}
                    />
                </TouchableOpacity>
            )} */}

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
