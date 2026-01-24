import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ProgressBarProps {
    textColor: string;
    secondaryTextColor: string;
    backgroundColor: string;
    barBackgroundColor: string;
    tintColor: string;
}

/**
 * Barre de progression avec indicateurs visuels
 */
export const ProgressBar = memo<ProgressBarProps>(({
    textColor,
    secondaryTextColor,
    backgroundColor,
    barBackgroundColor,
    tintColor
}) => (
    <>
        <View style={[styles.progressContainer, { backgroundColor }]}>
            <Text style={[styles.progressTitle, { color: textColor }]}>
                Vérifier et payer
            </Text>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { backgroundColor: barBackgroundColor }]}>
                    <View style={[styles.progressFill, { width: '67%', backgroundColor: tintColor }]} />
                </View>
                <Text style={[styles.progressText, { color: secondaryTextColor }]}>
                    67%
                </Text>
            </View>
        </View>

        <View style={[styles.progressIndicators, { backgroundColor }]}>
            <View style={[styles.progressDot, styles.progressDotCompleted]}>
                <Icon name="check" size={12} color="#FFFFFF" />
            </View>
            <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
            <View style={[styles.progressDot, { backgroundColor: barBackgroundColor }]} />
        </View>
    </>
));

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 12,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 12,
    },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotCompleted: {
        backgroundColor: '#4CAF50',
    },
});
