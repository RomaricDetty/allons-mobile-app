// @ts-nocheck
import { FormField } from '@/components/passengers/FormField';
import { PhoneField } from '@/components/passengers/PhoneField';
import { User } from '@/interfaces';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.1;
const MIN_TRANSLATE_Y = 0;

interface EditProfileBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (updatedUser: Partial<User>) => Promise<void>;
}

/**
 * Composant BottomSheet pour modifier les informations du profil utilisateur
 */
export const EditProfileBottomSheet = ({
    visible,
    onClose,
    user,
    onSave,
}: EditProfileBottomSheetProps) => {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue({ y: 0 });
    const opacity = useSharedValue(0);
    const [isLoading, setIsLoading] = useState(false);
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
     * Initialise les données du formulaire avec les informations de l'utilisateur
     */
    useEffect(() => {
        if (user && visible) {
            // Extraire le numéro de téléphone (sans le code pays)
            let phoneNumber = user.phones?.[0]?.digits || '';
            // Si le numéro contient +225, le retirer
            if (phoneNumber.startsWith('+225')) {
                phoneNumber = phoneNumber.replace('+225', '');
            }
            
            // Extraire la rue et la ville de l'adresse si elle existe
            const addressParts = user.address?.split(',') || [];
            const street = addressParts[0]?.trim() || '';
            const city = addressParts[1]?.trim() || '';
            
            // Extraire le numéro du contact d'urgence (sans le code pays)
            let emergencyPhone = user.contactUrgent?.phone || '';
            if (emergencyPhone.startsWith('+225')) {
                emergencyPhone = emergencyPhone.replace('+225', '');
            }
            
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                dateOfBirth: user.dateOfBirth ? formatDateForInput(user.dateOfBirth) : '',
                phone: phoneNumber,
                street: street,
                city: city,
                postalCode: '', // Non disponible dans l'interface User actuelle
                emergencyContactName: user.contactUrgent?.fullName?.split(' ')[0] || '',
                emergencyContactFullName: user.contactUrgent?.fullName || '',
                emergencyContactPhone: emergencyPhone,
            });
        }
    }, [user, visible]);

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
            setFormData(prev => ({
                ...prev,
                dateOfBirth: `${day}/${month}/${year}`,
            }));
        }
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
    };

    /**
     * Ferme le BottomSheet avec animation
     */
    const closeBottomSheet = () => {
        translateY.value = withSpring(SCREEN_HEIGHT, {
            damping: 15,
            stiffness: 120,
            mass: 0.3,
        });
        opacity.value = withTiming(0, { duration: 200 });
        setTimeout(() => {
            runOnJS(onClose)();
        }, 250);
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

        setIsLoading(true);
        try {
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
                address: formData.street.trim()
                    ? `${formData.street.trim()}${formData.city.trim() ? `, ${formData.city.trim()}` : ''}`
                    : user?.address || null,
                contactUrgent: {
                    fullName: formData.emergencyContactFullName.trim() || formData.emergencyContactName.trim(),
                    phone: `+225${formData.emergencyContactPhone.trim()}`,
                },
            };

            await onSave(updatedUser);
            closeBottomSheet();
            Alert.alert('Succès', 'Les informations ont été mises à jour avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Gère les gestes de glissement
     */
    const panGesture = Gesture.Pan()
        .activeOffsetY(10)
        .onStart(() => {
            context.y = translateY.value;
        })
        .onUpdate((event) => {
            translateY.value = Math.max(
                MIN_TRANSLATE_Y,
                Math.min(MAX_TRANSLATE_Y + event.translationY, SCREEN_HEIGHT)
            );
            if (translateY.value < MAX_TRANSLATE_Y) {
                translateY.value = MAX_TRANSLATE_Y;
            }
        })
        .onEnd((event) => {
            if (translateY.value > SCREEN_HEIGHT * 0.7) {
                translateY.value = withSpring(SCREEN_HEIGHT, {
                    damping: 15,
                    stiffness: 120,
                });
                opacity.value = withTiming(0, { duration: 200 });
                runOnJS(closeBottomSheet)();
            } else {
                translateY.value = withSpring(MAX_TRANSLATE_Y, {
                    damping: 15,
                    stiffness: 120,
                });
                opacity.value = withTiming(1, { duration: 200 });
            }
        });

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 200 });
            translateY.value = withSpring(MAX_TRANSLATE_Y, {
                damping: 15,
                stiffness: 120,
                mass: 0.3,
            });
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, {
                damping: 15,
                stiffness: 120,
            });
            opacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const bottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    if (!visible) return null;

    // Date actuelle pour le date picker
    const currentDate = (() => {
        if (!formData.dateOfBirth) {
            // Date par défaut : il y a 25 ans
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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={closeBottomSheet}
        >
            <GestureHandlerRootView style={styles.bottomSheetRootView}>
                <Pressable
                    activeOpacity={1}
                    style={styles.bottomSheetOverlay}
                    onPress={closeBottomSheet}
                >
                    <Animated.View style={[styles.bottomSheetOverlayAnimated, overlayStyle]} />
                </Pressable>

                <Animated.View style={[styles.bottomSheetContainer, bottomSheetStyle]}>
                    <GestureDetector gesture={panGesture}>
                        <View>
                            <View style={styles.bottomSheetHandle} />
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Modifier mes informations</Text>
                                <Pressable onPress={closeBottomSheet} style={styles.bottomSheetCloseButton}>
                                    <MaterialCommunityIcons name="close" size={24} color="#000" />
                                </Pressable>
                            </View>
                        </View>
                    </GestureDetector>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={0}
                        style={styles.keyboardView}
                    >
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={[
                                styles.scrollContent,
                                { paddingBottom: Math.max(insets.bottom, 20) },
                            ]}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            <View style={styles.formContainer}>
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
                                    <Text style={styles.formLabel}>Date de naissance</Text>
                                    <Pressable
                                        style={styles.dateInput}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateInputText,
                                                !formData.dateOfBirth && styles.placeholder,
                                            ]}
                                        >
                                            {formData.dateOfBirth || 'jj/mm/aaaa'}
                                        </Text>
                                        <MaterialCommunityIcons
                                            name="calendar"
                                            size={20}
                                            color="#A6A6AA"
                                        />
                                    </Pressable>
                                </View>

                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Pays</Text>
                                    <View style={styles.disabledInput}>
                                        <Text style={styles.disabledInputText}>Côte d'Ivoire</Text>
                                    </View>
                                </View>

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

                                <FormField
                                    label="Nom du contact d'urgence"
                                    value={formData.emergencyContactName}
                                    onChangeText={(text) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            emergencyContactName: text,
                                        }))
                                    }
                                    placeholder="Nom du contact urgent"
                                />

                                <FormField
                                    label="Nom complet du contact d'urgence"
                                    value={formData.emergencyContactFullName}
                                    onChangeText={(text) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            emergencyContactFullName: text,
                                        }))
                                    }
                                    placeholder="Nom complet du contact urgent"
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

                            {/* Bouton de sauvegarde */}
                            <Pressable
                                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
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
                </Animated.View>
            </GestureHandlerRootView>

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
                        <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Date de naissance</Text>
                                <Pressable onPress={() => setShowDatePicker(false)}>
                                    <MaterialCommunityIcons name="check" size={24} color="#1776BA" />
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
                                    themeVariant="light"
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
        </Modal>
    );
};

const styles = StyleSheet.create({
    bottomSheetRootView: {
        flex: 1,
    },
    bottomSheetOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bottomSheetOverlayAnimated: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: SCREEN_HEIGHT * 0.95,
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        flexDirection: 'column',
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CCCCCC',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    bottomSheetCloseButton: {
        padding: 5,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    formContainer: {
        flexDirection: 'column',
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
    dateInput: {
        backgroundColor: '#F3F3F7',
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
    disabledInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    disabledInputText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
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
        padding: 20,
    },
});

