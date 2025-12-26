//@ts-nocheck
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SocialButtonProps {
    provider: 'google' | 'facebook';
    onPress: () => void;
}

/**
 * Composant pour les boutons de connexion sociale (Google, Facebook)
 */
export const SocialButton = ({ provider, onPress }: SocialButtonProps) => {
    const iconName = provider === 'google' ? 'google' : 'facebook';
    const label = provider === 'google' ? 'Google' : 'Facebook';

    return (
        <Pressable style={styles.button} onPress={onPress}>
            <View style={styles.content}>
                <MaterialCommunityIcons name={iconName} size={20} color="#000" />
                <Text style={styles.text}>{label}</Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
});



