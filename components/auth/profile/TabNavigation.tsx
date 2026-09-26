// @ts-nocheck
import { useAppColors } from '@/hooks/use-app-colors';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface TabNavigationProps {
    activeTab: 'info' | 'tickets' | 'locations';
    onTabPress: (tab: 'info' | 'tickets' | 'locations') => void;
}

const TABS = [
    { key: 'info' as const, label: 'Infos', icon: 'account-outline' },
    { key: 'tickets' as const, label: 'Réservations', icon: 'ticket-confirmation-outline' },
    { key: 'locations' as const, label: 'Locations', icon: 'bus' },
];

/**
 * Onglets profil — barre égale + indicateur bas (sans pastille / bordure).
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabPress }) => {
    const colors = useAppColors();

    const handleTabPress = useCallback(
        (tab: 'info' | 'tickets' | 'locations') => {
            if (tab === activeTab) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabPress(tab);
        },
        [activeTab, onTabPress],
    );

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.headerBackground,
                    borderBottomColor: colors.headerBorder,
                },
            ]}
        >
            {TABS.map((tab) => {
                const active = activeTab === tab.key;
                const tint = active ? colors.activeTabColor : colors.inactiveTabText;

                return (
                    <Pressable
                        key={tab.key}
                        style={styles.tab}
                        onPress={() => handleTabPress(tab.key)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={tab.label}
                    >
                        <MaterialCommunityIcons
                            name={active ? tab.icon.replace('-outline', '') : tab.icon}
                            size={20}
                            color={tint}
                        />
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: tint,
                                    fontFamily: active ? 'Ubuntu_Medium' : 'Ubuntu_Regular',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {tab.label}
                        </Text>
                        <View
                            style={[
                                styles.indicator,
                                {
                                    backgroundColor: active ? colors.activeTabColor : 'transparent',
                                },
                            ]}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingTop: 12,
        paddingBottom: 10,
        paddingHorizontal: 4,
    },
    label: {
        fontSize: 12,
        letterSpacing: 0.1,
    },
    indicator: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 0,
        height: 2,
        borderRadius: 1,
    },
});
