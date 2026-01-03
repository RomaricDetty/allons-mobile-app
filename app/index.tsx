// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Écran d'index qui redirige vers l'onboarding ou l'écran principal
 */
const Index = () => {
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    /**
     * Vérifie si l'onboarding a déjà été effectué et redirige en conséquence
     */
    const checkOnboardingStatus = async () => {
        try {
            const onboardingStatus = await AsyncStorage.getItem('onboarding');
            const isOnboardingDone = onboardingStatus === '1';

            if (isOnboardingDone) {
                router.replace('/(tabs)');
            } else {
                router.replace('/onboard');
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            router.replace('/onboard');
        }
    };

    return null;
};

export default Index;