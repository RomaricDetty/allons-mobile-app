import { authLogin } from '@/api/auth_register';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthFormField } from './AuthFormField';
import { PasswordField } from './PasswordField';

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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Handle the sign in action
     */
    const handleSignIn = async () => {
        setIsLoading(true);
        if (email.trim() === '' || password.trim() === '') {
            Alert.alert('Attention !', 'Veuillez remplir tous les champs');
            return;
        }

        try {
            const response = await authLogin({ emailOrUsername: email.trim(), password: password.trim() });
            console.log('Réponse de la connexion : ', response);
            if (response.status === 200) {
                AsyncStorage.setItem('token', response.data.access_token);
                AsyncStorage.setItem('refresh_token', response.data.refresh_token);
                AsyncStorage.setItem('expires_at', String(response.data.expires_in));
                AsyncStorage.setItem('token_type', response.data.token_type);
                AsyncStorage.setItem('user_id', response.data.user.id);
                console.log('user_id : ', response.data.user.id);
                onSignIn();
            } else {
                Alert.alert('Attention !', response.data.message);
                console.log('Erreur lors de la connexion : ', response.data);
                return;
            }
        } catch (error) {
            console.error('Erreur lors de la connexion : ', error);
            Alert.alert('Attention !', 'Une erreur est survenue lors de la connexion');
            return;
        } finally {
            setIsLoading(false);
        }
    };

    

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Se connecter</Text>
                <Text style={styles.subtitle}>Connectez-vous pour accéder à votre compte</Text>
            </View>

            <View style={styles.form}>
                <AuthFormField
                    label="Adresse email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Entrez votre email"
                    keyboardType="email-address"
                />
                <PasswordField
                    label="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Entrez votre mot de passe"
                />
                
            </View>

            <Pressable style={styles.primaryButton} onPress={handleSignIn}>
                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <Text style={styles.primaryButtonText}>Se connecter</Text>
                )}
                {/* <Text style={styles.primaryButtonText}>Se connecter</Text> */}
            </Pressable>

            <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>OU</Text>
                <View style={styles.separatorLine} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Vous n'avez pas de compte ? </Text>
                <Pressable>
                    {/* onPress={onSwitchToSignUp} */}
                    <Text style={styles.footerLink}>Inscrivez-vous</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F3F7',
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 40,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    form: {
        marginBottom: 24,
    },
    primaryButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    separator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    separatorText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    footerLink: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#1776BA',
    },
});

