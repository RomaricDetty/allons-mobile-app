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
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
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
        color: '#000',
    },
});

