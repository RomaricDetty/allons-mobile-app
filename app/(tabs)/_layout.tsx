// @ts-nocheck
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarLabelStyle: {
                        fontFamily: 'Ubuntu_Regular',
                    },
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="home-outline" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Mon profil',
                    tabBarLabelStyle: {
                        fontFamily: 'Ubuntu_Regular',
                    },
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="account-circle-outline" color={color} />,
                }}
            />
        </Tabs>
    );
}
