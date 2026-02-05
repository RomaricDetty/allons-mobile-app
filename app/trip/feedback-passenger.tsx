// @ts-nocheck
import { createFeedback, FeedbackTag } from '@/api/feedback';
import { useAppColors } from '@/hooks/use-app-colors';
import { getAuthToken } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/** Étiquettes rapides : libellé affiché + valeur API */
const QUICK_TAGS: { label: string; tag: FeedbackTag }[] = [
    { label: "À l'heure", tag: FeedbackTag.ON_TIME },
    { label: 'Bus propre', tag: FeedbackTag.CLEAN_BUS },
    { label: 'Sièges confortables', tag: FeedbackTag.COMFORTABLE_SEATS },
    { label: 'Chauffeur courtois', tag: FeedbackTag.COURTEOUS_DRIVER },
    { label: 'Bon service', tag: FeedbackTag.GOOD_SERVICE },
    { label: 'Bon rapport qualité-prix', tag: FeedbackTag.VALUE_FOR_MONEY },
    { label: 'Trajet agréable', tag: FeedbackTag.SMOOTH_RIDE },
    { label: 'Bonnes conditions', tag: FeedbackTag.GOOD_CONDITIONS },
];

const MAX_COMMENT_LENGTH = 500;

/**
 * Écran plein pour donner son avis (feedback passager).
 * Note globale (obligatoire), étiquettes et commentaire (optionnels).
 */
export default function FeedbackPassengerScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const params = useLocalSearchParams();
    const bookingId = (params.bookingId as string) || (params.bookingId as string) || '';
    const departureId = (params.departureId as string) || (params.departureId as string) || '';
    console.log('bookingId', bookingId);
    console.log('departureId', departureId);

    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<FeedbackTag[]>([]);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    /** Position Y de la section commentaire dans le contenu du ScrollView (pour scroll au focus). */
    const commentSectionY = useRef(0);

    const toggleTag = useCallback((tag: FeedbackTag) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    }, []);

    const handleCancel = useCallback(() => {
        router.back();
    }, []);

    const handleSubmit = useCallback(async () => {
        if (rating === 0) {
            Alert.alert('Champ requis', 'Veuillez attribuer une note globale.');
            return;
        }
        if (!bookingId) {
            Alert.alert('Erreur', 'Identifiant de réservation manquant.');
            return;
        }
        const token = await getAuthToken();
        if (!token?.trim()) {
            Alert.alert('Erreur', 'Veuillez vous reconnecter pour envoyer votre avis.');
            return;
        }

        setIsSubmitting(true);
        console.log('bookingId', bookingId);
        console.log('departureId', departureId);
        console.log('rating', rating);
        console.log('selectedTags', selectedTags);
        console.log('comment', comment);
        // return;
        try {
            await createFeedback(
                {
                    bookingId,
                    ...(departureId ? { departureId } : {}),
                    rating,
                    tags: selectedTags.length > 0 ? selectedTags : undefined,
                    comment: comment.trim() || undefined,
                },
                token
            );
            Alert.alert('Merci !', 'Votre avis a bien été enregistré.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Impossible d\'envoyer votre avis. Réessayez plus tard.';
            Alert.alert('Erreur', message);
        } finally {
            setIsSubmitting(false);
        }
    }, [rating, selectedTags, comment, bookingId, departureId]);

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            {/* Header avec bouton retour */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: colors.headerBackground,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Pressable onPress={handleCancel} style={styles.backButton} hitSlop={12}>
                    <Icon name="arrow-left" size={25} color={colors.icon} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Donnez votre avis
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
                        Votre opinion nous aide à améliorer nos services
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Note globale */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.text }]}>
                            Note globale *
                        </Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <Pressable
                                    key={value}
                                    onPress={() => setRating(value)}
                                    style={styles.starButton}
                                    hitSlop={8}
                                >
                                    <Icon
                                        name={value <= rating ? 'star' : 'star-outline'}
                                        size={36}
                                        color={value <= rating ? '#FFB800' : colors.border}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Étiquettes rapides */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.text }]}>
                            Étiquettes rapides (optionnel)
                        </Text>
                        <View style={styles.tagsRow}>
                            {QUICK_TAGS.map(({ label, tag }) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <Pressable
                                        key={tag}
                                        onPress={() => toggleTag(tag)}
                                        style={[
                                            styles.tag,
                                            {
                                                borderColor: isSelected ? colors.activeTabColor : colors.border,
                                                backgroundColor: isSelected ? `${colors.activeTabColor}15` : colors.cardBackground,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.tagText,
                                                { color: isSelected ? colors.activeTabColor : colors.text },
                                            ]}
                                        >
                                            {label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Commentaire */}
                    <View
                        style={styles.section}
                        onLayout={(e) => {
                            commentSectionY.current = e.nativeEvent.layout.y;
                        }}
                    >
                        <Text style={[styles.label, { color: colors.text }]}>
                            Commentaire (optionnel)
                        </Text>
                        <Text style={[styles.hint, { color: colors.secondaryText }]}>
                            Y a-t-il quelque chose que nous pourrions améliorer ?
                        </Text>
                        <TextInput
                            value={comment}
                            onChangeText={setComment}
                            onFocus={() => {
                                scrollViewRef.current?.scrollTo({
                                    y: Math.max(0, commentSectionY.current - 24),
                                    animated: true,
                                });
                            }}
                            placeholder="Partagez votre expérience avec nous..."
                            placeholderTextColor={colors.secondaryText}
                            style={[
                                styles.textArea,
                                {
                                    borderColor: colors.border,
                                    color: colors.text,
                                    backgroundColor: colors.background,
                                },
                            ]}
                            multiline
                            maxLength={MAX_COMMENT_LENGTH}
                            textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, { color: colors.secondaryText }]}>
                            {comment.length}/{MAX_COMMENT_LENGTH} caractères
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            onPress={handleCancel}
                            style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.buttonSecondaryText, { color: colors.text }]}>
                                Annuler
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.activeTabColor, opacity: isSubmitting ? 0.7 : 1 }]}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonPrimaryText}>Envoyer</Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
        marginTop: 4,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 10,
    },
    hint: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 8,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    starButton: {
        padding: 4,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        minHeight: 100,
        maxHeight: 140,
    },
    charCount: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 6,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    buttonSecondary: {
        borderWidth: 1,
    },
    buttonSecondaryText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
    },
    buttonPrimary: {},
    buttonPrimaryText: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Medium',
        color: '#FFFFFF',
    },
});
