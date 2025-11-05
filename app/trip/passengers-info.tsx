// @ts-nocheck
import { formatPrice } from '@/constants/functions';
import { SearchParams, Trip } from '@/types';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

    // Récupération des données passées en paramètre
    const { trip, searchParams } = (route.params as { trip?: Trip, searchParams?: SearchParams }) || {};
    const numberOfPersons = searchParams?.numberOfPersons || 1;

    // États pour les informations des passagers
    const [passengers, setPassengers] = useState(() => {
        const initial = [];
        for (let i = 0; i < numberOfPersons; i++) {
            initial.push({
                firstName: i === 0 ? 'Detty Romaric' : '',
                lastName: i === 0 ? 'GUEU' : '',
                phone: i === 0 ? '0757391917' : '',
                seatNumber: null as number | null, // Ajouter le numéro de siège
            });
        }
        return initial;
    });


    // États pour les informations de contact
    const [contactPhone, setContactPhone] = useState('0757391917');
    const [contactEmail, setContactEmail] = useState('dettyromaric@gmail.com');
    const [passengerType, setPassengerType] = useState('Adulte');

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
    const [selectionOptions, setSelectionOptions] = useState<string[]>([]);
    const [currentSelectionValue, setCurrentSelectionValue] = useState<string>('');
    const [onSelectionCallback, setOnSelectionCallback] = useState<((value: string) => void) | null>(null);

    if (!trip) {
        return (
            <View style={styles.container}>
                <Text>Erreur : Aucun trajet sélectionné</Text>
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
     * Gère la soumission du formulaire
     */
    const handleConfirmAndPay = () => {
        // TODO: Valider les champs et procéder au paiement
        console.log('Passagers:', passengers);
        console.log('Contact:', { contactPhone, contactEmail, passengerType });
        console.log('Contact d\'urgence:', emergencyContact);
        console.log('Méthode de paiement:', selectedPaymentMethod);
    };

    /**
     * Ouvre le bottom sheet de sélection
     */
    const openSelectionBottomSheet = (
        type: 'passengerType' | 'relation',
        title: string,
        options: string[],
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

    /**
     * Composant pour un champ de formulaire
     */
    const FormField = ({
        label,
        value,
        onChangeText,
        placeholder,
        required = false,
        keyboardType = 'default',
        editable = true
    }: {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        placeholder?: string;
        required?: boolean;
        keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
        editable?: boolean;
    }) => {
        return (
            <View style={styles.formField}>
                <Text style={styles.formLabel}>
                    {label} {required && <Text style={styles.required}>*</Text>}
                </Text>
                <TextInput
                    style={[styles.formInput, !editable && styles.formInputDisabled]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#A6A6AA"
                    keyboardType={keyboardType}
                    editable={editable}
                />
            </View>
        );
    };

    /**
     * Composant pour un champ téléphone avec code pays
     */
    const PhoneField = ({
        label,
        value,
        onChangeText,
        required = false
    }: {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        required?: boolean;
    }) => {
        return (
            <View style={styles.formField}>
                <Text style={styles.formLabel}>
                    {label} {required && <Text style={styles.required}>*</Text>}
                </Text>
                <View style={styles.phoneContainer}>
                    <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+225</Text>
                    </View>
                    <TextInput
                        style={styles.phoneInput}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder="XX XX XX XX"
                        placeholderTextColor="#A6A6AA"
                        keyboardType="numeric"
                    />
                </View>
            </View>
        );
    };

    /**
     * Composant pour un sélecteur (dropdown)
     */
    const SelectField = ({
        label,
        value,
        placeholder,
        required = false,
        selectionType,
        options,
        onSelect
    }: {
        label: string;
        value: string;
        placeholder: string;
        required?: boolean;
        selectionType: 'passengerType' | 'relation';
        options: string[];
        onSelect: (value: string) => void;
    }) => {
        const handlePress = () => {
            openSelectionBottomSheet(selectionType, label, options, value, onSelect);
        };

        return (
            <View style={styles.formField}>
                <Text style={styles.formLabel}>
                    {label} {required && <Text style={styles.required}>*</Text>}
                </Text>
                <Pressable style={styles.selectInput} onPress={handlePress}>
                    <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
                        {value || placeholder}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#666" />
                </Pressable>
            </View>
        );
    };

    /**
     * Composant pour une section avec numéro
     */
    const SectionHeader = ({ number, title }: { number: number; title: string }) => {
        return (
            <View style={styles.sectionHeader}>
                <View style={styles.sectionNumber}>
                    <Text style={styles.sectionNumberText}>{number}</Text>
                </View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
        );
    };

    /**
     * Composant pour un badge
     */
    const Badge = ({ text, color = '#1776BA' }: { text: string; color?: string }) => {
        return (
            <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{text}</Text>
            </View>
        );
    };

    /**
     * Composant pour une méthode de paiement
     */
    const PaymentMethodCard = ({
        name,
        icon,
        isSelected,
        onPress
    }: {
        name: string;
        icon: string;
        isSelected: boolean;
        onPress: () => void;
    }) => {
        return (
            <Pressable
                style={[styles.paymentMethodCard, isSelected && styles.paymentMethodCardSelected]}
                onPress={onPress}
            >
                <Icon name={icon} size={40} color={isSelected ? '#1776BA' : '#666'} />
                <Text style={[styles.paymentMethodText, isSelected && styles.paymentMethodTextSelected]}>
                    {name}
                </Text>
            </Pressable>
        );
    };


    /**
     * Composant pour le bottom sheet de sélection
     */
    const SelectionBottomSheet = () => {
        return (
            <Modal
                visible={showSelectionBottomSheet}
                transparent={true}
                animationType="slide"
                onRequestClose={closeSelectionBottomSheet}
            >
                <Pressable
                    style={styles.selectionBottomSheetOverlay}
                    onPress={closeSelectionBottomSheet}
                >
                    <View
                        style={styles.selectionBottomSheetContent}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Header */}
                        <View style={styles.selectionBottomSheetHeader}>
                            <Text style={styles.selectionBottomSheetTitle}>{selectionTitle}</Text>
                            <Pressable
                                onPress={closeSelectionBottomSheet}
                                style={styles.selectionBottomSheetCloseButton}
                            >
                                <Icon name="close" size={24} color="#000" />
                            </Pressable>
                        </View>

                        {/* Options */}
                        <ScrollView style={styles.selectionOptionsList}>
                            {selectionOptions.map((option, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.selectionOptionItem}
                                    onPress={() => handleSelection(option)}
                                >
                                    <Text style={styles.selectionOptionText}>{option}</Text>
                                    {currentSelectionValue === option && (
                                        <Icon name="check" size={20} color="#1776BA" />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-left" size={25} color="#000" />
                </Pressable>

                <View style={styles.routeBadge}>
                    <Text style={styles.routeBadgeText}>
                        {trip.departureCity} <Icon name="chevron-right" size={15} color="#1776BA" /> {trip.arrivalCity}
                    </Text>
                </View>

                <Text style={styles.stepIndicator}>Étape 2 sur 3</Text>
            </View>

            {/* Barre de progression */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Vérifier et payer</Text>
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '67%' }]} />
                    </View>
                    <Text style={styles.progressText}>67%</Text>
                </View>
            </View>

            {/* Indicateurs de progression */}
            <View style={styles.progressIndicators}>
                <View style={[styles.progressDot, styles.progressDotCompleted]}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre principal */}
                <View style={styles.titleSection}>
                    <Text style={styles.mainTitle}>Vérifier et payer</Text>
                    <Text style={styles.subtitle}>
                        Complétez vos informations et procédez au paiement
                    </Text>
                </View>

                {/* Carte principale */}
                <View style={styles.mainCard}>
                    {/* Section 1 : Informations du passager */}
                    <SectionHeader number={1} title="Informations du passager" />

                    {passengers.map((passenger, index) => (
                        <View key={index} style={styles.passengerSection}>
                            <View style={styles.passengerHeader}>
                                <Text style={styles.passengerTitle}>Passager {passengers.length > 1 ? index + 1 : ''}</Text>
                                <View style={styles.badgesContainer}>
                                    {index === 0 ? (
                                        <>
                                            <Badge text="Principal" color="#1776BA" />
                                            {/* <Pressable
                                                style={styles.seatBadgeButton}
                                                onPress={() => {
                                                    setCurrentPassengerIndex(index);
                                                    setShowSeatSelection(true);
                                                }}
                                            >
                                                <Text style={styles.seatBadgeText}>
                                                    {passenger.seatNumber 
                                                        ? `Siège Aller ${passenger.seatNumber}` 
                                                        : `Siège Aller ${index + 1}`}
                                                </Text>
                                            </Pressable> */}
                                        </>
                                    ) : (
                                        <>
                                            <Badge text="Accompagnant" color="#1776BA" />
                                            {/* <Pressable
                                                style={styles.seatBadgeButton}
                                                onPress={() => {
                                                    setCurrentPassengerIndex(index);
                                                    setShowSeatSelection(true);
                                                }}
                                            >
                                                <Text style={styles.seatBadgeText}>
                                                    {passenger.seatNumber 
                                                        ? `Siège Aller ${passenger.seatNumber}` 
                                                        : `Siège Aller ${index + 1}`}
                                                </Text>
                                            </Pressable> */}
                                        </>
                                    )}
                                </View>
                            </View>

                            <FormField
                                label="Prénom"
                                value={passenger.firstName}
                                onChangeText={(text) => updatePassenger(index, 'firstName', text)}
                                placeholder="Entrez le prénom"
                                required
                            />

                            <FormField
                                label="Nom"
                                value={passenger.lastName}
                                onChangeText={(text) => updatePassenger(index, 'lastName', text)}
                                placeholder="Entrez le nom"
                                required
                            />

                            <PhoneField
                                label="Téléphone"
                                value={passenger.phone}
                                onChangeText={(text) => updatePassenger(index, 'phone', text)}
                                required
                            />

                            <FormField
                                label="Email (optionnel)"
                                value={contactEmail}
                                onChangeText={setContactEmail}
                                placeholder="exemple@email.com"
                                keyboardType="email-address"
                            />

                            <SelectField
                                label="Type de passager"
                                value={passengerType}
                                placeholder="Sélectionner un type"
                                required
                                selectionType="passengerType"
                                options={['Adulte', 'Enfant', 'Senior']}
                                onSelect={(value) => setPassengerType(value)}
                            />
                        </View>
                    ))}

                    {/* Section 2 : Contact d'urgence */}
                    <SectionHeader number={2} title="Contact d'urgence" />

                    <FormField
                        label="Prénom"
                        value={emergencyContact.firstName}
                        onChangeText={(text) => updateEmergencyContact('firstName', text)}
                        placeholder="Entrez le prénom"
                        required
                    />

                    <FormField
                        label="Nom"
                        value={emergencyContact.lastName}
                        onChangeText={(text) => updateEmergencyContact('lastName', text)}
                        placeholder="Entrez le nom"
                        required
                    />

                    <PhoneField
                        label="Téléphone"
                        value={emergencyContact.phone}
                        onChangeText={(text) => updateEmergencyContact('phone', text)}
                        required
                    />

                    <FormField
                        label="Email (optionnel)"
                        value={emergencyContact.email}
                        onChangeText={(text) => updateEmergencyContact('email', text)}
                        placeholder="exemple@email.com"
                        keyboardType="email-address"
                    />

                    <SelectField
                        label="Relation"
                        value={emergencyContact.relation}
                        placeholder="Sélectionner une relation"
                        required
                        selectionType="relation"
                        options={['Parent', 'Conjoint(e)', 'Enfant', 'Frère/Sœur', 'Ami(e)', 'Autre']}
                        onSelect={(value) => updateEmergencyContact('relation', value)}
                    />

                    {/* Section 3 : Méthode de paiement */}
                    <SectionHeader number={3} title="Méthode de paiement" />

                    <View style={styles.paymentMethodsContainer}>
                        <PaymentMethodCard
                            name="Carte de crédit"
                            icon="credit-card-outline"
                            isSelected={selectedPaymentMethod === 'credit-card'}
                            onPress={() => setSelectedPaymentMethod('credit-card')}
                        />
                        <PaymentMethodCard
                            name="Wave"
                            icon="cash-multiple"
                            isSelected={selectedPaymentMethod === 'wave'}
                            onPress={() => setSelectedPaymentMethod('wave')}
                        />
                        <PaymentMethodCard
                            name="Orange Money"
                            icon="cash-multiple"
                            isSelected={selectedPaymentMethod === 'orange-money'}
                            onPress={() => setSelectedPaymentMethod('orange-money')}
                        />
                        <PaymentMethodCard
                            name="MTN Money"
                            icon="cash-multiple"
                            isSelected={selectedPaymentMethod === 'mtn-money'}
                            onPress={() => setSelectedPaymentMethod('mtn-money')}
                        />
                    </View>
                </View>

                {/* Récapitulatif */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Récapitulatif</Text>

                    <View style={styles.summaryDetails}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Voyageurs</Text>
                            <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Taxes</Text>
                            <Text style={styles.summaryValue}>{formatPrice(taxes)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Frais</Text>
                            <Text style={styles.summaryValue}>{formatPrice(fees)}</Text>
                        </View>
                    </View>

                    <View style={styles.summarySeparator} />

                    <View style={styles.summaryTotalRow}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalValue}>{formatPrice(totalAmount)}</Text>
                    </View>

                    <Pressable
                        style={styles.confirmButton}
                        onPress={handleConfirmAndPay}
                    >
                        <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
                    </Pressable>
                </View>
            </ScrollView>


            {/* Bottom sheet de sélection */}
            <SelectionBottomSheet />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
        color: '#1776BA'
    },
    stepIndicator: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    progressTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
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
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1776BA',
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    progressIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: {
        backgroundColor: '#1776BA',
    },
    progressDotCompleted: {
        backgroundColor: '#4CAF50',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    titleSection: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#666',
    },
    mainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1776BA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionNumberText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    passengerSection: {
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    passengerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    passengerTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginRight: 8,
    },
    badgesContainer: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
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
    formInput: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    formInputDisabled: {
        backgroundColor: '#F5F5F5',
        color: '#666',
    },
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    countryCodeText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#000',
    },
    phoneInput: {
        flex: 1,
        backgroundColor: '#F3F3F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectInput: {
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
    selectText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    selectPlaceholder: {
        color: '#A6A6AA',
    },
    paymentMethodsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    paymentMethodCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minHeight: 100,
    },
    paymentMethodCardSelected: {
        borderColor: '#1776BA',
        borderWidth: 2,
        backgroundColor: '#F0F8FF',
    },
    paymentMethodText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Medium',
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    paymentMethodTextSelected: {
        color: '#1776BA',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 24,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        marginBottom: 16,
    },
    summaryDetails: {
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    summarySeparator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
    },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryTotalLabel: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    summaryTotalValue: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
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

    seatBadgeButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    seatBadgeText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
    seatModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    seatModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    seatModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    seatModalTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    seatModalCloseButton: {
        padding: 4,
    },
    busInfoCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    busInfoTitle: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#1776BA',
        marginBottom: 12,
    },
    busInfoRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 4,
    },
    busInfoText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    busInfoAvailable: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#4CAF50',
        marginTop: 4,
    },
    busVisualContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    busShape: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 400,
    },
    busFrontSection: {
        width: 60,
        height: 50,
        backgroundColor: '#1776BA',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    busBodySection: {
        flex: 1,
        height: 50,
        backgroundColor: '#1776BA',
        borderTopRightRadius: 25,
        borderBottomRightRadius: 25,
        marginLeft: -2,
    },
    seatMapContainer: {
        flex: 1,
        paddingHorizontal: 16,
        maxHeight: 400,
    },
    seatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    rowNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1776BA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowNumberText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    leftSeats: {
        flexDirection: 'row',
        gap: 10,
        width: 100,
        justifyContent: 'flex-end',
    },
    rightSeats: {
        flexDirection: 'row',
        gap: 10,
        width: 150,
        justifyContent: 'flex-start',
    },
    aisle: {
        width: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aisleText: {
        fontSize: 11,
        fontFamily: 'Ubuntu_Medium',
        color: '#666',
        transform: [{ rotate: '-90deg' }],
    },
    seatButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    seatButtonDisabled: {
        opacity: 0.6,
    },
    seatNumber: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
    seatNumberSelected: {
        color: '#FFFFFF',
    },
    seatDot: {
        position: 'absolute',
        bottom: 6,
        left: '50%',
        marginLeft: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: 16,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
    selectionBottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    selectionBottomSheetContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    selectionBottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    selectionBottomSheetTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    selectionBottomSheetCloseButton: {
        padding: 4,
    },
    selectionOptionsList: {
        maxHeight: 400,
        // marginBottom: 20,
    },
    selectionOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    selectionOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
});

export default PassengersInfo;