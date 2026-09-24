import React, { memo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
    title: string;
    onBack: () => void;
    iconColor: string;
    textColor: string;
    backgroundColor: string;
    borderColor: string;
    paddingTop: number;
    right?: ReactNode;
}

/**
 * Header d’écran standard : retour + titre centré + spacer (ou action droite).
 */
export const ScreenHeader = memo<ScreenHeaderProps>(({
    title,
    onBack,
    iconColor,
    textColor,
    backgroundColor,
    borderColor,
    paddingTop,
    right,
}) => (
    <View
        style={[
            styles.header,
            {
                paddingTop,
                backgroundColor,
                borderBottomColor: borderColor,
            },
        ]}
    >
        <BackButton onPress={onBack} color={iconColor} />
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
        </Text>
        <View style={styles.rightSlot}>
            {right ?? <View style={styles.spacer} />}
        </View>
    </View>
));

ScreenHeader.displayName = 'ScreenHeader';

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 10,
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    rightSlot: {
        minWidth: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    spacer: {
        width: 44,
        height: 44,
    },
});
