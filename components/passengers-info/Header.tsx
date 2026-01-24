import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Trip } from '@/types';

interface HeaderProps {
    onBack: () => void;
    trip: Trip;
    returnTrip?: Trip;
    isRoundTrip: boolean;
    isKeyboardVisible: boolean;
    paddingTop: number;
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    tintColor: string;
    secondaryTextColor: string;
}

/**
 * Header de l'écran avec navigation et badge de route
 */
export const Header = memo<HeaderProps>(({
    onBack,
    trip,
    returnTrip,
    isRoundTrip,
    isKeyboardVisible,
    paddingTop,
    backgroundColor,
    borderColor,
    iconColor,
    tintColor,
    secondaryTextColor
}) => (
    <View style={[
        styles.header,
        isKeyboardVisible && styles.headerReduced,
        { paddingTop, backgroundColor, borderBottomColor: borderColor }
    ]}>
        <Pressable
            onPress={onBack}
            style={styles.backButton}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true, radius: 25 }}
        >
            <Icon name="arrow-left" size={isKeyboardVisible ? 20 : 25} color={iconColor} />
        </Pressable>

        <View style={styles.routeBadge}>
            <Text style={[
                styles.routeBadgeText,
                isKeyboardVisible && styles.routeBadgeTextReduced,
                { color: tintColor }
            ]} numberOfLines={1}>
                {trip.departureCity} <Icon name="chevron-right" size={isKeyboardVisible ? 12 : 15} color={tintColor} /> {trip.arrivalCity}
                {isRoundTrip && returnTrip && (
                    <> <Icon name="chevron-right" size={isKeyboardVisible ? 12 : 15} color={tintColor} /> {returnTrip.arrivalCity}</>
                )}
            </Text>
        </View>

        {!isKeyboardVisible && (
            <Text style={[styles.stepIndicator, { color: secondaryTextColor }]}>
                Étape 2/3
            </Text>
        )}
    </View>
));

Header.displayName = 'Header';

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerReduced: {
        paddingBottom: 8,
    },
    backButton: {
        padding: 8,
    },
    routeBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    routeBadgeText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    routeBadgeTextReduced: {
        fontSize: 13,
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
});
