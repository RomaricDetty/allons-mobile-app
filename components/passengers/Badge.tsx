import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BadgeProps {
    text: string;
    color?: string;
}

/**
 * Composant pour un badge
 */
export const Badge = ({ text, color = '#1776BA' }: BadgeProps) => {
    return (
        <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});

