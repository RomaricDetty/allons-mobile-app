// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

/**
 * Panneau flottant type maquette : timeline départ/arrivée, temps restant, distance et horaires.
 */
function InfoPanelInner({
    infoPanelStyle,
    styles,
    togglePanelCollapse,
    panelHandlePanHandlers,
    themeColors,
    scrollViewContentStyle,
    textColor,
    secondaryTextColor,
    booking,
    isManualMode,
    isPanelCollapsed,
    centerOnMe,
    centerOnStartPoint,
    centerOnEndPoint,
    currentAddress,
    colors,
    /** Ville de la gare de départ (sous-titre sous le nom de la gare). */
    startDetailLine,
    /** Ville de la gare d'arrivée. */
    endDetailLine,
    /** Minutes restantes avant l'arrivée prévue (null si inconnu). */
    minutesUntilArrival,
    /** Distance totale du trajet en km (affichage). */
    routeDistanceKm,
}: any) {
    const startTitle =
        booking.trip?.stationFrom?.name || booking.trip?.stationFrom?.city || "Départ";
    const endTitle =
        booking.trip?.stationTo?.name || booking.trip?.stationTo?.city || "Arrivée";

    const distanceLabel =
        routeDistanceKm != null && routeDistanceKm > 0
            ? `${Number(routeDistanceKm).toFixed(0)} km`
            : "—";

    return (
        <Animated.View style={infoPanelStyle}>
            <TouchableOpacity
                style={styles.panelHandleContainer}
                onPress={togglePanelCollapse}
                activeOpacity={0.7}
                {...panelHandlePanHandlers}
            >
                <View
                    style={[
                        styles.panelHandle,
                        {
                            backgroundColor: themeColors.border,
                            borderColor: themeColors.border,
                        },
                    ]}
                />
            </TouchableOpacity>

            <View style={scrollViewContentStyle}>
                <View
                    style={[
                        styles.designCard,
                        {
                            backgroundColor: themeColors.cardBackground,
                            borderColor: themeColors.border,
                        },
                    ]}
                >
                    <View style={styles.designCardRow}>
                        {/* Timeline gauche */}
                        <View style={[styles.designTimeline, { paddingVertical: 10 }]}>
                            <TouchableOpacity
                                style={styles.designTimelineBlock}
                                onPress={centerOnStartPoint}
                                activeOpacity={0.75}
                            >
                                <View style={styles.designRingGreen}>
                                    <View style={styles.designRingGreenInner} />
                                </View>
                                <View style={styles.designTimelineText}>
                                    <Text
                                        style={[styles.designPlaceTitle, { color: textColor }]}
                                        numberOfLines={2}
                                    >
                                        {startTitle}
                                    </Text>
                                    <Text
                                        style={[styles.designPlaceSub, { color: secondaryTextColor }]}
                                        numberOfLines={2}
                                    >
                                        {startDetailLine}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.designTimelineConnector} />

                            <TouchableOpacity
                                style={styles.designTimelineBlock}
                                onPress={centerOnEndPoint}
                                activeOpacity={0.75}
                            >
                                <View style={styles.designRingBlue}>
                                    <View style={styles.designRingBlueInner} />
                                </View>
                                <View style={styles.designTimelineText}>
                                    <Text
                                        style={[styles.designPlaceTitle, { color: textColor }]}
                                        numberOfLines={2}
                                    >
                                        {endTitle}
                                    </Text>
                                    <Text
                                        style={[styles.designPlaceSub, { color: secondaryTextColor }]}
                                        numberOfLines={2}
                                    >
                                        {endDetailLine}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Temps restant droite */}
                        {/* <View style={styles.designTimeColumn}>
                            <Text style={[styles.designTimeLabel, { color: secondaryTextColor }]}>
                                Temps restant
                            </Text>
                            <Text style={[styles.designTimeValue, { color: textColor }]}>
                                {timeLeftMain}
                            </Text>
                            <Text style={[styles.designTimeUnit, { color: textColor }]}>min</Text>
                        </View> */}
                    </View>

                    <View style={[styles.designFooter, { borderTopColor: themeColors.border }]}>
                        <View>
                            <Text style={[styles.designFooterLabel, { color: secondaryTextColor }]}>
                                Distance
                            </Text>
                            <Text style={[styles.designFooterValue, { color: textColor }]}>
                                {distanceLabel}
                            </Text>
                        </View>
                        <View style={styles.designFooterSchedule}>
                            <Ionicons name="bus" size={18} color={colors.START_MARKER} />
                            <Text style={[styles.designFooterTime, { color: textColor }]}>
                                {booking.departureTime || "—"}
                            </Text>
                            <View style={styles.designFooterDots}>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <View
                                        key={i}
                                        style={[styles.designFooterDot, { backgroundColor: secondaryTextColor }]}
                                    />
                                ))}
                            </View>
                            <Ionicons name="bus" size={18} color={colors.ROUTE_BLUE} />
                            <Text style={[styles.designFooterTime, { color: textColor }]}>
                                {booking.arrivalTime || "—"}
                            </Text>
                        </View>
                    </View>
                </View>

                {isManualMode && !isPanelCollapsed && (
                    <View
                        style={[
                            styles.modeIndicator,
                            {
                                backgroundColor: colors.ACCENT_LIGHT,
                                borderColor: colors.ACCENT,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.modeIndicatorIconContainer,
                                { backgroundColor: colors.ACCENT },
                            ]}
                        >
                            <Ionicons name="hand-left-outline" size={16} color={colors.WHITE} />
                        </View>
                        <View style={styles.modeIndicatorTextContainer}>
                            <Text style={[styles.modeIndicatorTitle, { color: colors.ACCENT }]}>
                                Mode sélection manuelle
                            </Text>
                            <Text style={[styles.modeIndicatorText, { color: colors.ACCENT }]}>
                                Appuyez sur la carte pour choisir votre position
                            </Text>
                        </View>
                    </View>
                )}

                {!isPanelCollapsed && (
                    <TouchableOpacity
                        style={[
                            styles.designSecondaryRow,
                            { backgroundColor: themeColors.listItemBackground, borderColor: themeColors.border },
                        ]}
                        onPress={centerOnMe}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="navigate" size={18} color={colors.ACCENT} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.designSecondaryTitle, { color: textColor }]}>
                                Ma position
                            </Text>
                            <Text
                                style={[styles.designSecondarySub, { color: secondaryTextColor }]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {currentAddress}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={secondaryTextColor} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

export const InfoPanel = memo(InfoPanelInner);
