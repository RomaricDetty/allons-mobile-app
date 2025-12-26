/**
 * Hook pour obtenir le schéma de couleurs actuel (version web)
 * Utilise le contexte de thème au lieu du système
 */
import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' | null {
    const { colorScheme } = useTheme();
    return colorScheme;
}
