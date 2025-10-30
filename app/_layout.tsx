// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';


import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';

export const unstable_settings = {
    anchor: '(tabs)',
};

// Empêche le SplashScreen de se cacher automatiquement avant le chargement complet des assets
SplashScreen.preventAutoHideAsync();

/**
 * Layout racine de l'application
 * Gère le chargement des fonts avant d'afficher l'interface
 */
export default function RootLayout() {
    const colorScheme = useColorScheme();

    // Charge toutes les fonts Ubuntu nécessaires
    const [loaded, error] = useFonts({
        Ubuntu_Bold: require("@/assets/fonts/Ubuntu-Bold.ttf"),
        Ubuntu_BoldItalic: require("@/assets/fonts/Ubuntu-BoldItalic.ttf"),
        Ubuntu_Italic: require("@/assets/fonts/Ubuntu-Italic.ttf"),
        Ubuntu_Light: require("@/assets/fonts/Ubuntu-Light.ttf"),
        Ubuntu_LightItalic: require("@/assets/fonts/Ubuntu-LightItalic.ttf"),
        Ubuntu_Medium: require("@/assets/fonts/Ubuntu-Medium.ttf"),
        Ubuntu_MediumItalic: require("@/assets/fonts/Ubuntu-MediumItalic.ttf"),
        Ubuntu_Regular: require("@/assets/fonts/Ubuntu-Regular.ttf"),
    });

    /**
     * Cache le SplashScreen uniquement lorsque toutes les fonts sont chargées
     */
    useEffect(() => {
        if (loaded || error) {
            // Cache le SplashScreen une fois que les fonts sont chargées ou en cas d'erreur
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    // Ne rend rien jusqu'à ce que les fonts soient chargées
    if (!loaded && !error) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="onboard/index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
