import { AppButton } from '@/components/ui/AppButton';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

interface FixedButtonProps {
    onPress: () => void;
    loading: boolean;
    backgroundColor: string;
    borderColor: string;
    paddingBottom: number;
    title?: string;
}

/**
 * Bouton de confirmation fixe en bas de l'écran
 */
export const FixedButton = memo<FixedButtonProps>(({
    onPress,
    loading,
    backgroundColor,
    borderColor,
    paddingBottom,
    title = 'Confirmer et payer',
}) => (
    <View
        style={[
            styles.container,
            { paddingBottom: paddingBottom + 8, backgroundColor, borderTopColor: borderColor },
        ]}
    >
        <AppButton
            title={title}
            onPress={onPress}
            loading={loading}
            style={styles.buttonWidth}
            fullWidth={false}
        />
    </View>
));

FixedButton.displayName = 'FixedButton';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 15,
        borderTopWidth: 1,
    },
    buttonWidth: {
        width: '100%',
        alignSelf: 'center',
    },
});
