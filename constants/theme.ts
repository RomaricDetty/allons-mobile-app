/**
 * Couleurs utilisées dans l'application (light / dark).
 * Marque : #1776BA — pas de pastels Material ni de violet hors-marque.
 */

import { Platform } from 'react-native';

const tintColorLight = '#1776BA';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#11181C',
        background: '#fff',
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
        cardBackground: '#FFFFFF',
        border: '#E0E0E0',
        secondaryText: '#666',
        headerBackground: '#FFFFFF',
        headerBorder: '#E0E0E0',
        scrollBackground: '#F3F3F7',
        inputBackground: '#F3F3F7',
        placeholder: '#A6A6AA',
        inactiveIcon: '#9E9E9E',
        inactiveTabText: '#9E9E9E',
        modalBackground: '#FFFFFF',
        modalBorder: '#F0F0F0',
        emergencyInfoBackground: '#F5F5F5',
        profileImagePlaceholderBackground: '#E0E0E0',
        tripsIconContainerBackground: 'rgba(23, 118, 186, 0.08)',
        clientTypeCardBackground: '#F3F3F7',
        coinsCardBackground: '#F3F3F7',
        actionButtonBackground: '#FFFFFF',
        progressBarBackground: '#E0E0E0',
        progressDotBackground: '#E0E0E0',
        separator: '#E0E0E0',
        secondaryButtonBackground: '#FFFFFF',
        success: '#2D7A4F',
        successMuted: 'rgba(45, 122, 79, 0.1)',
        danger: '#C44747',
        dangerMuted: 'rgba(196, 71, 71, 0.1)',
        infoMuted: 'rgba(23, 118, 186, 0.08)',
    },
    dark: {
        text: '#ECEDEE',
        background: '#151718',
        tint: tintColorDark,
        icon: '#9BA1A6',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
        cardBackground: '#1C1C1E',
        border: '#3A3A3C',
        secondaryText: '#9BA1A6',
        headerBackground: '#1C1C1E',
        headerBorder: '#3A3A3C',
        scrollBackground: '#000000',
        inputBackground: '#2C2C2E',
        placeholder: '#9BA1A6',
        inactiveIcon: '#9BA1A6',
        inactiveTabText: '#9BA1A6',
        modalBackground: '#1C1C1E',
        modalBorder: '#3A3A3C',
        emergencyInfoBackground: '#2C2C2E',
        profileImagePlaceholderBackground: '#3A3A3C',
        tripsIconContainerBackground: '#2C2C2E',
        clientTypeCardBackground: '#2C2C2E',
        coinsCardBackground: '#2C2C2E',
        actionButtonBackground: '#1C1C1E',
        progressBarBackground: '#3A3A3C',
        progressDotBackground: '#3A3A3C',
        separator: '#3A3A3C',
        secondaryButtonBackground: '#1C1C1E',
        success: '#5CAD7A',
        successMuted: 'rgba(45, 122, 79, 0.2)',
        danger: '#E07070',
        dangerMuted: 'rgba(196, 71, 71, 0.2)',
        infoMuted: 'rgba(23, 118, 186, 0.2)',
    },
};

export const Fonts = Platform.select({
    ios: {
        /** iOS `UIFontDescriptorSystemDesignDefault` */
        sans: 'system-ui',
        /** iOS `UIFontDescriptorSystemDesignSerif` */
        serif: 'ui-serif',
        /** iOS `UIFontDescriptorSystemDesignRounded` */
        rounded: 'ui-rounded',
        /** iOS `UIFontDescriptorSystemDesignMonospaced` */
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
});
