import React, { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

interface FixedButtonProps {
    onPress: () => void;
    loading: boolean;
    backgroundColor: string;
    borderColor: string;
    paddingBottom: number;
}

/**
 * Bouton de confirmation fixe en bas de l'écran
 */
export const FixedButton = memo<FixedButtonProps>(({
    onPress,
    loading,
    backgroundColor,
    borderColor,
    paddingBottom
}) => (
    <View style={[
        styles.container,
        { paddingBottom: paddingBottom + 8, backgroundColor, borderTopColor: borderColor }
    ]}>
        <Pressable
            style={[styles.button, styles.buttonWidth]}
            onPress={onPress}
            disabled={loading}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
                <Text style={styles.buttonText}>Confirmer et payer</Text>
            )}
        </Pressable>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    buttonWidth: {
        width: '60%',
        alignSelf: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});
