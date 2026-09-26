// @ts-nocheck
import { ProfileScreen } from '@/components/auth/ProfileScreen';
import { SignInScreen } from '@/components/auth/SignInScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import { ProfileInfoSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type AuthScreen = 'signup' | 'signin';

/**
 * Onglet profil : auth UI + synchronisation avec AuthContext (refresh token inclus).
 */
export default function TabTwoScreen() {
    const { isAuthenticated, isAuthReady, signOut, ensureSession } = useAuth();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [currentScreen, setCurrentScreen] = useState<AuthScreen>('signin');
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Au montage / quand la session globale est prête : refresh access token si besoin
     */
    useEffect(() => {
        if (!isAuthReady) return;

        let cancelled = false;

        (async () => {
            setIsLoading(true);
            try {
                const token = await ensureSession();
                if (cancelled) return;

                if (token) {
                    setIsSignedIn(true);
                } else {
                    setIsSignedIn(false);
                    setCurrentScreen('signin');
                }
            } catch (error) {
                console.error('Erreur vérification session profil:', error);
                if (!cancelled) {
                    await signOut();
                    setIsSignedIn(false);
                    setCurrentScreen('signin');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthReady, ensureSession, signOut]);

    /**
     * Aligne l'UI locale sur la session globale (idle logout, 401, etc.)
     */
    useEffect(() => {
        if (!isAuthReady) return;
        if (isAuthenticated) {
            setIsSignedIn(true);
        } else {
            setIsSignedIn(false);
            setCurrentScreen('signin');
        }
    }, [isAuthenticated, isAuthReady]);

    const handleSignUp = () => {
        setIsSignedIn(true);
    };

    const handleSignIn = () => {
        setIsSignedIn(true);
    };

    const handleLogout = () => {
        setIsSignedIn(false);
        setCurrentScreen('signin');
    };

    const handleForgotPassword = () => {
        router.push('/auth/forgot-password');
    };

    if (!isAuthReady || isLoading) {
        return (
            <View style={styles.loader}>
                <ProfileInfoSkeleton />
            </View>
        );
    }

    if (isSignedIn) {
        return <ProfileScreen onLogout={handleLogout} />;
    }

    if (currentScreen === 'signin') {
        return (
            <SignInScreen
                onSignIn={() => handleSignIn()}
                onSwitchToSignUp={() => setCurrentScreen('signup')}
                onForgotPassword={handleForgotPassword}
            />
        );
    }

    return (
        <SignUpScreen
            onSignUp={handleSignUp}
            onSwitchToSignIn={() => setCurrentScreen('signin')}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loader: {
        flex: 1,
        backgroundColor: '#F3F3F7',
    },
});
