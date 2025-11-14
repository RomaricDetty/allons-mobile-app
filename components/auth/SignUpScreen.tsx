//@ts-nocheck
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
     * Met à jour un champ du formulaire
     */
    const updateField = (field: keyof SignUpFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Efface l'erreur du champ modifié
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
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

        // Validation des champs obligatoires
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Ce champ est requis';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Ce champ est requis';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Ce champ est requis';
        }

        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Ce champ est requis';
        }

        if (!formData.civility) {
            newErrors.civility = 'Ce champ est requis';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Ce champ est requis';
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = 'Format d\'email invalide';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Ce champ est requis';
        } else if (!isValidPhone(formData.phone)) {
            newErrors.phone = 'Format de téléphone invalide (Ex: 0123456789)';
        }

        if (!formData.password) {
            newErrors.password = 'Ce champ est requis';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Ce champ est requis';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1776ba" />
                </View>
            ) : (
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >

                    <View style={[styles.header, { paddingTop: insets.top }]}>
                        <Text style={styles.title}>Inscription</Text>
                        <Text style={styles.subtitle}>
                            Créez un compte ou connectez-vous pour explorer notre application.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Prénom */}
                        <View>
                            <AuthFormField
                                label="Prénom"
                                value={formData.firstName}
                                onChangeText={(text) => updateField('firstName', text)}
                                placeholder="Votre prénom"
                                required
                            />
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                        </View>

                        {/* Nom */}
                        <View>
                            <AuthFormField
                                label="Nom"
                                value={formData.lastName}
                                onChangeText={(text) => updateField('lastName', text)}
                                placeholder="Votre nom"
                                required
                            />
                            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                        </View>

                        {/* Nom d'utilisateur */}
                        <View>
                            <AuthFormField
                                label="Nom d'utilisateur"
                                value={formData.username}
                                onChangeText={(text) => updateField('username', text)}
                                placeholder="Votre nom d'utilisateur"
                                required
                            />
                            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                        </View>

                        {/* Date de naissance */}
                        <View style={styles.formField}>
                            <Text style={styles.formLabel}>
                                Date de naissance <Text style={styles.required}>*</Text>
                            </Text>
                            <Pressable
                                style={styles.dateInput}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={[styles.dateInputText, !formData.dateOfBirth && styles.placeholder]}>
                                    {formData.dateOfBirth ? formatDateOfBirth() : 'jj / mm / aaaa'}
                                </Text>
                                <MaterialCommunityIcons name="calendar" size={20} color="#A6A6AA" />
                            </Pressable>
                            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
                        </View>

                        {/* Civilité */}
                        <View style={styles.formField}>
                            <Text style={styles.formLabel}>
                                Civilité <Text style={styles.required}>*</Text>
                            </Text>
                            <Pressable style={styles.selectInput} onPress={handleOpenCivilityPicker}>
                                <Text style={[styles.selectText, !formData.civility && styles.selectPlaceholder]}>
                                    {selectedCivility ? selectedCivility.label : ''}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                            </Pressable>
                            {errors.civility && <Text style={styles.errorText}>{errors.civility}</Text>}
                        </View>

                        {/* Email */}
                        <View>
                            <AuthFormField
                                label="Adresse email"
                                value={formData.email}
                                onChangeText={(text) => updateField('email', text)}
                                placeholder="votre@email.com"
                                keyboardType="email-address"
                                required
                            />
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Téléphone */}
                        <View>
                            <AuthFormField
                                label="Numéro de téléphone"
                                value={formData.phone}
                                onChangeText={(text) => updateField('phone', text)}
                                placeholder="Ex: 0123456789"
                                keyboardType="phone-pad"
                                required
                            />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>

                        {/* Mot de passe */}
                        <View>
                            <PasswordField
                                label="Mot de passe"
                                value={formData.password}
                                onChangeText={(text) => updateField('password', text)}
                                placeholder="Entrez votre mot de passe"
                                required
                            />
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        {/* Confirmer le mot de passe */}
                        <View>
                            <PasswordField
                                label="Confirmer le mot de passe"
                                value={formData.confirmPassword}
                                onChangeText={(text) => updateField('confirmPassword', text)}
                                placeholder="Confirmer le mot de passe"
                                required
                            />
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>

                        {/* Contact d'urgence - Prénom */}
                        <AuthFormField
                            label="Prénom(s) du contact urgent"
                            value={formData.emergencyContactFirstName}
                            onChangeText={(text) => updateField('emergencyContactFirstName', text)}
                            placeholder="Prénom du contact urgent"
                        />

                        {/* Contact d'urgence - Nom */}
                        <AuthFormField
                            label="Nom du contact urgent"
                            value={formData.emergencyContactLastName}
                            onChangeText={(text) => updateField('emergencyContactLastName', text)}
                            placeholder="Nom(s) du contact urgent"
                        />

                        {/* Contact d'urgence - Téléphone */}
                        <AuthFormField
                            label="Numéro de téléphone du contact urgent"
                            value={formData.emergencyContactPhone}
                            onChangeText={(text) => updateField('emergencyContactPhone', text)}
                            placeholder="Ex: 0123456789"
                            keyboardType="phone-pad"
                        />

                        {/* Checkbox conditions d'utilisation */}
                        <View style={styles.checkboxContainer}>
                            <Checkbox
                                label="J'accepte les conditions d'utilisation et la politique de confidentialité"
                                checked={formData.agreeToTerms}
                                onToggle={() => updateField('agreeToTerms', !formData.agreeToTerms)}
                            />
                            {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}
                        </View>
                    </View>

                    <Pressable style={styles.primaryButton} onPress={handleSignUp}>
                        <Text style={styles.primaryButtonText}>Inscription</Text>
                    </Pressable>

                    <View style={styles.separator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>OU</Text>
                        <View style={styles.separatorLine} />
                    </View>


                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Vous avez déjà un compte? </Text>
                        <Pressable onPress={onSwitchToSignIn}>
                            <Text style={styles.footerLink}>Se connecter</Text>
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
                                        <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                                            <View style={styles.datePickerHeader}>
                                                <Text style={styles.datePickerTitle}>Date de naissance</Text>
                                                <Pressable onPress={() => setShowDatePicker(false)}>
                                                    <MaterialCommunityIcons name="close" size={24} color="#000" />
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
                                                    themeVariant="light"
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
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
    },
    dateInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateInputText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    placeholder: {
        color: '#A6A6AA',
    },
    selectInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    selectPlaceholder: {
        color: '#A6A6AA',
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#FF0000',
        marginTop: 4,
        marginLeft: 4,
    },
    checkboxContainer: {
        marginTop: 8,
        marginBottom: 8,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    datePickerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    datePickerContent: {
        height: 216,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
});

