/**
 * Contexte de thème pour gérer manuellement le mode dark/light
 * Permet de persister la préférence utilisateur dans AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
    colorScheme: ColorScheme;
    setColorScheme: (scheme: ColorScheme) => void;
    toggleTheme: () => void;
    isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_preference';

interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * Provider du contexte de thème
 * Charge la préférence depuis AsyncStorage au démarrage
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

    /**
     * Charge la préférence de thème depuis AsyncStorage au démarrage
     */
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setColorSchemeState(savedTheme);
                } else {
                    // Par défaut, mode light
                    setColorSchemeState('light');
                    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la préférence de thème:', error);
                setColorSchemeState('light');
            }
        };

        loadThemePreference();
    }, []);

    /**
     * Met à jour le thème et le sauvegarde dans AsyncStorage
     */
    const setColorScheme = async (scheme: ColorScheme) => {
        try {
            setColorSchemeState(scheme);
            await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la préférence de thème:', error);
        }
    };

    /**
     * Bascule entre light et dark
     */
    const toggleTheme = () => {
        const newScheme = colorScheme === 'light' ? 'dark' : 'light';
        setColorScheme(newScheme);
    };

    const isDarkMode = colorScheme === 'dark';

    // Rend les enfants même pendant l'initialisation avec le thème par défaut (light)
    // La préférence sera appliquée une fois chargée depuis AsyncStorage
    return (
        <ThemeContext.Provider
            value={{
                colorScheme,
                setColorScheme,
                toggleTheme,
                isDarkMode,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook pour accéder au contexte de thème
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme doit être utilisé dans un ThemeProvider');
    }
    return context;
}

