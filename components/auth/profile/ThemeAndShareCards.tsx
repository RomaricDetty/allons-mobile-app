import { useTheme } from '@/contexts/ThemeContext';
import { useAppColors } from '@/hooks/use-app-colors';
import { showAlert } from '@/utils/alert';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import React, { useCallback } from 'react';
import {
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Cartes profil : thème, partage, notation
 */
export const ThemeAndShareCards: React.FC = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const colors = useAppColors();

    const handleThemeToggle = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleTheme();
    }, [toggleTheme]);

    const handleShareApp = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'ios') {
            Share.share({
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn.',
                url: 'https://customer.allon-apps.com/apps',
            });
        } else {
            Share.share({
                title: 'Partagez l\'application AllOn.',
                message: 'Partagez l\'application avec vos amis et vos proches pour profiter des avantages de l\'application AllOn via le lien suivant: https://customer.allon-apps.com/apps',
            });
        }
    }, []);

    const handleRateApp = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const available = await StoreReview.isAvailableAsync();
            if (available) {
                await StoreReview.requestReview();
                return;
            }
            showAlert(
                'Notation',
                'La notation n’est pas disponible sur cet appareil. Merci de nous laisser un avis sur le store dès que possible.'
            );
        } catch {
            showAlert('Erreur', 'Impossible d’ouvrir la notation pour le moment.');
        }
    }, []);

    return (
        <>
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name={isDarkMode ? 'weather-night' : 'white-balance-sunny'}
                            size={22}
                            color={colors.activeTabColor}
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

            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Pressable onPress={handleShareApp} style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name="share-variant"
                            size={22}
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

            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Pressable onPress={handleRateApp} style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name="star-outline"
                            size={22}
                            color={colors.activeTabColor}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>Noter l'application</Text>
                        <Text style={[styles.description, { color: colors.secondaryText }]}>
                            Votre avis nous aide à améliorer AllOn.
                        </Text>
                    </View>
                </Pressable>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
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
        width: 40,
        height: 40,
        borderRadius: 10,
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
