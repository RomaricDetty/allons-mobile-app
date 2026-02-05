// @ts-nocheck
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

/** Couleur onglet sélectionné (iOS) */
const TAB_SELECTED_IOS = '#1776BA';
/** Couleurs onglet sélectionné (Android) */
const TAB_SELECTED_BG = 'rgba(23, 118, 186, 1)';
const TAB_SELECTED_CONTENT = '#FFFFFF';

/** Ombre de la barre d'onglets (Android uniquement) */
const TAB_BAR_SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';
const TAB_BAR_ELEVATION = 8;

/** Icônes : SF Symbols sur iOS, VectorIcon (72px) sur Android pour affichage net */
const tabIcons = {
    home:
        Platform.OS === 'ios'
            ? { sf: 'house.fill' as const }
            : { src: <VectorIcon family={MaterialCommunityIcons} name="home" /> },
    profile:
        Platform.OS === 'ios'
            ? { sf: 'person.fill' as const }
            : { src: <VectorIcon family={MaterialCommunityIcons} name="account" /> },
};

/** Retourne les props de style de la barre d’onglets pour Android (couleurs thème) */
function getAndroidTabBarStyle(scheme: 'light' | 'dark' | null) {
    if (Platform.OS !== 'android') return undefined;
    const resolvedScheme = scheme ?? 'light';
    const colors = Colors[resolvedScheme];
    return {
        backgroundColor: colors.background,
        iconColor: {
            default: colors.tabIconDefault,
            selected: TAB_SELECTED_CONTENT,
        },
        labelStyle: {
            default: { color: colors.tabIconDefault },
            selected: { color: colors.tabIconSelected },
        },
        indicatorColor: TAB_SELECTED_BG,
        shadowColor: TAB_BAR_SHADOW_COLOR,
        style: { elevation: TAB_BAR_ELEVATION },
    };
}

/** Retourne les props de style de la barre d'onglets pour iOS (onglet sélectionné #1766AB) */
function getIOSTabBarStyle(scheme: 'light' | 'dark' | null) {
    if (Platform.OS !== 'ios') return undefined;
    const resolvedScheme = scheme ?? 'light';
    const colors = Colors[resolvedScheme];
    return {
        iconColor: {
            default: colors.tabIconDefault,
            selected: TAB_SELECTED_IOS,
        },
        labelStyle: {
            default: { color: colors.tabIconDefault },
            selected: { color: TAB_SELECTED_IOS },
        },
        indicatorColor: TAB_SELECTED_IOS,
    };
}

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const androidStyle = getAndroidTabBarStyle(colorScheme);
    const iosStyle = getIOSTabBarStyle(colorScheme);
    return (
        <>
            <NativeTabs {...androidStyle} {...iosStyle}>
                <NativeTabs.Trigger name="index">
                    <Label>Accueil</Label>
                    <Icon {...tabIcons.home} selectedColor={Platform.OS === 'ios' ? TAB_SELECTED_IOS : TAB_SELECTED_CONTENT} />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="profile">
                    <Icon {...tabIcons.profile} selectedColor={Platform.OS === 'ios' ? TAB_SELECTED_IOS : TAB_SELECTED_CONTENT} />
                    <Label>Mon profil</Label>
                </NativeTabs.Trigger>
            </NativeTabs>

            {/* {Platform.OS === 'android' && (
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
            )} */}
        </>
    );
}
