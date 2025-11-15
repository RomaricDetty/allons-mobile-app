//@ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authRegister } from '../../api/auth_register';
import { isValidEmail, isValidPhone } from '../../constants/functions';
import { FormErrors, RegisterData, SignUpFormData, SignUpScreenProps } from '../../interfaces';
import { Civility, PhoneType } from '../../types';
import { SelectionBottomSheet } from '../passengers/SelectionBottomSheet';
import { AuthFormField } from './AuthFormField';
import { Checkbox } from './Checkbox';
import { PasswordField } from './PasswordField';

const SCREEN_HEIGHT = Dimensions.get('window').height;


export const SignUpScreen = ({ onSignUp, onSwitchToSignIn }: SignUpScreenProps) => {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F3F3F7';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF';
    const inputBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const separatorLineColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const linkColor = tintColor === '#fff' ? '#1776BA' : tintColor;
    const modalBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const modalBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const loadingIndicatorColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    // Dans les variables de couleurs, ajouter :
    const sectionBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    const [isLoading, setIsLoading] = useState(false);
    // États pour les champs du formulaire
    const [formData, setFormData] = useState<SignUpFormData>({
        firstName: '',
        lastName: '',
        username: '',
        dateOfBirth: null,
        civility: 'MR',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        emergencyContactFirstName: '',
        emergencyContactLastName: '',
        emergencyContactPhone: '',
        agreeToTerms: true,
    });

    // États pour les erreurs de validation
    const [errors, setErrors] = useState<FormErrors>({});
    const [touchedFields, setTouchedFields] = useState<Set<keyof SignUpFormData>>(new Set());

    // États pour les modals et pickers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCivilityPicker, setShowCivilityPicker] = useState(false);

    // Options pour la civilité
    const civilityOptions = [
        { value: 'MR', label: 'Monsieur' },
        { value: 'MRS', label: 'Madame' },
        { value: 'MISS', label: 'Mademoiselle' },
    ];

    /**
     * Marque un champ comme "touché" (l'utilisateur a interagi avec)
     */
    const markFieldAsTouched = (field: keyof SignUpFormData) => {
        setTouchedFields(prev => new Set(prev).add(field));
    };

    /**
     * Valide un champ individuel
     */
    const validateField = (field: keyof SignUpFormData, value: any): string | undefined => {
        switch (field) {
            case 'firstName':
                if (!value || !value.trim()) {
                    return 'Ce champ est requis';
                }
                break;
            case 'lastName':
                if (!value || !value.trim()) {
                    return 'Ce champ est requis';
                }
                break;
            case 'username':
                if (!value || !value.trim()) {
                    return 'Ce champ est requis';
                }
                break;
            case 'dateOfBirth':
                if (!value) {
                    return 'Ce champ est requis';
                }
                break;
            case 'civility':
                if (!value) {
                    return 'Ce champ est requis';
                }
                break;
            case 'email':
                if (!value || !value.trim()) {
                    return 'Ce champ est requis';
                } else if (!isValidEmail(value)) {
                    return 'Format d\'email invalide';
                }
                break;
            case 'phone':
                if (!value || !value.trim()) {
                    return 'Ce champ est requis';
                } else if (!isValidPhone(value)) {
                    return 'Format de téléphone invalide (Ex: 0123456789)';
                }
                break;
            case 'password':
                if (!value) {
                    return 'Ce champ est requis';
                } else if (value.length < 8) {
                    return 'Le mot de passe doit contenir au moins 8 caractères';
                }
                break;
            case 'confirmPassword':
                if (!value) {
                    return 'Ce champ est requis';
                } else if (formData.password !== value) {
                    return 'Les mots de passe ne correspondent pas';
                }
                break;
            case 'agreeToTerms':
                if (!value) {
                    return 'Vous devez accepter les conditions d\'utilisation';
                }
                break;
        }
        return undefined;
    };

    /**
     * Met à jour un champ du formulaire
     */
    const updateField = (field: keyof SignUpFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Valide le champ en temps réel si il a déjà été touché
        if (touchedFields.has(field)) {
            const error = validateField(field, value);
            if (error) {
                setErrors(prev => ({ ...prev, [field]: error }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
            }
        }
        
        // Validation spéciale pour confirmPassword qui dépend de password
        if (field === 'password' && touchedFields.has('confirmPassword')) {
            const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
            if (confirmPasswordError) {
                setErrors(prev => ({ ...prev, confirmPassword: confirmPasswordError }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.confirmPassword;
                    return newErrors;
                });
            }
        }
    };

    /**
     * Gère la perte de focus d'un champ (onBlur)
     */
    const handleFieldBlur = (field: keyof SignUpFormData) => {
        markFieldAsTouched(field);
        const value = formData[field];
        const error = validateField(field, value);
        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    /**
     * Formate la date de naissance pour l'affichage
     */
    const formatDateOfBirth = (): string => {
        if (!formData.dateOfBirth) return '';
        const date = formData.dateOfBirth;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day} / ${month} / ${year}`;
    };

    /**
     * Valide le formulaire complet
     */
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        
        // Marque tous les champs obligatoires comme touchés
        const requiredFields: (keyof SignUpFormData)[] = [
            'firstName', 'lastName', 'username', 'dateOfBirth', 
            'civility', 'email', 'phone', 'password', 'confirmPassword'
        ];
        requiredFields.forEach(field => {
            markFieldAsTouched(field);
        });

        // Validation de tous les champs
        Object.keys(formData).forEach((key) => {
            const field = key as keyof SignUpFormData;
            const value = formData[field];
            const error = validateField(field, value);
            if (error) {
                newErrors[field] = error;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Gère la soumission du formulaire
     */
    const handleSignUp = async () => {
        if (!formData.agreeToTerms) {
            setErrors(prev => ({ ...prev, agreeToTerms: 'Vous devez accepter les conditions d\'utilisation' }));
            return;
        }

        if (validateForm()) {
            // Construction du nom complet du contact d'urgence
            const emergencyContactFullName = [
                formData.emergencyContactFirstName,
                formData.emergencyContactLastName
            ]
                .filter(Boolean)
                .join(' ')
                .trim();

            // Formatage des données selon RegisterDto
            const userData: RegisterData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                username: formData.username,
                contactUrgent: emergencyContactFullName && formData.emergencyContactPhone
                    ? {
                        fullName: emergencyContactFullName,
                        phone: formData.emergencyContactPhone,
                    }
                    : undefined,
                email: formData.email,
                phones: [{ type: PhoneType.MOBILE, digits: formData.phone }],
                password: formData.password,
                civility: formData.civility as Civility,
                dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString() : '',
            };

            try {
                setIsLoading(true);
                const response = await authRegister(userData);

                // L'API retourne un status 201 pour une création réussie
                if (response.status === 201 || response.status === 200) {
                    // Stockage des tokens dans AsyncStorage (comme dans SignInScreen)
                    await AsyncStorage.setItem('token', response.data.access_token);
                    await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
                    await AsyncStorage.setItem('expires_at', String(response.data.expires_in));
                    await AsyncStorage.setItem('token_type', response.data.token_type);
                    await AsyncStorage.setItem('user_id', response.data.user.id);

                    // Affiche le message de succès
                    Alert.alert(
                        'Succès !',
                        'Votre inscription a été effectuée avec succès.',
                        [
                            {
                                text: 'Fermer',
                                onPress: () => {
                                    // Redirection vers l'écran de profil après fermeture de l'alert
                                    onSignUp({
                                        name: `${formData.firstName} ${formData.lastName}`,
                                        email: formData.email,
                                        password: formData.password,
                                    });
                                }
                            }
                        ],
                        // Options pour gérer la fermeture de l'alert (bouton retour Android, etc.)
                        {
                            cancelable: true, onDismiss: () => {
                                // Redirection même si l'alert est fermée autrement que par le bouton OK
                                onSignUp({
                                    name: `${formData.firstName} ${formData.lastName}`,
                                    email: formData.email,
                                    password: formData.password,
                                });
                            }
                        }
                    );
                } else {
                    // Gestion des autres codes de statut
                    const errorMessage = response.data?.message || 'Une erreur est survenue lors de l\'inscription';
                    Alert.alert('Attention !', errorMessage);
                    setIsLoading(false);
                    return;
                }
            } catch (error: any) {

                console.error('Erreur lors de l\'inscription : ', error);

                // Gestion des erreurs de validation ou autres erreurs de l'API
                let errorMessage = 'Une erreur est survenue lors de l\'inscription, veuillez vérifier vos informations et réessayer.';

                if (error.response) {
                    // Erreur avec réponse de l'API
                    const apiError = error.response.data;
                    if (apiError.message) {
                        errorMessage = apiError.message;
                    } else if (apiError.error) {
                        errorMessage = apiError.error;
                    } else if (typeof apiError === 'string') {
                        errorMessage = apiError;
                    }
                    console.log('Erreur API : ', apiError);
                } else if (error.request) {
                    // Requête envoyée mais pas de réponse
                    errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
                }

                Alert.alert('Attention !', errorMessage);
                setIsLoading(false);
                return;
            } finally {
                setIsLoading(false);
            }
        }
    };


    /**
     * Ouvre le bottom sheet pour la civilité
     */
    const handleOpenCivilityPicker = () => {
        setShowCivilityPicker(true);
    };

    /**
     * Gère la sélection de la civilité
     */
    const handleSelectCivility = (value: string) => {
        updateField('civility', value);
        setShowCivilityPicker(false);
    };

    /**
     * Gère le changement de date de naissance
     */
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            updateField('dateOfBirth', selectedDate);
        }
    };

    const selectedCivility = civilityOptions.find(opt => opt.value === formData.civility);


    return (
        <>
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: scrollBackgroundColor }}>
                    <ActivityIndicator size="large" color={loadingIndicatorColor} />
                </View>
            ) : (
                <ScrollView
                    style={[styles.container, { backgroundColor: scrollBackgroundColor }]}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >

                    <View style={[styles.header, { paddingTop: insets.top }]}>
                        <Text style={[styles.title, { color: textColor }]}>Inscription</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            Créez un compte ou connectez-vous pour explorer notre application.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Section 1: Informations personnelles */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Informations personnelles</Text>
                            
                            {/* Prénom */}
                            <View>
                                {touchedFields.has('firstName') && errors.firstName && (
                                    <Text style={styles.errorText}>{errors.firstName}</Text>
                                )}
                                <AuthFormField
                                    label="Prénom"
                                    value={formData.firstName}
                                    onChangeText={(text) => updateField('firstName', text)}
                                    onBlur={() => handleFieldBlur('firstName')}
                                    placeholder="Votre prénom"
                                    required
                                />
                            </View>

                            {/* Nom */}
                            <View>
                                {touchedFields.has('lastName') && errors.lastName && (
                                    <Text style={styles.errorText}>{errors.lastName}</Text>
                                )}
                                <AuthFormField
                                    label="Nom"
                                    value={formData.lastName}
                                    onChangeText={(text) => updateField('lastName', text)}
                                    onBlur={() => handleFieldBlur('lastName')}
                                    placeholder="Votre nom"
                                    required
                                />
                            </View>

                            {/* Nom d'utilisateur */}
                            <View>
                                {touchedFields.has('username') && errors.username && (
                                    <Text style={styles.errorText}>{errors.username}</Text>
                                )}
                                <AuthFormField
                                    label="Nom d'utilisateur"
                                    value={formData.username}
                                    onChangeText={(text) => updateField('username', text)}
                                    onBlur={() => handleFieldBlur('username')}
                                    placeholder="Votre nom d'utilisateur"
                                    required
                                />
                            </View>

                            {/* Date de naissance */}
                            <View style={styles.formField}>
                                {touchedFields.has('dateOfBirth') && errors.dateOfBirth && (
                                    <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                                )}
                                <Text style={[styles.formLabel, { color: textColor }]}>
                                    Date de naissance <Text style={styles.required}>*</Text>
                                </Text>
                                <Pressable
                                    style={[
                                        styles.dateInput,
                                        {
                                            backgroundColor: inputBackgroundColor,
                                            borderColor: errors.dateOfBirth && touchedFields.has('dateOfBirth') 
                                                ? '#FF0000' 
                                                : inputBorderColor
                                        }
                                    ]}
                                    onPress={() => {
                                        setShowDatePicker(true);
                                        markFieldAsTouched('dateOfBirth');
                                    }}
                                >
                                    <Text style={[
                                        styles.dateInputText,
                                        { color: formData.dateOfBirth ? textColor : placeholderColor }
                                    ]}>
                                        {formData.dateOfBirth ? formatDateOfBirth() : 'jj / mm / aaaa'}
                                    </Text>
                                    <MaterialCommunityIcons name="calendar" size={20} color={placeholderColor} />
                                </Pressable>
                            </View>

                            {/* Civilité */}
                            <View style={styles.formField}>
                                {touchedFields.has('civility') && errors.civility && (
                                    <Text style={styles.errorText}>{errors.civility}</Text>
                                )}
                                <Text style={[styles.formLabel, { color: textColor }]}>
                                    Civilité <Text style={styles.required}>*</Text>
                                </Text>
                                <Pressable
                                    style={[
                                        styles.selectInput,
                                        {
                                            backgroundColor: inputBackgroundColor,
                                            borderColor: errors.civility && touchedFields.has('civility')
                                                ? '#FF0000'
                                                : inputBorderColor
                                        }
                                    ]}
                                    onPress={() => {
                                        handleOpenCivilityPicker();
                                        markFieldAsTouched('civility');
                                    }}
                                >
                                    <Text style={[
                                        styles.selectText,
                                        { color: formData.civility ? textColor : placeholderColor }
                                    ]}>
                                        {selectedCivility ? selectedCivility.label : ''}
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color={iconColor} />
                                </Pressable>
                            </View>
                        </View>

                        {/* Section 2: Informations de connexion */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Informations de connexion</Text>
                            {/* Email */}
                            <View>
                                {touchedFields.has('email') && errors.email && (
                                    <Text style={styles.errorText}>{errors.email}</Text>
                                )}
                                <AuthFormField
                                    label="Adresse email"
                                    value={formData.email}
                                    onChangeText={(text) => updateField('email', text)}
                                    onBlur={() => handleFieldBlur('email')}
                                    placeholder="votre@email.com"
                                    keyboardType="email-address"
                                    required
                                />
                            </View>

                            {/* Téléphone */}
                            <View>
                                {touchedFields.has('phone') && errors.phone && (
                                    <Text style={styles.errorText}>{errors.phone}</Text>
                                )}
                                <AuthFormField
                                    label="Numéro de téléphone"
                                    value={formData.phone}
                                    onChangeText={(text) => updateField('phone', text)}
                                    onBlur={() => handleFieldBlur('phone')}
                                    placeholder="Ex: 0123456789"
                                    keyboardType="phone-pad"
                                    required
                                />
                            </View>

                            {/* Mot de passe */}
                            <View>
                                {touchedFields.has('password') && errors.password && (
                                    <Text style={styles.errorText}>{errors.password}</Text>
                                )}
                                <PasswordField
                                    label="Mot de passe"
                                    value={formData.password}
                                    onChangeText={(text) => updateField('password', text)}
                                    onBlur={() => handleFieldBlur('password')}
                                    placeholder="Entrez votre mot de passe"
                                    required
                                />
                            </View>

                            {/* Confirmer le mot de passe */}
                            <View>
                                {touchedFields.has('confirmPassword') && errors.confirmPassword && (
                                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                                )}
                                <PasswordField
                                    label="Confirmer le mot de passe"
                                    value={formData.confirmPassword}
                                    onChangeText={(text) => updateField('confirmPassword', text)}
                                    onBlur={() => handleFieldBlur('confirmPassword')}
                                    placeholder="Confirmer le mot de passe"
                                    required
                                />
                            </View>
                        </View>

                        {/* Section 3: Contact d'urgence */}
                        <View style={[styles.sectionCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Contact d'urgence (optionnel)</Text>

                            {/* Contact d'urgence - Prénom */}
                            <View>
                                <AuthFormField
                                    label="Prénom(s) du contact urgent"
                                    value={formData.emergencyContactFirstName}
                                    onChangeText={(text) => updateField('emergencyContactFirstName', text)}
                                    onBlur={() => handleFieldBlur('emergencyContactFirstName')}
                                    placeholder="Prénom du contact urgent"
                                />
                            </View>

                            {/* Contact d'urgence - Nom */}
                            <View>
                                <AuthFormField
                                    label="Nom du contact urgent"
                                    value={formData.emergencyContactLastName}
                                    onChangeText={(text) => updateField('emergencyContactLastName', text)}
                                    onBlur={() => handleFieldBlur('emergencyContactLastName')}
                                    placeholder="Nom(s) du contact urgent"
                                />
                            </View>

                            {/* Contact d'urgence - Téléphone */}
                            <View>
                                <AuthFormField
                                    label="Numéro de téléphone du contact urgent"
                                    value={formData.emergencyContactPhone}
                                    onChangeText={(text) => updateField('emergencyContactPhone', text)}
                                    onBlur={() => handleFieldBlur('emergencyContactPhone')}
                                    placeholder="Ex: 0123456789"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {/* Checkbox conditions d'utilisation */}
                        <View style={styles.checkboxContainer}>
                            {touchedFields.has('agreeToTerms') && errors.agreeToTerms && (
                                <Text style={styles.errorText}>{errors.agreeToTerms}</Text>
                            )}
                            <Checkbox
                                label="J'accepte les conditions d'utilisation et la politique de confidentialité"
                                checked={formData.agreeToTerms}
                                onToggle={() => {
                                    updateField('agreeToTerms', !formData.agreeToTerms);
                                    markFieldAsTouched('agreeToTerms');
                                }}
                            />
                        </View>
                    </View>

                    <Pressable style={styles.primaryButton} onPress={handleSignUp}>
                        <Text style={styles.primaryButtonText}>Inscription</Text>
                    </Pressable>

                    <View style={styles.separator}>
                        <View style={[styles.separatorLine, { backgroundColor: separatorLineColor }]} />
                        <Text style={[styles.separatorText, { color: secondaryTextColor }]}>OU</Text>
                        <View style={[styles.separatorLine, { backgroundColor: separatorLineColor }]} />
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: secondaryTextColor }]}>Vous avez déjà un compte? </Text>
                        <Pressable onPress={onSwitchToSignIn}>
                            <Text style={[styles.footerLink, { color: linkColor }]}>Se connecter</Text>
                        </Pressable>
                    </View>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <>
                            {Platform.OS === 'ios' && (
                                <Modal
                                    visible={showDatePicker}
                                    transparent={true}
                                    animationType="slide"
                                    onRequestClose={() => setShowDatePicker(false)}
                                >
                                    <Pressable
                                        style={styles.modalOverlay}
                                        onPress={() => setShowDatePicker(false)}
                                    >
                                        <View
                                            style={[
                                                styles.datePickerContainer,
                                                {
                                                    backgroundColor: modalBackgroundColor,
                                                    paddingBottom: insets.bottom + 20
                                                }
                                            ]}
                                            onStartShouldSetResponder={() => true}
                                        >
                                            <View style={[styles.datePickerHeader, { borderBottomColor: modalBorderColor }]}>
                                                <Text style={[styles.datePickerTitle, { color: textColor }]}>Date de naissance</Text>
                                                <Pressable onPress={() => setShowDatePicker(false)}>
                                                    <MaterialCommunityIcons name="close" size={24} color={iconColor} />
                                                </Pressable>
                                            </View>
                                            <View style={styles.datePickerContent}>
                                                <DateTimePicker
                                                    value={formData.dateOfBirth || new Date()}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={handleDateChange}
                                                    maximumDate={new Date()}
                                                    locale="fr-FR"
                                                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                                />
                                            </View>
                                        </View>
                                    </Pressable>
                                </Modal>
                            )}
                            {Platform.OS === 'android' && (
                                <DateTimePicker
                                    value={formData.dateOfBirth || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                />
                            )}
                        </>
                    )}

                    {/* Civilité Bottom Sheet */}
                    <SelectionBottomSheet
                        visible={showCivilityPicker}
                        title="Civilité"
                        options={civilityOptions}
                        currentValue={formData.civility}
                        onSelect={handleSelectCivility}
                        onClose={() => setShowCivilityPicker(false)}
                    />
                </ScrollView>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
    form: {
        marginBottom: 24,
    },
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    dateInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    dateInputText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    selectInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#FF0000',
        marginTop: 4,
        // marginLeft: 4,
    },
    checkboxContainer: {
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 4,
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
    },
    separatorText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
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
    },
    footerLink: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    datePickerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    datePickerContent: {
        height: 216,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 20,
    },
});

