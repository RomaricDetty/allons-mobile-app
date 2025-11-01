// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';

const Index = () => {
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const onboardingDone = await AsyncStorage.getItem('onboarding');
            console.log('onboardingDone value is :', onboardingDone);
            if (onboardingDone === '1') {
                console.log('onboardingDone is 1, redirecting to tabs');
                router.replace('/(tabs)');
                return false;
            }

            console.log('onboardingDone is not 1, redirecting to onboard');
            router.replace('/onboard');

        } catch (error) {
            console.error('Error checking onboarding status:', error);
            router.replace('/onboard');
        }
    };

    return null; // Écran de transition
};

export default Index;