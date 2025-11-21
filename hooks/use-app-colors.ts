/**
 * Hook personnalisé pour accéder à toutes les couleurs de l'application
 * selon le thème actif (light/dark)
 */
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export function useAppColors() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const tintColor = useThemeColor({}, 'tint');

    /**
     * Calcule la couleur active pour les onglets
     * Si le tint est blanc (dark mode), utilise le bleu par défaut
     */
    const activeTabColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    return {
        // Couleurs de base
        text: useThemeColor({}, 'text'),
        background: useThemeColor({}, 'background'),
        icon: useThemeColor({}, 'icon'),
        tint: tintColor,
        activeTabColor,

        // Couleurs pour les cartes et conteneurs
        cardBackground: theme.cardBackground,
        border: theme.border,
        secondaryText: theme.secondaryText,
        headerBackground: theme.headerBackground,
        headerBorder: theme.headerBorder,
        scrollBackground: theme.scrollBackground,
        inputBackground: theme.inputBackground,
        placeholder: theme.placeholder,
        inactiveIcon: theme.inactiveIcon,
        inactiveTabText: theme.inactiveTabText,
        modalBackground: theme.modalBackground,
        modalBorder: theme.modalBorder,
        emergencyInfoBackground: theme.emergencyInfoBackground,
        profileImagePlaceholderBackground: theme.profileImagePlaceholderBackground,
        tripsIconContainerBackground: theme.tripsIconContainerBackground,
        clientTypeCardBackground: theme.clientTypeCardBackground,
        coinsCardBackground: theme.coinsCardBackground,
        actionButtonBackground: theme.actionButtonBackground,
        progressBarBackground: theme.progressBarBackground,
        progressDotBackground: theme.progressDotBackground,
        separator: theme.separator,
        secondaryButtonBackground: theme.secondaryButtonBackground,
    };
}

