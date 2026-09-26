import React, { memo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SectionCardHeaderProps = {
    title: string;
    textColor: string;
    icon: ReactNode;
};

/**
 * En-tête de bloc uniforme (icône 40×40 + titre 17 Bold).
 */
export const SectionCardHeader = memo<SectionCardHeaderProps>(({ title, textColor, icon }) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBlock}>{icon}</View>
        <Text style={[styles.sectionTitle, { color: textColor }]} numberOfLines={2}>
            {title}
        </Text>
    </View>
));

SectionCardHeader.displayName = 'SectionCardHeader';

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },
    sectionIconBlock: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
    },
});
