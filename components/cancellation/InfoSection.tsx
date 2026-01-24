import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppColors } from '@/hooks/use-app-colors';

interface InfoRow {
    label: string;
    value: string;
    highlight?: boolean;
}

interface InfoSectionProps {
    title: string;
    rows: InfoRow[];
}

/**
 * Section d'affichage d'informations (remboursement, détails, etc.)
 */
export const InfoSection: React.FC<InfoSectionProps> = ({ title, rows }) => {
    const colors = useAppColors();

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

            {rows.map((row, index) => (
                <View key={index} style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>{row.label}</Text>
                    <Text
                        style={[
                            row.highlight ? styles.valueHighlight : styles.value,
                            {
                                color: row.highlight ? colors.activeTabColor : colors.text,
                            },
                        ]}
                    >
                        {row.value}
                    </Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        flexWrap: 'wrap',
        width: '50%',
    },
    value: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        flexWrap: 'wrap',
        width: '50%',
        textAlign: 'right',
    },
    valueHighlight: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        flexWrap: 'wrap',
        width: '50%',
        textAlign: 'right',
    },
});
