// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ConnectivityGuard } from '@/components/ConnectivityGuard';
import CustomSplashScreen from '@/components/custom-splashscreen';
import { ConnectivityProvider } from '@/contexts/ConnectivityContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

export const unstable_settings = {
    anchor: '(tabs)',
};

// Empêche le SplashScreen par défaut de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

/**
 * Layout racine de l'application
 * Gère le chargement des fonts et des images avant d'afficher l'interface
 */
export default function RootLayout() {
    const [isAppReady, setIsAppReady] = useState(false);

    // Charge toutes les fonts Ubuntu nécessaires
    const [fontsLoaded, fontsError] = useFonts({
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
     * Cache le splash natif dès que possible pour afficher le custom splash
     */
    useEffect(() => {
        const hideSplash = async () => {
            try {
                // Cache immédiatement le splash natif pour montrer le custom splash
                await SplashScreen.hideAsync();
            } catch (error) {
                // Ignore les erreurs si le splash est déjà caché
                console.warn('Splash déjà caché:', error);
            }
        };
        
        hideSplash();
    }, []);

    /**
     * Précharge tous les assets critiques de l'application
     * Inclut les fonts et les images de l'onboarding
     */
    useEffect(() => {
        async function prepareApp() {
            try {
                // Attendre que les fonts soient chargées
                if (!fontsLoaded && !fontsError) {
                    return;
                }

                // Si erreur de fonts, on log mais on continue
                if (fontsError) {
                    console.warn('Erreur de chargement des fonts:', fontsError);
                }

                // Précharge les images avec timeout global de 10 secondes
                const loadAssetsWithTimeout = Promise.race([
                    Promise.all([
                        Asset.fromModule(require('@/assets/images/onboarding/logo-allon-blanc.png')).downloadAsync(),
                        Asset.fromModule(require('@/assets/images/onboarding/bg_voyage.png')).downloadAsync(),
                        Asset.fromModule(require('@/assets/images/onboarding/person_travel_1.png')).downloadAsync(),
                        Asset.fromModule(require('@/assets/images/onboarding/person_travel_2.png')).downloadAsync(),
                        Asset.fromModule(require('@/assets/images/onboarding/person_travel_3.png')).downloadAsync(),
                    ]),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout de chargement des assets')), 10000)
                    )
                ]);

                await loadAssetsWithTimeout;
                console.log('Tous les assets de l\'onboarding sont chargés');

            } catch (error) {
                console.warn('Erreur lors du préchargement des assets:', error);
                // Continue quand même pour ne pas bloquer l'app
            } finally {
                // Garde le custom splash au minimum 2 secondes pour une bonne UX
                setTimeout(() => {
                    setIsAppReady(true);
                }, 2500);
            }
        }

        prepareApp();
    }, [fontsLoaded, fontsError]);

    // Affiche le SplashScreen personnalisé pendant le chargement
    if (!isAppReady) {
        return <CustomSplashScreen />;
    }

    return (
        <ThemeProvider>
            <ConnectivityProvider>
                <RootContent />
            </ConnectivityProvider>
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
            <ConnectivityGuard>
                <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="onboard/index" options={{ headerShown: false }} />
                    <Stack.Screen name="no-internet" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/search" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/trip-list" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/trip-return-list" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/trip-summary" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/passengers-info" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/seat-selection" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/booking-confirmation" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/ticket-details" options={{ headerShown: false }} />
                    <Stack.Screen name="trip/ticket-qr" options={{ headerShown: false }} />
                </Stack>
                <StatusBar 
                    style={colorScheme === 'dark' ? 'light' : 'dark'} 
                    backgroundColor={colorScheme === 'dark' ? '#121212' : '#ffffff'} 
                />
            </ConnectivityGuard>
        </NavigationThemeProvider>
    );
}