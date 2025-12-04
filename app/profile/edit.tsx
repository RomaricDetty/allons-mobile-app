// @ts-nocheck
import { authGetUserInfo, updateUserInfo } from '@/api/auth_register';
import { FormField } from '@/components/passengers/FormField';
import { PhoneField } from '@/components/passengers/PhoneField';
import { SectionHeader } from '@/components/passengers/SectionHeader';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { User } from '@/interfaces';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran de modification des informations du profil utilisateur
 */
export default function EditProfileScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const inputBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#F3F3F7';
    const placeholderColor = colorScheme === 'dark' ? '#9BA1A6' : '#A6A6AA';
    const disabledInputBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5';
    const disabledInputTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const sectionBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7';
    const modalBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const modalBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const datePickerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const loadingIndicatorColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // États pour les champs du formulaire
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        phone: '',
        street: '',
        city: '',
        postalCode: '',
        emergencyContactFirstName: '',
        emergencyContactName: '',
        emergencyContactFullName: '',
        emergencyContactPhone: '',
    });

    /**
     * Formate une date pour l'affichage dans le champ (DD/MM/YYYY)
     */
    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return '';
        }
    };

    /**
     * Récupère les informations de l'utilisateur
     */
    const getUserInfo = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('user_id');
            const response = await authGetUserInfo(userId, token);
            if (response.status === 200) {
                return response.data;
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations');
                return null;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des informations:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des informations');
            return null;
        }
    };

    /**
     * Initialise les données du formulaire avec les informations de l'utilisateur
     */
    useEffect(() => {
        const loadUserData = async () => {
            setIsLoading(true);
            try {
                const userData = await getUserInfo();
                if (userData) {
                    setUser(userData);
                    
                    // Extraire le numéro de téléphone (sans le code pays)
                    let phoneNumber = userData.phones?.[0]?.digits || '';
                    if (phoneNumber.startsWith('+225')) {
                        phoneNumber = phoneNumber.replace('+225', '');
                    }
                    
                    // Extraire la rue et la ville de l'adresse si elle existe
                    // Le format de address est un objet : { city: "Abidjan", country: { id, name } }
                    const street = ''; // La rue n'est pas disponible dans le format actuel
                    const city = typeof userData.address === 'object' && userData.address !== null
                        ? userData.address.city || ''
                        : '';
                    
                    // Extraire le numéro du contact d'urgence (sans le code pays)
                    let emergencyPhone = userData.contactUrgent?.phone || '';
                    if (emergencyPhone.startsWith('+225')) {
                        emergencyPhone = emergencyPhone.replace('+225', '');
                    }
                    
                    // Extraire le nom et prénom du contact d'urgence depuis fullName
                    const fullName = userData.contactUrgent?.fullName || '';
                    let emergencyFirstName = '';
                    let emergencyLastName = '';
                    if (fullName.trim()) {
                        const firstSpaceIndex = fullName.indexOf(' ');
                        if (firstSpaceIndex !== -1) {
                            emergencyFirstName = fullName.substring(0, firstSpaceIndex).trim();
                            emergencyLastName = fullName.substring(firstSpaceIndex + 1).trim();
                        } else {
                            emergencyFirstName = fullName.trim();
                        }
                    }
                    
                    setFormData({
                        firstName: userData.firstName || '',
                        lastName: userData.lastName || '',
                        email: userData.email || '',
                        dateOfBirth: userData.dateOfBirth ? formatDateForInput(userData.dateOfBirth) : '',
                        phone: phoneNumber,
                        street: street,
                        city: city,
                        postalCode: '', // Non disponible dans l'interface User actuelle
                        emergencyContactFirstName: emergencyFirstName,
                        emergencyContactName: emergencyLastName,
                        emergencyContactFullName: fullName,
                        emergencyContactPhone: emergencyPhone,
                    });
                }
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadUserData();
    }, []);

    /**
     * Formate une date pour l'API (ISO string)
     */
    const formatDateForAPI = (dateString: string): string => {
        if (!dateString) return '';
        try {
            const [day, month, year] = dateString.split('/');
            if (!day || !month || !year) return '';
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (isNaN(date.getTime())) return '';
            return date.toISOString();
        } catch {
            return '';
        }
    };

    /**
     * Gère le changement de date
     */
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const year = selectedDate.getFullYear();
            setFormData((prev) => ({
                ...prev,
                dateOfBirth: `${day}/${month}/${year}`,
            }));
        }
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
    };

    /**
     * Valide le formulaire
     */
    const validateForm = (): boolean => {
        if (!formData.firstName.trim()) {
            Alert.alert('Erreur', 'Le prénom est requis');
            return false;
        }
        if (!formData.lastName.trim()) {
            Alert.alert('Erreur', 'Le nom est requis');
            return false;
        }
        if (!formData.email.trim()) {
            Alert.alert('Erreur', 'L\'email est requis');
            return false;
        }
        if (!formData.dateOfBirth.trim()) {
            Alert.alert('Erreur', 'La date de naissance est requise');
            return false;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Erreur', 'Le téléphone est requis');
            return false;
        }
        return true;
    };

    /**
     * Sauvegarde les modifications
     */
    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('user_id');
            
            // Construire l'objet utilisateur mis à jour
            const updatedUser: Partial<User> = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                dateOfBirth: formatDateForAPI(formData.dateOfBirth),
                phones: [
                    {
                        type: 'mobile',
                        digits: formData.phone.trim(),
                    },
                ],
                address: formData.city.trim()
                    ? {
                        city: formData.city.trim(),
                        country: user?.address?.country || {}
                    }
                    : user?.address || null,
                contactUrgent: {
                    fullName: formData.emergencyContactFirstName.trim() + ' ' + formData.emergencyContactName.trim(),
                    phone: `+225${formData.emergencyContactPhone.trim()}`,
                },
            };

            const response = await updateUserInfo(userId as string, updatedUser as any, token as string);
            if (response.status === 200) {
                Alert.alert('Succès', 'Les informations ont été mises à jour avec succès', [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]);
            } else {
                throw new Error('Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
        } finally {
            setIsSaving(false);
        }
    };

    // Date actuelle pour le date picker
    const currentDate = (() => {
        if (!formData.dateOfBirth) {
            const defaultDate = new Date();
            defaultDate.setFullYear(defaultDate.getFullYear() - 25);
            return defaultDate;
        }
        try {
            const [day, month, year] = formData.dateOfBirth.split('/');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (isNaN(date.getTime())) {
                const defaultDate = new Date();
                defaultDate.setFullYear(defaultDate.getFullYear() - 25);
                return defaultDate;
            }
            return date;
        } catch {
            const defaultDate = new Date();
            defaultDate.setFullYear(defaultDate.getFullYear() - 25);
            return defaultDate;
        }
    })();

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: scrollBackgroundColor }]}>
                <ActivityIndicator size="large" color={loadingIndicatorColor} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={25} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>Modifier mes informations</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom, 20) },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Carte principale */}
                    <View style={[styles.mainCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                        {/* Section 1 : Informations personnelles */}
                        <View style={[styles.section, { borderBottomColor: sectionBorderColor }]}>
                            <SectionHeader number={1} title="Informations personnelles" />

                            <FormField
                                label="Prénom"
                                value={formData.firstName}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, firstName: text }))
                                }
                                placeholder="Votre prénom"
                            />

                            <FormField
                                label="Nom"
                                value={formData.lastName}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, lastName: text }))
                                }
                                placeholder="Votre nom"
                            />

                            <FormField
                                label="Email"
                                value={formData.email}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, email: text }))
                                }
                                placeholder="Votre email"
                                keyboardType="email-address"
                            />

                            <PhoneField
                                label="Téléphone"
                                value={formData.phone}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, phone: text }))
                                }
                            />

                            <View style={styles.formField}>
                                <Text style={[styles.formLabel, { color: textColor }]}>Date de naissance</Text>
                                <Pressable
                                    style={[
                                        styles.dateInput,
                                        {
                                            backgroundColor: inputBackgroundColor,
                                            borderColor: borderColor
                                        }
                                    ]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dateInputText,
                                            { color: formData.dateOfBirth ? textColor : placeholderColor },
                                        ]}
                                    >
                                        {formData.dateOfBirth || 'jj/mm/aaaa'}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="calendar"
                                        size={20}
                                        color={placeholderColor}
                                    />
                                </Pressable>
                            </View>

                            <View style={styles.formField}>
                                <Text style={[styles.formLabel, { color: textColor }]}>Pays</Text>
                                <View style={[
                                    styles.disabledInput,
                                    {
                                        backgroundColor: disabledInputBackgroundColor,
                                        borderColor: borderColor
                                    }
                                ]}>
                                    <Text style={[styles.disabledInputText, { color: disabledInputTextColor }]}>
                                        Côte d'Ivoire
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Section 2 : Adresse */}
                        <View style={[styles.section, { borderBottomColor: sectionBorderColor }]}>
                            <SectionHeader number={2} title="Adresse" />

                            <FormField
                                label="Rue"
                                value={formData.street}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, street: text }))
                                }
                                placeholder="Votre rue"
                            />

                            <FormField
                                label="Ville"
                                value={formData.city}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, city: text }))
                                }
                                placeholder="Votre ville"
                            />

                            <FormField
                                label="Code postal"
                                value={formData.postalCode}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({ ...prev, postalCode: text }))
                                }
                                placeholder="Votre code postal"
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Section 3 : Contact d'urgence */}
                        <View style={styles.sectionLast}>
                            <SectionHeader number={3} title="Contact d'urgence" />

                            {/* <FormField
                                label="Nom complet du contact d'urgence"
                                value={formData.emergencyContactFullName}
                                onChangeText={(text) => {
                                    // Split sur le premier espace trouvé
                                    const firstSpaceIndex = text.indexOf(' ');
                                    let firstName = '';
                                    let lastName = '';
                                    
                                    if (firstSpaceIndex !== -1) {
                                        // Si un espace est trouvé, première partie = prénom, reste = nom
                                        firstName = text.substring(0, firstSpaceIndex).trim();
                                        lastName = text.substring(firstSpaceIndex + 1).trim();
                                    } else {
                                        // Si pas d'espace, tout va dans le prénom
                                        firstName = text.trim();
                                    }
                                    
                                    setFormData((prev) => ({
                                        ...prev,
                                        emergencyContactFullName: text,
                                        emergencyContactFirstName: firstName,
                                        emergencyContactName: lastName,
                                    }));
                                }}
                                placeholder="Prénom Nom du contact urgent"
                            /> */}

                            <FormField
                                label="Prénom du contact d'urgence"
                                value={formData.emergencyContactFirstName}
                                placeholder="Prénom du contact d'urgence"
                                onChangeText={(text) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        emergencyContactFirstName: text,
                                    }))
                                }
                            />

                            <FormField
                                label="Nom du contact d'urgence"
                                value={formData.emergencyContactName}
                                placeholder="Nom du contact d'urgence"
                                onChangeText={(text) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        emergencyContactName: text,
                                    }))
                                }
                            />

                            <PhoneField
                                label="Numéro de téléphone du contact d'urgence"
                                value={formData.emergencyContactPhone}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        emergencyContactPhone: text,
                                    }))
                                }
                            />
                        </View>
                    </View>

                    {/* Bouton de sauvegarde */}
                    <Pressable
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Enregistrer</Text>
                            </>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal pour iOS */}
            {Platform.OS === 'ios' && showDatePicker && (
                <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <Pressable
                        style={styles.datePickerOverlay}
                        onPress={() => setShowDatePicker(false)}
                    >
                        <View
                            style={[
                                styles.datePickerContainer,
                                {
                                    backgroundColor: datePickerBackgroundColor,
                                    paddingBottom: insets.bottom + 20
                                }
                            ]}
                            onStartShouldSetResponder={() => true}
                        >
                            <View style={[styles.datePickerHeader, { borderBottomColor: modalBorderColor }]}>
                                <Text style={[styles.datePickerTitle, { color: textColor }]}>Date de naissance</Text>
                                <Pressable onPress={() => setShowDatePicker(false)}>
                                    <MaterialCommunityIcons name="check" size={24} color={tintColor === '#fff' ? '#1776BA' : tintColor} />
                                </Pressable>
                            </View>
                            <View style={styles.datePickerContent}>
                                <DateTimePicker
                                    value={currentDate}
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

            {/* Date Picker pour Android */}
            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    mainCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    section: {
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
    },
    sectionLast: {
        marginBottom: 0,
        paddingBottom: 0,
    },
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 8,
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
    disabledInput: {
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
    },
    disabledInputText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    saveButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        marginBottom: 16,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    datePickerOverlay: {
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
        padding: 20,
    },
});

