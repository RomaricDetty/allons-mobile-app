// @ts-nocheck
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface WarningBoxProps {
    selectedCount: number;
    totalCount: number;
}

/**
 * Composant d'avertissement pour l'annulation
 */
export const WarningBox: React.FC<WarningBoxProps> = ({ selectedCount, totalCount }) => {
    const message = selectedCount === totalCount
        ? 'Votre réservation sera définitivement annulée.'
        : `${selectedCount} passager(s) sera/seront annulé(s) définitivement.`;

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name="alert" size={24} color="#F57C00" />
            <View style={styles.content}>
                <Text style={styles.title}>Cette action est irréversible</Text>
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        // borderWidth: 1,
        backgroundColor: '#FFF9E6',
        // borderColor: '#F57C00',
        marginBottom: 20,
        gap: 12,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#F57C00',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#795548',
    },
});
