// @ts-nocheck
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

/**
 * Layout pour la navigation par onglets
 * ATTENTION : NativeTabs est une fonctionnalité ALPHA instable
 * L'API peut changer à tout moment et peut avoir des bugs
 */
export default function TabLayout() {
    return (
        <>
            {Platform.OS === 'android' && (
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: '#1776BA',
                        tabBarInactiveTintColor: '#687076',
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: 'Accueil',
                            tabBarIcon: ({ color, size }) => (
                                <MaterialIcons name="home" size={size} color={color} />
                            ),
                        }}
                    />

                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: 'Mon profil',
                            tabBarIcon: ({ color, size }) => (
                                <MaterialIcons name="person" size={size} color={color} />
                            ),
                        }}
                    />
                </Tabs>
            )}

            {Platform.OS === 'ios' && (
                <NativeTabs>
                    <NativeTabs.Trigger name="index">
                        <Label>Accueil</Label>
                        <Icon
                            sf="house.fill"
                            android="home"
                            drawable="ic_home"
                        />
                    </NativeTabs.Trigger>

                    <NativeTabs.Trigger name="profile">
                        <Label>Mon profil</Label>
                        <Icon
                            sf="person.fill"
                            android="person"
                            drawable="ic_profile"
                        />
                    </NativeTabs.Trigger>
                </NativeTabs>
            )}
        </>
    );
}
