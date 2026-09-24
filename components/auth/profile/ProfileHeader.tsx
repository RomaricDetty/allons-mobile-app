// @ts-nocheck
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ProfileHeaderProps {
    onLogout: () => void;
}

/**
 * En-tête du profil : titre + déconnexion
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ onLogout }) => {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();

    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: colors.headerBackground,
                    borderBottomColor: colors.headerBorder,
                },
            ]}
        >
            <Text style={[styles.headerTitle, { color: colors.text }]}>Mon profil</Text>
            <Pressable
                style={styles.headerButton}
                onPress={onLogout}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Se déconnecter"
                android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true, radius: 22 }}
            >
                <MaterialCommunityIcons name="logout-variant" size={22} color={colors.icon} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
    },
});
