// @ts-nocheck
import { useAppColors } from '@/hooks/use-app-colors';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface TabNavigationProps {
    activeTab: 'info' | 'tickets' | 'locations';
    onTabPress: (tab: 'info' | 'tickets' | 'locations') => void;
}

const TAB_WIDTH = 140;
const PADDING_H = 16;
const TAB_INDEX: Record<'info' | 'tickets' | 'locations', number> = {
    info: 0,
    tickets: 1,
    locations: 2,
};

const TABS = [
    { key: 'info' as const, label: 'Informations', icon: 'account' },
    { key: 'tickets' as const, label: 'Réservations', icon: 'ticket-confirmation' },
    { key: 'locations' as const, label: 'Locations bus', icon: 'bus' },
];

const getScrollOffsetForTab = (tab: 'info' | 'tickets' | 'locations') => {
    const screenWidth = Dimensions.get('window').width;
    const contentWidth = 2 * PADDING_H + 3 * TAB_WIDTH;
    const maxScroll = Math.max(0, contentWidth - screenWidth);
    const index = TAB_INDEX[tab];
    const tabCenterX = PADDING_H + (index + 0.5) * TAB_WIDTH;
    const offset = tabCenterX - screenWidth / 2;
    return Math.max(0, Math.min(offset, maxScroll));
};

/**
 * Navigation par onglets du profil
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabPress }) => {
    const colors = useAppColors();
    const scrollViewRef = useRef<ScrollView>(null);

    const scrollToTab = useCallback((tab: 'info' | 'tickets' | 'locations') => {
        scrollViewRef.current?.scrollTo({ x: getScrollOffsetForTab(tab), animated: true });
    }, []);

    useEffect(() => {
        scrollToTab(activeTab);
    }, [activeTab, scrollToTab]);

    const handleTabPress = useCallback(
        (tab: 'info' | 'tickets' | 'locations') => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabPress(tab);
            scrollToTab(tab);
        },
        [onTabPress, scrollToTab],
    );

    return (
        <View
            style={[
                styles.tabsContainer,
                {
                    backgroundColor: colors.headerBackground,
                    borderBottomColor: colors.headerBorder,
                },
            ]}
        >
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.tabsScrollContent, { paddingHorizontal: PADDING_H }]}
                style={styles.tabsScrollView}
            >
                {TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <Pressable
                            key={tab.key}
                            style={[styles.tab, { width: TAB_WIDTH }]}
                            onPress={() => handleTabPress(tab.key)}
                        >
                            <View
                                style={[
                                    styles.tabInner,
                                    active && {
                                        backgroundColor: colors.infoMuted,
                                        borderColor: colors.activeTabColor,
                                    },
                                    !active && { borderColor: 'transparent' },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={tab.icon}
                                    size={18}
                                    color={active ? colors.activeTabColor : colors.inactiveIcon}
                                />
                                <Text
                                    style={[
                                        styles.tabText,
                                        {
                                            color: active ? colors.activeTabColor : colors.inactiveTabText,
                                            fontFamily: active ? 'Ubuntu_Bold' : 'Ubuntu_Regular',
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {tab.label}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    tabsContainer: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tabsScrollView: {
        flexGrow: 0,
    },
    tabsScrollContent: {
        flexDirection: 'row',
        paddingVertical: 10,
        gap: 8,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 40,
        width: '100%',
    },
    tabText: {
        fontSize: 13,
    },
});
