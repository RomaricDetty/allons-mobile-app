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
 * Composant d'en-tête du profil avec titre et bouton de déconnexion
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ onLogout }) => {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();

    return (
        <View style={[
            styles.header,
            {
                paddingTop: insets.top,
                backgroundColor: colors.headerBackground,
                borderBottomColor: colors.headerBorder
            }
        ]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Mon profil</Text>
            <Pressable style={styles.headerButton} onPress={onLogout}>
                <MaterialCommunityIcons name="logout" size={24} color={colors.icon} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
});
