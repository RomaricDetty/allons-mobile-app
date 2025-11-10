import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthFormField } from './AuthFormField';
import { Checkbox } from './Checkbox';
import { PasswordField } from './PasswordField';
import { SocialButton } from './SocialButton';

interface SignUpScreenProps {
    onSignUp: (data: { name: string; email: string; password: string }) => void;
    onSwitchToSignIn: () => void;
}

/**
 * Écran d'inscription avec formulaire et options de connexion sociale
 */
export const SignUpScreen = ({ onSignUp, onSwitchToSignIn }: SignUpScreenProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const handleSignUp = () => {
        if (name && email && password && agreeToTerms) {
            onSignUp({ name, email, password });
        }
    };

    const handleSocialSignUp = (provider: 'google' | 'facebook') => {
        // TODO: Implémenter la connexion sociale
        console.log(`Sign up with ${provider}`);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Sign up</Text>
                <Text style={styles.subtitle}>
                    Create an account or log in to explore about our app.
                </Text>
            </View>

            <View style={styles.form}>
                <AuthFormField
                    label="Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                />
                <AuthFormField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                />
                <PasswordField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                />

                <Checkbox
                    label="I agree with privacy and policy"
                    checked={agreeToTerms}
                    onToggle={() => setAgreeToTerms(!agreeToTerms)}
                />
            </View>

            <Pressable style={styles.primaryButton} onPress={handleSignUp}>
                <Text style={styles.primaryButtonText}>Sign up</Text>
            </Pressable>

            <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>Or</Text>
                <View style={styles.separatorLine} />
            </View>

            <View style={styles.socialButtons}>
                <SocialButton provider="google" onPress={() => handleSocialSignUp('google')} />
                <View style={styles.socialButtonSpacer} />
                <SocialButton provider="facebook" onPress={() => handleSocialSignUp('facebook')} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={onSwitchToSignIn}>
                    <Text style={styles.footerLink}>Log in</Text>
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
    socialButtons: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    socialButtonSpacer: {
        width: 12,
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

