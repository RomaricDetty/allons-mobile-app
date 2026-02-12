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

/** Largeur fixe par onglet pour un rendu identique sur tous les devices */
const TAB_WIDTH = 140;
const PADDING_H = 16;
const TAB_INDEX: Record<'info' | 'tickets' | 'locations', number> = { info: 0, tickets: 1, locations: 2 };

/**
 * Calcule l'offset de scroll pour centrer l'onglet à l'écran
 */
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
 * Composant de navigation par onglets scrollable (sans indicateur)
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabPress }) => {
    const colors = useAppColors();
    const scrollViewRef = useRef<ScrollView>(null);

    /** Scroll la barre d'onglets pour que l'onglet actif soit bien visible (centré) */
    const scrollToTab = useCallback((tab: 'info' | 'tickets' | 'locations') => {
        const x = getScrollOffsetForTab(tab);
        scrollViewRef.current?.scrollTo({ x, animated: true });
    }, []);

    useEffect(() => {
        scrollToTab(activeTab);
    }, [activeTab, scrollToTab]);

    const handleTabPress = useCallback((tab: 'info' | 'tickets' | 'locations') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabPress(tab);
        scrollToTab(tab);
    }, [onTabPress, scrollToTab]);

    return (
        <View style={[styles.tabsContainer, { backgroundColor: colors.headerBackground, borderBottomColor: colors.headerBorder }]}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.tabsScrollContent, { paddingHorizontal: PADDING_H }]}
                style={styles.tabsScrollView}
            >
                <Pressable style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleTabPress('info')}>
                    <MaterialCommunityIcons
                        name="account-outline"
                        size={20}
                        color={activeTab === 'info' ? colors.activeTabColor : colors.inactiveIcon}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'info' ? colors.activeTabColor : colors.inactiveTabText },
                        activeTab === 'info' && styles.tabTextActive
                    ]}>
                        Informations
                    </Text>
                </Pressable>
                <Pressable style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleTabPress('tickets')}>
                    <MaterialCommunityIcons
                        name="ticket-outline"
                        size={20}
                        color={activeTab === 'tickets' ? colors.activeTabColor : colors.inactiveIcon}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'tickets' ? colors.activeTabColor : colors.inactiveTabText },
                        activeTab === 'tickets' && styles.tabTextActive
                    ]}>
                        Réservations
                    </Text>
                </Pressable>
                <Pressable style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleTabPress('locations')}>
                    <MaterialCommunityIcons
                        name="bus-stop"
                        size={20}
                        color={activeTab === 'locations' ? colors.activeTabColor : colors.inactiveIcon}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'locations' ? colors.activeTabColor : colors.inactiveTabText },
                        activeTab === 'locations' && styles.tabTextActive
                    ]}>
                        Locations bus
                    </Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    tabsContainer: {
        position: 'relative',
        borderBottomWidth: 1,
    },
    tabsScrollView: {
        flexGrow: 0,
    },
    tabsScrollContent: {
        flexDirection: 'row',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        gap: 6,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    tabTextActive: {
        fontFamily: 'Ubuntu_Bold',
    },
});
