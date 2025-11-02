// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const Index = () => {
    const [showSplash, setShowSplash] = useState(false);
    const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    /**
     * Vérifie si l'onboarding a déjà été effectué
     * Affiche le splash screen uniquement si l'onboarding est terminé
     */
    const checkOnboardingStatus = async () => {
        try {
            const onboardingStatus = await AsyncStorage.getItem('onboarding');
            const isOnboardingDone = onboardingStatus === '1';
            
            setOnboardingDone(isOnboardingDone);

            if (isOnboardingDone) {
                // Afficher le splash screen puis rediriger vers tabs
                setShowSplash(true);
            } else {
                // Rediriger directement vers onboard sans splash
                router.replace('/onboard');
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            router.replace('/onboard');
        }
    };

    /**
     * Affiche le splash screen pendant une durée aléatoire entre 3 et 10 secondes
     * puis redirige vers l'écran tabs
     */
    useEffect(() => {
        if (showSplash && onboardingDone) {
            // Durée aléatoire entre 3000ms (3s) et 10000ms (10s)
            const splashDuration = Math.random() * 7000 + 3000;
            
            const timer = setTimeout(() => {
                router.replace('/(tabs)');
            }, splashDuration);

            return () => clearTimeout(timer);
        }
    }, [showSplash, onboardingDone]);

    // Affiche le splash screen uniquement si l'onboarding est terminé
    if (showSplash && onboardingDone) {
        return (
            <View style={styles.splashContainer}>
                <Image
                    source={require('@/assets/images/logo-allon-blanc.png')}
                    resizeMode="contain"
                    style={styles.logo}
                />
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: '#1776BA', // Couleur bleue de la marque
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: height,
    },
    logo: {
        width: 150,
        height: 150,
    },
});

export default Index;