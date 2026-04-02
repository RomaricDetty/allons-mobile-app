// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

/**
 * Rendu des boutons flottants de contrôle de la carte.
 */
export function ControlButtons({
    styles,
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
        <View style={styles.controlButtonsContainer}>
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
            >
                <Ionicons name="person" size={20} color={textColor} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.controlButton,
                    { backgroundColor: themeColors.iconCircleBackground },
                ]}
                onPress={centerMapOnRoute}
            >
                <Ionicons name="expand-outline" size={20} color={textColor} />
            </TouchableOpacity>
        </View>
    );
}
