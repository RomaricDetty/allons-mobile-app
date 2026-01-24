import { useTheme } from '@/contexts/ThemeContext';
import { useAppColors } from '@/hooks/use-app-colors';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Composant regroupant les cartes de toggle de thème et de partage
 */
export const ThemeAndShareCards: React.FC = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const colors = useAppColors();

    /**
     * Gère le changement de thème avec retour haptique
     */
    const handleThemeToggle = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleTheme();
    }, [toggleTheme]);

    /**
     * Partage l'application avec retour haptique
     */
    const handleShareApp = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'ios') {
            Share.share({
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn.',
                url: 'https://allon-frontoffice-ng.onrender.com/home',
            });
        } else {
            Share.share({
                title: 'Partagez l\'application AllOn.',
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn via le lien suivant: https://allon-frontoffice-ng.onrender.com/home',
            });
        }
    }, []);

    return (
        <>
            {/* Toggle Mode Dark */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.cardContent}>
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: isDarkMode ? 'rgba(255, 167, 38, 0.15)' : 'rgba(255, 193, 7, 0.15)' }
                    ]}>
                        <MaterialCommunityIcons
                            name={isDarkMode ? "weather-night" : "weather-sunny"}
                            size={24}
                            color={isDarkMode ? "#FFA726" : "#FFC107"}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>Mode sombre</Text>
                        <Text style={[styles.description, { color: colors.secondaryText }]}>
                            {isDarkMode ? 'Activé' : 'Désactivé'}
                        </Text>
                    </View>
                </View>
                <Switch
                    value={isDarkMode}
                    onValueChange={handleThemeToggle}
                    trackColor={{ false: '#E0E0E0', true: '#1776BA' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                />
            </View>

            {/* Partage de l'application */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Pressable onPress={handleShareApp} style={styles.cardContent}>
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: colors.tripsIconContainerBackground }
                    ]}>
                        <MaterialCommunityIcons
                            name="share-outline"
                            size={24}
                            color={colors.activeTabColor}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>Partager l'application</Text>
                        <Text style={[styles.description, { color: colors.secondaryText }]}>
                            Partagez l'application avec vos amis et vos proches.
                        </Text>
                    </View>
                </Pressable>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
});
