// @ts-nocheck
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran affiché lorsqu'il n'y a pas de connexion internet
 * Vérifie en permanence la connectivité et redirige automatiquement
 * vers l'écran d'accueil dès que la connexion est rétablie
 */
export default function NoInternetScreen() {
    const { isConnected, isInternetReachable } = useConnectivity();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    const iconColor = colorScheme === 'dark' ? '#9BA1A6' : '#9BA1A6';

    // Redirige vers l'écran d'accueil dès que la connexion est rétablie
    useEffect(() => {
        if (isConnected && isInternetReachable) {
            // Petit délai pour s'assurer que la connexion est stable
            const timer = setTimeout(() => {
                router.replace('/(tabs)');
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isConnected, isInternetReachable]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
            <View style={styles.content}>
                {/* Icône WiFi barré */}
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                        name="wifi-off"
                        size={80}
                        color={iconColor}
                    />
                </View>

                {/* Titre */}
                <Text style={[styles.title, { color: textColor }]}>
                    Pas de connexion à internet
                </Text>

                {/* Description */}
                <Text style={[styles.description, { color: secondaryTextColor }]}>
                    Vérifiez votre connexion réseau et réessayez.
                </Text>

                {/* Indicateur de vérification */}
                <View style={styles.checkingContainer}>
                    <ActivityIndicator size="small" color="#1776BA" />
                    <Text style={styles.checkingText}>
                        Vérification de la connexion...
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    checkingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkingText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#1776BA',
    },
});

