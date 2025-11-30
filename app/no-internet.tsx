// @ts-nocheck
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran affiché lorsqu'il n'y a pas de connexion internet
 * Vérifie en permanence la connectivité et redirige automatiquement
 * vers l'écran d'accueil dès que la connexion est rétablie
 */
export default function NoInternetScreen() {
    const { isConnected, isInternetReachable } = useConnectivity();
    const [isChecking, setIsChecking] = useState(false);
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'secondaryText');
    const iconColor = colorScheme === 'dark' ? '#9BA1A6' : '#9BA1A6';

    /**
     * Redirige vers l'écran d'accueil dès que la connexion est rétablie
     * Se base principalement sur isConnected car isInternetReachable peut être null/false
     * même avec une connexion active
     */
    useEffect(() => {
        console.log('--------------------------------');
        console.log('[NoInternet] isConnected:', isConnected);

        console.log('[NoInternet] isInternetReachable:', isInternetReachable);
        
        // Si isConnected est true, on considère qu'il y a une connexion
        // isInternetReachable peut être null/false même avec une connexion active
        if (isConnected) {
            console.log('[NoInternet] Connexion détectée, redirection dans 1 seconde...');
            // Petit délai pour s'assurer que la connexion est stable
            const timer = setTimeout(() => {
                console.log('[NoInternet] Redirection vers /(tabs)');
                router.replace('/(tabs)');
            }, 1000);

            return () => {
                console.log('[NoInternet] Nettoyage du timer');
                clearTimeout(timer);
            };
        }
    }, [isConnected, isInternetReachable]);

    /**
     * Vérifie manuellement la connexion internet
     * Force une nouvelle vérification de l'état de connectivité
     */
    const handleCheckConnection = async () => {
        setIsChecking(true);
        try {
            const state = await NetInfo.fetch();
            console.log('[NoInternet] Vérification manuelle - isConnected:', state.isConnected);
            console.log('[NoInternet] Vérification manuelle - isInternetReachable:', state.isInternetReachable);
            
            // Si la connexion est détectée, rediriger
            if (state.isConnected) {
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 500);
            }
        } catch (error) {
            console.error('[NoInternet] Erreur lors de la vérification:', error);
        } finally {
            setIsChecking(false);
        }
    };

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

                {/* Bouton de vérification manuelle */}
                <TouchableOpacity
                    style={[styles.checkButton, isChecking && styles.checkButtonDisabled]}
                    onPress={handleCheckConnection}
                    disabled={isChecking}
                    activeOpacity={0.7}
                >
                    {isChecking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <MaterialCommunityIcons
                            name="refresh"
                            size={20}
                            color="#FFFFFF"
                        />
                    )}
                    <Text style={styles.checkButtonText}>
                        {isChecking ? 'Vérification...' : 'Réessayer'}
                    </Text>
                </TouchableOpacity>
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
    checkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1776BA',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        minWidth: 140,
    },
    checkButtonDisabled: {
        opacity: 0.6,
    },
    checkButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});

