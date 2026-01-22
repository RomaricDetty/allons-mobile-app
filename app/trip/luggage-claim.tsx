// @ts-nocheck
import { createLuggageClaim } from '@/api/luggage';
import { FormField } from '@/components/passengers/FormField';
import { SelectionBottomSheet } from '@/components/passengers/SelectionBottomSheet';
import { TextAreaField } from '@/components/passengers/TextAreaField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Options pour le type de réclamation
 */
const CLAIM_TYPE_OPTIONS = [
    { value: 'LOST', label: 'Perdu ou volé' },
    { value: 'DAMAGED', label: 'Endommagé' },
    { value: 'DELAYED', label: 'Retardé' },
];

/**
 * Écran de création d'une réclamation pour un bagage
 */
const LuggageClaimScreen = () => {
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const luggageId = params.luggageId as string;

    const [claimForm, setClaimForm] = useState<{
        type: 'LOST' | 'DAMAGED' | 'DELAYED';
        description: string;
        photos: string[];
        metadata: {
            damageDescription: string;
            estimatedValue: number | null;
        };
    }>({
        type: 'LOST',
        description: '',
        photos: [],
        metadata: {
            damageDescription: '',
            estimatedValue: null,
        },
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBottomSheet, setShowBottomSheet] = useState(false);

    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');

    // Mémorisation des couleurs du thème
    const themeColors = useMemo(() => ({
        backgroundColor: colorScheme === 'dark' ? '#000000' : '#F5F5F5',
        headerBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        headerBorderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        cardBackgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
        secondaryTextColor: colorScheme === 'dark' ? '#9BA1A6' : '#666',
        primaryBlue: tintColor === '#fff' ? '#1776BA' : tintColor,
    }), [colorScheme, tintColor]);

    /**
     * Ouvre le bottom sheet de sélection
     */
    const handleOpenBottomSheet = useCallback(() => {
        setShowBottomSheet(true);
    }, []);

    /**
     * Ferme le bottom sheet de sélection
     */
    const handleCloseBottomSheet = useCallback(() => {
        setShowBottomSheet(false);
    }, []);

    /**
     * Gère la sélection du type de réclamation
     */
    const handleSelectClaimType = useCallback((value: string) => {
        setClaimForm(prev => ({
            ...prev,
            type: value as 'LOST' | 'DAMAGED' | 'DELAYED',
        }));
    }, []);

    /**
     * Valide le formulaire
     */
    const validateForm = useCallback((): boolean => {
        if (!claimForm.type) {
            Alert.alert('Erreur', 'Veuillez sélectionner un type de réclamation.');
            return false;
        }
        if (!claimForm.description.trim()) {
            Alert.alert('Erreur', 'Veuillez décrire le problème rencontré.');
            return false;
        }
        // Validation spécifique pour le type "Endommagé"
        if (claimForm.type === 'DAMAGED') {
            if (!claimForm.metadata.damageDescription.trim()) {
                Alert.alert('Erreur', 'Veuillez décrire les dommages subis par le bagage.');
                return false;
            }
            if (!claimForm.metadata.estimatedValue || claimForm.metadata.estimatedValue <= 0) {
                Alert.alert('Erreur', 'Veuillez renseigner la valeur estimée du bagage.');
                return false;
            }
        }
        return true;
    }, [claimForm]);

    /**
     * Soumet la réclamation
     */
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('Token non disponible');
            }

            // Préparation des données de réclamation
            const claimData: any = {
                type: claimForm.type,
                description: claimForm.description.trim(),
            };

            // Ajout des métadonnées si le type est "Endommagé"
            if (claimForm.type === 'DAMAGED') {
                claimData.metadata = {
                    damageDescription: claimForm.metadata.damageDescription.trim(),
                    estimatedValue: claimForm.metadata.estimatedValue,
                };
            }

            const response = await createLuggageClaim(
                luggageId,
                claimData,
                token
            );

            if (response.data) {
                Alert.alert(
                    'Succès',
                    'Votre réclamation a été enregistrée. Nous vous contacterons sous peu.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Erreur lors de la réclamation:', error);
            Alert.alert(
                'Erreur',
                error.response?.data?.message || 'Une erreur est survenue lors de la réclamation.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [luggageId, claimForm, validateForm]);

    /**
     * Gère l'annulation
     */
    const handleCancel = useCallback(() => {
        router.back();
    }, []);

    const selectedClaimType = CLAIM_TYPE_OPTIONS.find(option => option.value === claimForm.type);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: themeColors.headerBackgroundColor,
                        borderBottomColor: themeColors.headerBorderColor,
                    },
                ]}
            >
                <Pressable onPress={handleCancel} style={styles.closeButton}>
                    <Icon name="close" size={24} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Nouvelle réclamation
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Instructions */}
                <Text style={[styles.instructionText, { color: themeColors.secondaryTextColor }]}>
                    Remplissez le formulaire ci-dessous pour créer une réclamation
                </Text>

                {/* Formulaire */}
                <View style={[styles.formContainer, { backgroundColor: themeColors.cardBackgroundColor }]}>
                    {/* Champ Type de réclamation */}
                    <View style={styles.formField}>
                        <Text style={[styles.formLabel, { color: textColor }]}>
                            Type de réclamation
                        </Text>
                        <Pressable
                            style={[
                                styles.selectInput,
                                {
                                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5',
                                    borderColor: themeColors.borderColor,
                                },
                            ]}
                            onPress={handleOpenBottomSheet}
                        >
                            <Text
                                style={[
                                    styles.selectText,
                                    {
                                        color: claimForm.type ? textColor : themeColors.secondaryTextColor,
                                    },
                                ]}
                            >
                                {selectedClaimType ? selectedClaimType.label : 'Sélectionnez un type'}
                            </Text>
                            <Icon name="chevron-down" size={20} color={iconColor} />
                        </Pressable>
                    </View>

                    {/* Champ Description */}
                    <TextAreaField
                        label="Description du problème"
                        value={claimForm.description}
                        onChangeText={(text) => setClaimForm(prev => ({ ...prev, description: text }))}
                        placeholder="Décrivez en détail le problème rencontré avec votre bagage..."
                        required
                        numberOfLines={6}
                    />

                    {/* Champs supplémentaires pour le type "Endommagé" */}
                    {claimForm.type === 'DAMAGED' && (
                        <>
                            <TextAreaField
                                label="Description des dommages"
                                value={claimForm.metadata.damageDescription}
                                onChangeText={(text) => setClaimForm(prev => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, damageDescription: text }
                                }))}
                                placeholder="Décrivez en détail les dommages subis par votre bagage..."
                                required
                                numberOfLines={4}
                            />

                            <FormField
                                label="Valeur estimée du bagage"
                                value={claimForm.metadata.estimatedValue?.toString() || ''}
                                onChangeText={(text) => {
                                    const numericValue = text.replace(/[^0-9]/g, '');
                                    setClaimForm(prev => ({
                                        ...prev,
                                        metadata: {
                                            ...prev.metadata,
                                            estimatedValue: numericValue ? parseFloat(numericValue) : null
                                        }
                                    }));
                                }}
                                placeholder="Ex: 50000 (en FCFA)"
                                required
                                keyboardType="numeric"
                            />
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Boutons d'action */}
            <View
                style={[
                    styles.actionButtonsContainer,
                    {
                        backgroundColor: themeColors.headerBackgroundColor,
                        borderTopColor: themeColors.headerBorderColor,
                        paddingBottom: Math.max(insets.bottom, 16),
                    },
                ]}
            >
                <Pressable
                    style={[styles.cancelButton, { borderColor: themeColors.borderColor }]}
                    onPress={handleCancel}
                    disabled={isSubmitting}
                >
                    <Text style={[styles.cancelButtonText, { color: textColor }]}>Annuler</Text>
                </Pressable>

                <Pressable
                    style={[styles.submitButton, { backgroundColor: '#F44336' }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Soumettre</Text>
                    )}
                </Pressable>
            </View>

            {/* Bottom Sheet pour la sélection du type */}
            <SelectionBottomSheet
                visible={showBottomSheet}
                title="Type de réclamation"
                options={CLAIM_TYPE_OPTIONS}
                currentValue={claimForm.type}
                onSelect={handleSelectClaimType}
                onClose={handleCloseBottomSheet}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        flex: 1,
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    instructionText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 24,
        lineHeight: 20,
    },
    formContainer: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent',
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
    selectInput: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        flex: 1,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
    },
    submitButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});

export default LuggageClaimScreen;
