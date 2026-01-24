// @ts-nocheck
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
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <Label>Accueil</Label>
                {Platform.OS === 'ios' ? (
                    <Icon sf="house.fill" />
                ) : (
                    <Icon materialIcon="home" />
                )}
            </NativeTabs.Trigger>
            
            <NativeTabs.Trigger name="profile">
                <Label>Mon profil</Label>
                {Platform.OS === 'ios' ? (
                    <Icon sf="person.fill" />
                ) : (
                    <Icon materialIcon="person" />
                )}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
