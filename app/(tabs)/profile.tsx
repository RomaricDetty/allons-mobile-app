import { refreshTokenApi } from '@/api/auth_register';
import { ProfileScreen } from '@/components/auth/ProfileScreen';
import { SignInScreen } from '@/components/auth/SignInScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import { clearAuthData } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
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
            // Récupérer expires_at (corrigé depuis expires_in)
            const expiresAt = await AsyncStorage.getItem('expires_at');
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            const currentDate = new Date();

            // Si un refresh token existe, essayer de rafraîchir le token
            if (refreshToken && refreshToken.trim() !== '') {
                try {
                    const response = await refreshTokenApi(refreshToken);
                    
                    // Vérifier que la réponse est valide
                    if (response && response.status === 200 && response.data) {
                        const accessToken = response.data.access_token;
                        const newRefreshToken = response.data.refresh_token;
                        const expiresIn = response.data.expires_in;
                        const tokenType = response.data.token_type;
                        
                        // Valider et stocker le nouveau token
                        if (accessToken && accessToken.trim() !== '') {
                            await AsyncStorage.setItem('token', accessToken);
                            
                            // Mettre à jour le refresh token si fourni
                            if (newRefreshToken && newRefreshToken.trim() !== '') {
                                await AsyncStorage.setItem('refresh_token', newRefreshToken);
                            }
                            
                            if (expiresIn !== undefined && expiresIn !== null) {
                                await AsyncStorage.setItem('expires_at', String(expiresIn));
                            }
                            
                            if (tokenType && tokenType.trim() !== '') {
                                await AsyncStorage.setItem('token_type', tokenType);
                            }
                            
                            setIsSignedIn(true);
                            return;
                        }
                    }
                } catch (refreshError: any) {
                    console.error('Erreur lors du rafraîchissement du token:', refreshError);
                    // Si le refresh token est invalide, nettoyer les données
                    await clearAuthData();
                    setIsSignedIn(false);
                    setCurrentScreen('signin');
                    return;
                }
            }

            // Vérifier si le token a expiré
            if (expiresAt && expiresAt.trim() !== '') {
                try {
                    // expires_at peut être un timestamp en secondes ou une date ISO
                    const expiresAtValue = Number(expiresAt);
                    let expiresAtDate: Date;
                    
                    if (!isNaN(expiresAtValue) && expiresAtValue > 0) {
                        // C'est un timestamp en secondes
                        expiresAtDate = new Date(expiresAtValue * 1000);
                    } else {
                        // Essayer de parser comme date ISO
                        expiresAtDate = new Date(expiresAt);
                    }
                    
                    // Vérifier si la date est valide
                    if (isNaN(expiresAtDate.getTime())) {
                        throw new Error('Date d\'expiration invalide');
                    }
                    
                    if (expiresAtDate < currentDate) {
                        // Le token a expiré, nettoyer les données
                        await clearAuthData();
                        setIsSignedIn(false);
                        setCurrentScreen('signin');
                        return;
                    }
                } catch (dateError) {
                    console.error('Erreur lors de la vérification de la date d\'expiration:', dateError);
                    // Si la date est invalide, considérer le token comme expiré
                    await clearAuthData();
                    setIsSignedIn(false);
                    setCurrentScreen('signin');
                    return;
                }
            }

            // Si un token existe et n'a pas expiré, l'utilisateur est connecté
            if (token && token.trim() !== '') {
                setIsSignedIn(true);
            } else {
                // Pas de token valide, nettoyer les données
                await clearAuthData();
                setIsSignedIn(false);
                setCurrentScreen('signin');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de la session:', error);
            // En cas d'erreur, nettoyer les données et déconnecter
            try {
                await clearAuthData();
            } catch (cleanupError) {
                console.error('Erreur lors du nettoyage:', cleanupError);
            }
            setIsSignedIn(false);
            setCurrentScreen('signin');
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
        router.push('/auth/forgot-password');
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
