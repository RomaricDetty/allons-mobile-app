// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";

/**
 * Rendu du panneau bas (résumé trajet + informations détaillées).
 */
export function InfoPanel({
    infoPanelStyle,
    styles,
    togglePanelCollapse,
    panelHandlePanHandlers,
    themeColors,
    scrollViewContentStyle,
    textColor,
    secondaryTextColor,
    startCityCode,
    endCityCode,
    booking,
    formattedDuration,
    isManualMode,
    isPanelCollapsed,
    centerOnMe,
    centerOnStartPoint,
    centerOnEndPoint,
    currentAddress,
    colors,
}: any) {
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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={scrollViewContentStyle}
                showsVerticalScrollIndicator={!isPanelCollapsed}
            >
                <View style={[styles.panelHeader, { backgroundColor: themeColors.cardBackground }]}>
                    <View
                        style={[
                            styles.headerContent,
                            styles.headerContentBorder,
                            {
                                borderColor: themeColors.border,
                                backgroundColor: themeColors.cardBackground,
                            },
                        ]}
                    >
                        <View style={styles.headerColumn}>
                            <View style={[styles.cityCodeBadge, { backgroundColor: themeColors.badgeBackground }]}>
                                <Text style={[styles.headerCityCode, { color: textColor }]}>{startCityCode}</Text>
                            </View>
                            <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                {booking.trip?.stationFrom?.city || ""}
                            </Text>
                            <View style={styles.timezoneContainer}>
                                <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                    {booking.trip?.stationFrom?.name || ""}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerCenterSection}>
                            <View style={[styles.headerIconContainer, { backgroundColor: colors.ACCENT }]}>
                                <Ionicons name="bus-outline" size={20} color={colors.WHITE} />
                            </View>
                            <View style={[styles.headerConnectorLine, { backgroundColor: themeColors.border }]} />
                        </View>

                        <View style={styles.headerColumn}>
                            <View style={[styles.cityCodeBadge, { backgroundColor: themeColors.badgeBackground }]}>
                                <Text style={[styles.headerCityCode, { color: textColor }]}>{endCityCode}</Text>
                            </View>
                            <Text style={[styles.headerCityName, { color: textColor }]} numberOfLines={1}>
                                {booking.trip?.stationTo?.city || ""}
                            </Text>
                            <View style={styles.timezoneContainer}>
                                <Text style={[styles.headerTimezone, { color: secondaryTextColor }]}>
                                    {booking.trip?.stationTo?.name || ""}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {formattedDuration && booking.arrivalTime && (
                        <View
                            style={[
                                styles.durationBadge,
                                {
                                    backgroundColor: colors.ACCENT,
                                    borderColor: colors.ACCENT,
                                },
                            ]}
                        >
                            <Ionicons name="time" size={18} color={colors.WHITE} />
                            <Text style={[styles.headerDuration, { color: colors.WHITE }]}>
                                Durée estimée du trajet : {formattedDuration}
                            </Text>
                        </View>
                    )}
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
                    <View style={styles.stepsContainer}>
                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity onPress={centerOnMe} activeOpacity={0.7}>
                                    <View
                                        style={[
                                            styles.stepIconContainer,
                                            { backgroundColor: colors.ACCENT },
                                        ]}
                                    >
                                        <Ionicons name="locate" size={16} color={colors.WHITE} />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground },
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnMe}
                            >
                                <View style={{ width: "90%" }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={2}>
                                            Position actuelle
                                        </Text>
                                    </View>
                                    <Text
                                        style={[styles.stepSubText, { color: secondaryTextColor }]}
                                        numberOfLines={2}
                                    >
                                        {currentAddress}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity onPress={centerOnStartPoint} activeOpacity={0.7}>
                                    <View
                                        style={[
                                            styles.stepIconContainer,
                                            { backgroundColor: colors.START_MARKER },
                                        ]}
                                    >
                                        <Ionicons name="bus-outline" size={16} color={colors.WHITE} />
                                    </View>
                                </TouchableOpacity>
                                <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground },
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnStartPoint}
                            >
                                <View style={{ width: "90%" }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                            Ville de départ
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="location" size={12} color={secondaryTextColor} />
                                        <Text
                                            style={[styles.stepSubText, { color: secondaryTextColor }]}
                                            numberOfLines={1}
                                        >
                                            {booking.trip.stationFrom.city}
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                            Départ prévu à {booking.departureTime}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.stepItem}>
                            <View style={styles.stepLeft}>
                                <TouchableOpacity onPress={centerOnEndPoint} activeOpacity={0.7}>
                                    <View
                                        style={[
                                            styles.stepIconContainer,
                                            { backgroundColor: colors.END_MARKER },
                                        ]}
                                    >
                                        <Ionicons name="stop-outline" size={16} color={colors.WHITE} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.stepCard,
                                    styles.stepCardRow,
                                    { backgroundColor: themeColors.listItemBackground },
                                ]}
                                activeOpacity={0.7}
                                onPress={centerOnEndPoint}
                            >
                                <View style={{ width: "90%" }}>
                                    <View style={styles.stepCardHeader}>
                                        <Text style={[styles.stepMainText, { color: textColor }]} numberOfLines={1}>
                                            Ville d'arrivée
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="location" size={12} color={secondaryTextColor} />
                                        <Text
                                            style={[styles.stepSubText, { color: secondaryTextColor }]}
                                            numberOfLines={1}
                                        >
                                            {booking.trip.stationTo.city}
                                        </Text>
                                    </View>
                                    <View style={styles.stepCardDetails}>
                                        <Ionicons name="time-outline" size={12} color={secondaryTextColor} />
                                        <Text style={[styles.stepSubText, { color: secondaryTextColor }]}>
                                            Arrivée prévue à {booking.arrivalTime}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );
}
