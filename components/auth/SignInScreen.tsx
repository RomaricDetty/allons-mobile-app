//@ts-nocheck
import { authLogin } from '@/api/auth_register';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthFormField } from './AuthFormField';
import { PasswordField } from './PasswordField';
// const logoImage = require('@/assets/images/allon-logo.png');
// const logoImageWhite = require('@/assets/images/allon-logo-white.png');

interface ContactUrgent {
    fullName: string;
    phone: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    email: string;
    username: string;
    civility: string;
    dateOfBirth: string;
    picture?: string | null;
    role?: string | null;
    company?: string | null;
    address?: string | null;
    contactUrgent: ContactUrgent;
    phones?: any[];
    active: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

interface SignInScreenProps {
    onSignIn: () => void;
    onSwitchToSignUp: () => void;
    onForgotPassword: () => void;
}

/**
 * Écran de connexion avec formulaire et options de connexion sociale
 */
export const SignInScreen = ({ onSignIn, onSwitchToSignUp, onForgotPassword }: SignInScreenProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const navigation = useNavigation();
    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran - style moderne avec fond blanc
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F3F3F7';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666666';
    const separatorLineColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const linkColor = '#000000';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Valeurs animées pour réduire les éléments quand le clavier apparaît
    const logoScale = useRef(new Animated.Value(1)).current;
    const headerScale = useRef(new Animated.Value(1)).current;
    const logoTranslateY = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(0)).current;

    /**
     * Gère l'animation de réduction/agrandissement des éléments selon l'état du clavier
     */
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                // Réduire les éléments quand le clavier apparaît
                Animated.parallel([
                    Animated.timing(logoScale, {
                        toValue: 0.6,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerScale, {
                        toValue: 0.85,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoTranslateY, {
                        toValue: -20,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerTranslateY, {
                        toValue: -16,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                // Restaurer la taille initiale quand le clavier disparaît
                Animated.parallel([
                    Animated.timing(logoScale, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerScale, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoTranslateY, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerTranslateY, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [logoScale, headerScale, logoTranslateY, headerTranslateY]);

    /**
     * Handle the sign in action
     */
    const handleSignIn = async () => {
        // Validation des champs
        if (email.trim() === '' || password.trim() === '') {
            Alert.alert('Attention !', 'Veuillez remplir tous les champs');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authLogin({ emailOrUsername: email.trim().toLowerCase(), password: password.trim() });
            console.log('Réponse de la connexion : ', response);
            
            // Vérifier que la réponse est valide
            if (response && response.status === 200 && response.data) {
                // Vérifier que tous les champs nécessaires sont présents
                const accessToken = response.data.access_token;
                const refreshToken = response.data.refresh_token;
                const expiresIn = response.data.expires_in;
                const tokenType = response.data.token_type;
                const user = response.data.user;
                
                if (!accessToken || accessToken.trim() === '') {
                    throw new Error('Token d\'accès manquant dans la réponse');
                }
                
                if (!user || !user.id) {
                    throw new Error('Informations utilisateur manquantes dans la réponse');
                }
                
                // Stocker les tokens de manière sécurisée
                try {
                    await AsyncStorage.setItem('token', accessToken);
                    
                    if (refreshToken && refreshToken.trim() !== '') {
                        await AsyncStorage.setItem('refresh_token', refreshToken);
                    }
                    
                    if (expiresIn !== undefined && expiresIn !== null) {
                        await AsyncStorage.setItem('expires_at', String(expiresIn));
                    }
                    
                    if (tokenType && tokenType.trim() !== '') {
                        await AsyncStorage.setItem('token_type', tokenType);
                    }
                    
                    await AsyncStorage.setItem('user_id', user.id);
                    console.log('user_id : ', user.id);
                    
                    onSignIn();
                } catch (storageError) {
                    console.error('Erreur lors du stockage des données:', storageError);
                    Alert.alert('Erreur', 'Impossible de sauvegarder les informations de connexion. Veuillez réessayer.');
                }
            } else {
                const errorMessage = response?.data?.message || 'Erreur lors de la connexion';
                Alert.alert('Attention !', errorMessage);
                console.log('Erreur lors de la connexion : ', response?.data);
            }
        } catch (error: any) {
            console.error('Erreur lors de la connexion : ', error);
            
            // Afficher un message d'erreur plus spécifique
            let errorMessage = 'Une erreur est survenue lors de la connexion, veuillez vérifier vos informations et réessayer.';
            
            if (error?.response) {
                // Erreur de l'API
                if (error.response.status === 401) {
                    errorMessage = 'Email ou mot de passe incorrect. Veuillez réessayer.';
                } else if (error.response.status === 404) {
                    errorMessage = 'Utilisateur non trouvé. Vérifiez vos informations de connexion.';
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error?.message) {
                // Erreur personnalisée
                errorMessage = error.message;
            }
            
            Alert.alert('Attention !', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };



    /**
     * Composant logo simple avec deux formes en 'C' stylisées
     */
    const Logo = () => (
        <Animated.View 
            style={[
                styles.logoContainer,
                {
                    transform: [
                        { scale: logoScale },
                        { translateY: logoTranslateY }
                    ],
                }
            ]}
        >
            {/* Forme avant (plus foncée) */}
            <View style={styles.logoFront}>
                <Image 
                    source={require('@/assets/images/allon-logo-transparent.png')} 
                    resizeMode="cover" 
                    style={{ width: 100, height: 100 }} 
                />
            </View>
        </Animated.View>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: scrollBackgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Logo />
                <Animated.View 
                    style={[
                        styles.header,
                        {
                            transform: [
                                { scale: headerScale },
                                { translateY: headerTranslateY }
                            ],
                        }
                    ]}
                >
                    <Text style={[styles.title, { color: textColor }]}>Bienvenue !</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>Veuillez renseigner vos informations de connexion.</Text>
                </Animated.View>

            <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
                <View style={styles.form}>
                    <AuthFormField
                        label="Adresse email ou nom d'utilisateur"
                        value={email}
                        onChangeText={setEmail}
                        placeholder=""
                        keyboardType="email-address"
                    />
                    <PasswordField
                        label="Mot de passe"
                        value={password}
                        onChangeText={setPassword}
                        placeholder=""
                    />

                    <View style={[styles.optionsRow, { alignSelf: 'flex-end' }]}>
                        <Pressable onPress={onForgotPassword}>
                            <Text style={[styles.forgotPassword, { color: "#1776BA" }]}>Mot de passe oublié ?</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            <Pressable
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <Text style={styles.primaryButtonText}>Se connecter</Text>
                )}
            </Pressable>

           
            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: secondaryTextColor }]}>Vous n'avez pas de compte ? </Text>
                <Pressable onPress={onSwitchToSignUp}>
                    <Text style={[styles.footerLink, { color: "#1776BA" }]}>Inscrivez-vous !</Text>
                </Pressable>
            </View>

            
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 60,
    },
    logoContainer: {
        width: 60,
        height: 60,
        alignSelf: 'center',
        marginBottom: 15,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBack: {
        position: 'absolute',
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoFront: {
        position: 'absolute',
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateX: 3 }, { translateY: 3 }],
    },
    logoCShape: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoArc: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderRightWidth: 0,
    },
    logoArcBack: {
        borderColor: '#E0E0E0',
        opacity: 0.4,
    },
    logoArcFront: {
        borderColor: '#000000',
        opacity: 1,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    form: {
        // marginBottom: 24,
        padding: 10,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        // marginBottom: 8,
    },
    forgotPassword: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    primaryButton: {
        backgroundColor: '#1776BA',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 24,
        gap: 8,
    },
    googleButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#1776BA',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    footerLink: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    forgotPasswordContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 16,
        // marginHorizontal: 100,
        paddingHorizontal: 16,
    },
    forgotPasswordLink: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: "#1776BA",
        textAlign: 'center',
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: "#1776BA",
        textAlign: 'center',
    },
});

