// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

/**
 * Durée estimée du trajet en minutes à partir des horaires HH:MM (passage minuit si besoin).
 */
function getEstimatedTripDurationMinutes(
    departureTime?: string,
    arrivalTime?: string,
): number | null {
    if (!departureTime?.trim() || !arrivalTime?.trim()) return null;

    const [dh, dm] = departureTime.trim().split(":").map(Number);
    const [ah, am] = arrivalTime.trim().split(":").map(Number);
    if (![dh, dm, ah, am].every((x) => Number.isFinite(x))) return null;

    const depMinutes = dh * 60 + dm;
    const arrMinutes = ah * 60 + am;
    let diff = arrMinutes - depMinutes;
    if (diff < 0) diff += 24 * 60;

    return diff > 0 ? diff : null;
}

/**
 * Formate une durée en minutes pour l'affichage en heures (valeur + unité).
 */
function formatEstimatedDurationHours(totalMinutes: number): { value: string; unit: string } {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return { value: String(hours), unit: `h ${minutes}` };
    }
    if (hours > 0) {
        return { value: String(hours), unit: "h" };
    }

    const decimalHours = Math.round((totalMinutes / 60) * 10) / 10;
    return {
        value: String(decimalHours).replace(".", ","),
        unit: "h",
    };
}

/**
 * Panneau flottant type maquette : timeline départ/arrivée, temps estimé, distance et horaires.
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

    const estimatedDurationMin = getEstimatedTripDurationMinutes(
        booking.departureTime,
        booking.arrivalTime,
    );
    const estimatedDuration =
        estimatedDurationMin != null
            ? formatEstimatedDurationHours(estimatedDurationMin)
            : null;
    const timeLeftMain = estimatedDuration?.value ?? "—";
    const timeLeftUnit = estimatedDuration?.unit ?? "";

    return (
        <Animated.View style={infoPanelStyle}>
            <TouchableOpacity
                style={styles.panelHandleContainer}
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
                        <View style={styles.designTimeColumn}>
                            <Text style={[styles.designTimeLabel, { color: secondaryTextColor }]}>
                                Temps estimé
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, }}>
                                <Text style={[styles.designTimeValue, { color: textColor }]}>
                                    {timeLeftMain}
                                </Text>
                                {timeLeftUnit ? (
                                    <Text style={[styles.designTimeValue, { color: textColor }]}>
                                        {timeLeftUnit}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
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
