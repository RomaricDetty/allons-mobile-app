import { useAppColors } from '@/hooks/use-app-colors';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface TabNavigationProps {
    activeTab: 'info' | 'tickets';
    onTabPress: (tab: 'info' | 'tickets') => void;
    scrollX: Animated.Value;
}

/**
 * Composant de navigation par onglets avec indicateur animé
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabPress, scrollX }) => {
    const colors = useAppColors();
    const screenWidth = Dimensions.get('window').width;

    const handleTabPress = useCallback((tab: 'info' | 'tickets') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabPress(tab);
    }, [onTabPress]);

    return (
        <View style={[styles.tabsContainer, { backgroundColor: colors.headerBackground, borderBottomColor: colors.headerBorder }]}>
            <View style={styles.tabsWrapper}>
                <Pressable style={styles.tab} onPress={() => handleTabPress('info')}>
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
                        Mes informations
                    </Text>
                </Pressable>
                <Pressable style={styles.tab} onPress={() => handleTabPress('tickets')}>
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
                        Mes tickets
                    </Text>
                </Pressable>
            </View>
            <Animated.View
                style={[
                    styles.tabIndicator,
                    {
                        backgroundColor: colors.activeTabColor,
                        transform: [{
                            translateX: scrollX.interpolate({
                                inputRange: [0, screenWidth],
                                outputRange: [
                                    25.5 + 0.075 * screenWidth,
                                    -4.5 + 0.575 * screenWidth
                                ],
                                extrapolate: 'clamp',
                            }),
                        }],
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabsContainer: {
        position: 'relative',
        borderBottomWidth: 1,
        paddingHorizontal: 30,
    },
    tabsWrapper: {
        flexDirection: 'row',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '35%',
        height: 2,
        borderRadius: 1,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    tabTextActive: {
        fontFamily: 'Ubuntu_Medium',
    },
});
