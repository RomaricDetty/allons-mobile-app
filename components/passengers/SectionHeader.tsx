import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
    number: number;
    title: string;
}

/**
 * Composant pour une section avec numéro
 */
export const SectionHeader = ({ number, title }: SectionHeaderProps) => {
    // Couleur dynamique basée sur le thème
    const textColor = useThemeColor({}, 'text');

    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'Ubuntu_Bold',
    },
});

