import { refreshTokenApi } from '@/api/auth_register';
import { ProfileScreen } from '@/components/auth/ProfileScreen';
import { SignInScreen } from '@/components/auth/SignInScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

type AuthScreen = 'signup' | 'signin';

/**
 * Écran de profil principal qui gère l'affichage des écrans d'authentification et de profil
 */
export default function TabTwoScreen() {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [currentScreen, setCurrentScreen] = useState<AuthScreen>('signin');
    // const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Vérifie si l'utilisateur est déjà connecté en récupérant les données depuis AsyncStorage
     */
    useEffect(() => {
        checkUserSession();
    }, []);

    /**
     * Vérifie la session utilisateur au chargement de l'écran
     */
    const checkUserSession = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            // const userData = await AsyncStorage.getItem('user');
            const expiresAt = await AsyncStorage.getItem('expires_in');
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            // console.log('expiresAt : ', expiresAt);
            const expiresAtDate = new Date(Number(expiresAt) * 1000);
            const currentDate = new Date();
            // console.log('expiresAtDate : ', expiresAtDate);
            // console.log('currentDate : ', currentDate);
            // console.log('refreshToken : ', refreshToken);

            if (refreshToken) {
                const response = await refreshTokenApi(refreshToken as string);
                // console.log('response refresh token: ', response);
                // console.log('response.data : ', response.data);
                // console.log('response.status : ', response.status);
                if (response.status === 200) {
                    await AsyncStorage.setItem('token', response.data.access_token);
                    // await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
                    await AsyncStorage.setItem('expires_at', String(response.data.expires_in));
                    await AsyncStorage.setItem('token_type', response.data.token_type);
                    setIsSignedIn(true);
                    return;
                }
            } else {
                await AsyncStorage.multiRemove([
                    'token',
                    'refresh_token',
                    'expires_at',
                    'token_type',
                    // 'user',
                ]);
            }

            if (expiresAtDate < currentDate) {
                // Alert.alert('Attention !', 'Votre session a expiré, veuillez vous reconnecter');
                await AsyncStorage.multiRemove([
                    'token',
                    'refresh_token',
                    'expires_at',
                    'token_type',
                    // 'user',
                ]);
                // setUser(null);
                setIsSignedIn(false);
                setCurrentScreen('signin');
                return;
            }
            if (token) {
                setIsSignedIn(true);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de la session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Gère l'inscription d'un nouvel utilisateur
     * Les données utilisateur sont déjà stockées dans AsyncStorage par SignUpScreen
     */
    const handleSignUp = (data: { name: string; email: string; password: string }) => {
        // L'inscription est déjà gérée dans SignUpScreen avec l'API
        // On met simplement l'utilisateur comme connecté pour afficher le profil
        setIsSignedIn(true);
    };

    /**
     * Gère la connexion d'un utilisateur
     * Les données utilisateur sont déjà stockées dans AsyncStorage par SignInScreen
     */
    const handleSignIn = () => {
        setIsSignedIn(true);
    };

    /**
     * Gère la déconnexion de l'utilisateur
     * La suppression d'AsyncStorage est gérée dans ProfileScreen
     */
    const handleLogout = () => {
        // setUser(null);
        setIsSignedIn(false);
        setCurrentScreen('signin');
    };

    /**
     * Gère l'oubli de mot de passe
     */
    const handleForgotPassword = () => {
        // TODO: Implémenter la logique de réinitialisation de mot de passe
        console.log('Forgot password');
    };

    // Afficher un écran de chargement pendant la vérification de la session
    if (isLoading) {
        return null; // Ou un composant de chargement
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
});
