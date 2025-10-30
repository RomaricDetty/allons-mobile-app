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
            if (onboardingDone === '1') {
                router.replace('/(tabs)');
            } else {
                router.replace('/onboard');
            }
        } catch (error) {
            console.error('Error:', error);
            router.replace('/onboard');
        }
    };

    return null; // Écran de transition
};

export default Index;