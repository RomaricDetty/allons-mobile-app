// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';


import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

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
    const [fontsReady, setFontsReady] = useState(false);

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
     * Cache le SplashScreen et autorise le rendu avec gestion du timeout
     * Nécessaire car Android peut avoir des problèmes de chargement de fonts
     */
    useEffect(() => {

        // Si les fonts sont chargées avec succès
        if (loaded) {
            setFontsReady(true);
            SplashScreen.hideAsync();
            return;
        }

        // Si erreur, on continue quand même pour ne pas bloquer l'app
        if (error) {
            setFontsReady(true);
            SplashScreen.hideAsync();
            return;
        }

        // Timeout de sécurité : après 5 secondes, on force le rendu même si les fonts ne sont pas chargées
        // Particulièrement important pour Android
        const timeoutId = setTimeout(() => {
            setFontsReady(true);
            SplashScreen.hideAsync();
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [loaded, error]);

    // Ne rend rien jusqu'à ce que fontsReady soit true
    if (!fontsReady) {
        return null;
    }

    return (
        <ThemeProvider>
            <RootContent />
        </ThemeProvider>
    );
}

/**
 * Composant interne pour accéder au thème après l'initialisation du ThemeProvider
 */
function RootContent() {
    const colorScheme = useColorScheme();
    return (
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="onboard/index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="trip/search" options={{ headerShown: false }} />
                <Stack.Screen name="trip/trip-list" options={{ headerShown: false }} />
                <Stack.Screen name="trip/trip-return-list" options={{ headerShown: false }} />
                <Stack.Screen name="trip/trip-summary" options={{ headerShown: false }} />
                <Stack.Screen name="trip/passengers-info" options={{ headerShown: false }} />
                <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                <Stack.Screen name="trip/ticket-details" options={{ headerShown: false }} />
                <Stack.Screen name="trip/ticket-qr" options={{ headerShown: false }} />
                {/* <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} /> */}
            </Stack>
            <StatusBar style="auto" />
        </NavigationThemeProvider>
    );
}
