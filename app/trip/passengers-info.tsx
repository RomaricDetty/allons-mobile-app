// @ts-nocheck
import { EmergencyContactBlock } from '@/components/passengers/EmergencyContactBlock';
import { ErrorModal } from '@/components/passengers/ErrorModal';
import { PassengersInfoBlock } from '@/components/passengers/PassengersInfoBlock';
import { PaymentMethodBlock } from '@/components/passengers/PaymentMethodBlock';
import { SelectionBottomSheet } from '@/components/passengers/SelectionBottomSheet';
import { SummaryBlock } from '@/components/passengers/SummaryBlock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SearchParams, Trip } from '@/types';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran de vérification et paiement (Étape 2 sur 3)
 * Permet de compléter les informations des passagers et sélectionner la méthode de paiement
 */
const PassengersInfo = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const progressBarBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const progressDotBackgroundColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';

    // Récupération des données passées en paramètre
    const { trip, searchParams } = (route.params as { trip?: Trip, searchParams?: SearchParams }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;

    // États pour les informations des passagers
    const [passengers, setPassengers] = useState(() => {
        const initial = [];
        for (let i = 0; i < numberOfPersons; i++) {
            initial.push({
                firstName: i === 0 ? '' : '',
                lastName: i === 0 ? '' : '',
                phone: i === 0 ? '' : '',
                seatNumber: null as number | null,
                passengerType: 'adult' as string, // Type de passager par défaut
            });
        }
        return initial;
    });

    // États pour les informations de contact
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    // États pour le contact d'urgence
    const [emergencyContact, setEmergencyContact] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        relation: ''
    });

    // État pour la méthode de paiement
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

    // État pour le bottom sheet de sélection
    const [showSelectionBottomSheet, setShowSelectionBottomSheet] = useState(false);
    const [selectionType, setSelectionType] = useState<'passengerType' | 'relation' | null>(null);
    const [selectionTitle, setSelectionTitle] = useState('');
    const [selectionOptions, setSelectionOptions] = useState<Array<{value: string, label: string}>>([]);
    const [currentSelectionValue, setCurrentSelectionValue] = useState<string>('');
    const [onSelectionCallback, setOnSelectionCallback] = useState<((value: string) => void) | null>(null);

    // État pour le modal d'erreur
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    if (!trip) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun trajet sélectionné</Text>
            </View>
        );
    }

    /**
     * Calcule le prix total pour tous les voyageurs
     */
    const totalPrice = useMemo(() => {
        return trip.price * numberOfPersons;
    }, [trip.price, numberOfPersons]);

    /**
     * Calcule les frais
     */
    const fees = 500;
    const taxes = 0;
    const totalAmount = totalPrice + fees + taxes;

    /**
     * Met à jour les informations d'un passager
     */
    const updatePassenger = (index: number, field: string, value: string | number) => {
        const updated = [...passengers];
        updated[index] = { ...updated[index], [field]: value };
        setPassengers(updated);
    };

    /**
     * Met à jour le contact d'urgence
     */
    const updateEmergencyContact = (field: string, value: string) => {
        setEmergencyContact(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Valide tous les champs requis du formulaire
     * @returns {Object|null} Objet contenant les erreurs ou null si tout est valide
     */
    const validateForm = () => {
        const errors: string[] = [];

        // Validation des passagers
        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';
            
            if (!passenger.firstName || passenger.firstName.trim() === '') {
                errors.push(`Le prénom du passager ${passengerNumber} est requis`);
            }
            
            if (!passenger.lastName || passenger.lastName.trim() === '') {
                errors.push(`Le nom du passager ${passengerNumber} est requis`);
            }
            
            if (!passenger.phone || passenger.phone.trim() === '') {
                errors.push(`Le téléphone du passager ${passengerNumber} est requis`);
            }
        });

        // Validation du type de passager pour chaque passager
        passengers.forEach((passenger, index) => {
            const passengerNumber = passengers.length > 1 ? ` ${index + 1}` : '';
            if (!passenger.passengerType || passenger.passengerType.trim() === '') {
                errors.push(`Le type de passager${passengerNumber} est requis`);
            }
        });

        // Validation du contact d'urgence
        if (!emergencyContact.firstName || emergencyContact.firstName.trim() === '') {
            errors.push('Le prénom du contact d\'urgence est requis');
        }
        
        if (!emergencyContact.lastName || emergencyContact.lastName.trim() === '') {
            errors.push('Le nom du contact d\'urgence est requis');
        }
        
        if (!emergencyContact.phone || emergencyContact.phone.trim() === '') {
            errors.push('Le téléphone du contact d\'urgence est requis');
        }
        
        if (!emergencyContact.relation || emergencyContact.relation.trim() === '') {
            errors.push('La relation avec le contact d\'urgence est requise');
        }

        // Validation de la méthode de paiement
        if (!selectedPaymentMethod) {
            errors.push('La méthode de paiement est requise');
        }

        return errors.length > 0 ? errors : null;
    };

    /**
     * Gère la soumission du formulaire
     */
    const handleConfirmAndPay = () => {
        // Validation des champs requis
        const validationErrors = validateForm();
        
        if (validationErrors) {
            console.warn('Erreurs de validation:', validationErrors);
            // setValidationErrors(validationErrors);
            // setShowErrorModal(true);
            Alert.alert('Attention !', "Veuillez remplir tous les champs requis");
            return;
        }

        // Préparation des données pour chaque passager
        const passengersData = passengers.map((passenger, index) => ({
            number: index + 1,
            isPrincipal: index === 0,
            firstName: passenger.firstName.trim(),
            lastName: passenger.lastName.trim(),
            phone: passenger.phone.trim(),
            passengerType: passenger.passengerType,
            seatNumber: passenger.seatNumber
        }));

        // Préparation des données complètes
        const formData = {
            passengers: passengersData,
            emergencyContact: {
                firstName: emergencyContact.firstName.trim(),
                lastName: emergencyContact.lastName.trim(),
                phone: emergencyContact.phone.trim(),
                email: emergencyContact.email.trim() || null,
                relation: emergencyContact.relation.trim()
            },
            payment: {
                method: selectedPaymentMethod
            },
            trip: {
                id: trip.id,
                departureCity: trip.departureCity,
                arrivalCity: trip.arrivalCity,
                price: trip.price,
                company: trip.company,
                companyId: trip.companyId,
            },
            summary: {
                numberOfPersons: numberOfPersons,
                totalPrice: totalPrice,
                fees: fees,
                taxes: taxes,
                totalAmount: totalAmount
            }
        };

        // Affichage des informations dans la console
        console.log('=== DONNÉES COMPLÈTES ===');
        console.log(JSON.stringify(formData, null, 2));

        // TODO: Procéder au paiement
    };

    /**
     * Ouvre le bottom sheet de sélection
     */
    const openSelectionBottomSheet = (
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{value: string, label: string}>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => {
        setSelectionType(type);
        setSelectionTitle(title);
        setSelectionOptions(options);
        setCurrentSelectionValue(currentValue);
        setOnSelectionCallback(() => onSelect);
        setShowSelectionBottomSheet(true);
    };

    /**
     * Ferme le bottom sheet de sélection
     */
    const closeSelectionBottomSheet = () => {
        setShowSelectionBottomSheet(false);
        setSelectionType(null);
        setSelectionTitle('');
        setSelectionOptions([]);
        setCurrentSelectionValue('');
        setOnSelectionCallback(null);
    };

    /**
     * Gère la sélection d'une valeur
     */
    const handleSelection = (value: string) => {
        if (onSelectionCallback) {
            onSelectionCallback(value);
        }
        closeSelectionBottomSheet();
    };


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
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>

                <View style={styles.routeBadge}>
                    <Text style={[styles.routeBadgeText, { color: tintColor }]}>
                        {trip.departureCity} <Icon name="chevron-right" size={15} color={tintColor} /> {trip.arrivalCity}
                    </Text>
                </View>

                <Text style={[styles.stepIndicator, { color: secondaryTextColor }]}>Étape 2 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={[styles.progressContainer, { backgroundColor: headerBackgroundColor }]}>
                <Text style={[styles.progressTitle, { color: textColor }]}>Vérifier et payer</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { backgroundColor: progressBarBackgroundColor }]}>
                        <View style={[styles.progressFill, { width: '67%', backgroundColor: tintColor }]} />
                    </View>
                    <Text style={[styles.progressText, { color: secondaryTextColor }]}>67%</Text>
                </View>
            </View>

            {/* Indicateurs de progression */}
            <View style={[styles.progressIndicators, { backgroundColor: headerBackgroundColor }]}>
                <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.progressDot, { backgroundColor: tintColor }]} />
                <View style={[styles.progressDot, { backgroundColor: progressDotBackgroundColor }]} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={[styles.mainTitle, { color: textColor }]}>Vérifier et payer</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        Complétez vos informations et procédez au paiement
                    </Text>
                </View>

                {/* Carte principale */}
                <View style={[styles.mainCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    {/* Section 1 : Informations du passager */}
                    <PassengersInfoBlock
                        passengers={passengers}
                        contactEmail={contactEmail}
                        onUpdatePassenger={updatePassenger}
                        onUpdateContactEmail={setContactEmail}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

                    {/* Section 2 : Contact d'urgence */}
                    <EmergencyContactBlock
                        emergencyContact={emergencyContact}
                        onUpdateEmergencyContact={updateEmergencyContact}
                        onOpenBottomSheet={openSelectionBottomSheet}
                    />

                    {/* Section 3 : Méthode de paiement */}
                    <PaymentMethodBlock
                        selectedPaymentMethod={selectedPaymentMethod}
                        onSelectPaymentMethod={setSelectedPaymentMethod}
                    />
                </View>

                {/* Récapitulatif */}
                <SummaryBlock
                    totalPrice={totalPrice}
                    taxes={taxes}
                    fees={fees}
                    totalAmount={totalAmount}
                />
            </ScrollView>

            {/* Bouton fixe en bas de l'écran */}
            <View style={[
                styles.fixedButtonContainer, 
                { 
                    paddingBottom: insets.bottom + 8, 
                    paddingTop: 15,
                    backgroundColor: headerBackgroundColor,
                    borderTopColor: headerBorderColor
                }
            ]}>
                <Pressable
                    style={[styles.confirmButton, { width: '60%', alignSelf: 'center' }]}
                    onPress={handleConfirmAndPay}
                >
                    <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
                </Pressable>
            </View>

            {/* Bottom sheet de sélection */}
            <SelectionBottomSheet
                visible={showSelectionBottomSheet}
                title={selectionTitle}
                options={selectionOptions}
                currentValue={currentSelectionValue}
                onSelect={handleSelection}
                onClose={closeSelectionBottomSheet}
            />

            {/* Modal d'erreur de validation */}
            <ErrorModal
                visible={showErrorModal}
                title="Attention !"
                errors={validationErrors}
                onClose={() => setShowErrorModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    routeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    routeBadgeText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 12,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 12,
    },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Espace pour le bouton fixe en bas
    },
    titleSection: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    mainCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    fixedButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    confirmButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});

export default PassengersInfo;