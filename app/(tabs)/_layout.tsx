// @ts-nocheck
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';

const TAB_ACTIVE = '#1776BA';

/**
 * Barre d’onglets JS (expo-router Tabs) — plus stable que NativeTabs sur iOS 27.
 */
export default function TabLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: TAB_ACTIVE,
                tabBarInactiveTintColor: colors.tabIconDefault,
                tabBarLabelStyle: {
                    fontFamily: 'Ubuntu_Medium',
                    fontSize: 12,
                },
                tabBarStyle: {
                    backgroundColor: colors.cardBackground,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    elevation: 0,
                    shadowOpacity: 0,
                    shadowRadius: 0,
                    shadowOffset: { width: 0, height: 0 },
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size ?? 24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Mon profil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size ?? 24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
