import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated, Dimensions, Image,
    ImageBackground, Platform, Pressable,
    StyleSheet, Text, View, ViewToken
} from 'react-native';

/**
 * Interface pour les données d'onboarding
 */
interface OnboardingItem {
    id: number;
    bg: any;
    person: any;
    text_1: string;
    text_2: string;
    color_text: string;
}

/**
 * Composant des indicateurs de pagination (dots)
 * Mémorisé pour éviter les re-renders inutiles
 */
const Dots = React.memo<{ scrollX: Animated.Value; width: number; itemCount: number }>(
    ({ scrollX, width, itemCount }) => {
        const dotPosition = useMemo(() => Animated.divide(scrollX, width), [scrollX, width]);
        const dotsBottom = useMemo(() => Platform.OS === 'android' ? 30 : 35, []);

        return (
            <View style={[styles.dotsContainer, { bottom: dotsBottom }]}>
                {Array.from({ length: itemCount }).map((_, index) => {
                    const dotColor = dotPosition.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: ['#cecece', '#EFE4D2', '#cecece'],
                        extrapolate: 'clamp',
                    });
                    const dotWidth = dotPosition.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [15, 45, 15],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View
                            key={`dot-${index}`}
                            style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
                        />
                    );
                })}
            </View>
        );
    }
);

Dots.displayName = 'Dots';

/**
 * Composant d'une slide d'onboarding
 * Mémorisé pour éviter les re-renders inutiles
 * Optimisé pour le chargement et l'affichage des images
 */
const OnboardingSlide = React.memo<{
    item: OnboardingItem;
    index: number;
    width: number;
    height: number;
    isLast: boolean;
    onPress: () => void;
}>(({ item, index, width, height, isLast, onPress }) => {
    const slideStyle = useMemo(
        () => ({ width, height }),
        [width, height]
    );

    const textTop = useMemo(() => (height / 2) - 200, [height]);
    const imageHeight = useMemo(() => height - 100, [height]);
    const buttonTop = useMemo(() => height - 120, [height]);

    const textColor = useMemo(
        () => item.color_text || '#fff',
        [item.color_text]
    );

    const textHighlightColor = useMemo(
        () => item.color_text || '#EFE4D2',
        [item.color_text]
    );

    return (
        <View style={[styles.slide, slideStyle]}>
            <View style={styles.imageContainer}>
                <ImageBackground
                    source={item.bg}
                    style={styles.imageBackground}
                    imageStyle={styles.imageBackgroundImage}
                    resizeMode="cover"
                    defaultSource={item.bg}
                >
                    <Text style={[styles.slideText, { top: textTop, color: textColor }]}>
                        {item.text_1}{' '}
                        <Text style={{ color: textHighlightColor }}>
                            {item.text_2}
                        </Text>
                    </Text>
                    <Image
                        source={item.person}
                        resizeMethod="resize"
                        resizeMode="cover"
                        style={[styles.personImage, { width, height: imageHeight }]}
                        progressiveRenderingEnabled={Platform.OS === 'android'}
                        fadeDuration={Platform.OS === 'ios' ? 200 : 0}
                        defaultSource={item.person}
                    />
                </ImageBackground>
            </View>

            {isLast && (
                <Pressable onPress={onPress} style={[styles.startButton, { top: buttonTop }]}>
                    <Text style={styles.startButtonText}>Commencer</Text>
                </Pressable>
            )}
        </View>
    );
});

OnboardingSlide.displayName = 'OnboardingSlide';

const Onboard = () => {
    /**
     * Dimensions de la fenêtre
     * Mémorisées pour éviter les recalculs
     */
    const { width, height } = useMemo(() => Dimensions.get('window'), []);

    /**
     * Images pour l'onboarding
     * Mémorisées car statiques
     * Références aux images pour préchargement
     */
    const imagesOnboarding = useMemo<OnboardingItem[]>(
        () => [
            {
                id: 1,
                bg: require('@/assets/images/onboarding/bg_voyage.png'),
                person: require('@/assets/images/onboarding/person_travel_1.png'),
                text_1: 'Voyagez malin',
                text_2: 'Payez moins !',
                color_text: ''
            },
            {
                id: 2,
                bg: require('@/assets/images/onboarding/bg_voyage.png'),
                person: require('@/assets/images/onboarding/person_travel_2.png'),
                text_1: 'Voyagez en toute ',
                text_2: 'Sécurité !',
                color_text: ''
            },
            {
                id: 3,
                bg: require('@/assets/images/onboarding/bg_voyage.png'),
                person: require('@/assets/images/onboarding/person_travel_3.png'),
                text_1: 'Partez loin sans',
                text_2: 'Casser votre tirelire !',
                color_text: ''
            }
        ],
        []
    );

    /**
     * Logo de l'application
     * Mémorisé pour éviter les re-renders
     */
    const logoSource = useMemo(
        () => require('@/assets/images/onboarding/logo-allon-blanc.png'),
        []
    );

    /**
     * Valeur du scroll horizontal
     */
    const scrollX = useRef(new Animated.Value(0)).current;

    /**
     * Index actuel de la slide
     */
    const [currentIndex, setCurrentIndex] = useState(0);

    /**
     * État de chargement des images
     * Permet de précharger les images suivantes pendant le scroll
     */
    const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set([0]));

    /**
     * Précharge les images de manière intelligente
     * Charge toutes les images au montage pour un affichage fluide
     */
    useEffect(() => {
        const preloadImage = async (imageUri: any) => {
            try {
                if (typeof imageUri === 'number') {
                    // Pour les require(), on utilise Image.prefetch avec Image.resolveAssetSource
                    const resolved = Image.resolveAssetSource(imageUri);
                    if (resolved?.uri) {
                        await Image.prefetch(resolved.uri);
                    }
                }
            } catch (error) {
                // Ignore les erreurs de préchargement silencieusement
                console.warn('Erreur de préchargement d\'image:', error);
            }
        };

        // Précharge toutes les images au montage du composant
        const preloadAllImages = async () => {
            const uniqueImages = new Set<number>();
            
            // Collecte toutes les images uniques
            imagesOnboarding.forEach(item => {
                if (typeof item.bg === 'number') uniqueImages.add(item.bg);
                if (typeof item.person === 'number') uniqueImages.add(item.person);
            });
            if (typeof logoSource === 'number') uniqueImages.add(logoSource);

            // Précharge toutes les images en parallèle
            await Promise.allSettled(
                Array.from(uniqueImages).map(img => preloadImage(img))
            );
        };

        preloadAllImages();
    }, [imagesOnboarding, logoSource]);

    /**
     * Précharge l'image suivante quand l'utilisateur scroll
     * Améliore la fluidité du scroll en préchargeant à l'avance
     */
    useEffect(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < imagesOnboarding.length && !preloadedImages.has(nextIndex)) {
            const nextItem = imagesOnboarding[nextIndex];
            const preloadNext = async () => {
                try {
                    const bgResolved = Image.resolveAssetSource(nextItem.bg);
                    const personResolved = Image.resolveAssetSource(nextItem.person);
                    
                    await Promise.allSettled([
                        bgResolved?.uri ? Image.prefetch(bgResolved.uri) : Promise.resolve(),
                        personResolved?.uri ? Image.prefetch(personResolved.uri) : Promise.resolve(),
                    ]);
                    
                    setPreloadedImages(prev => new Set([...prev, nextIndex]));
                } catch (error) {
                    console.warn('Erreur de préchargement de l\'image suivante:', error);
                }
            };
            preloadNext();
        }
    }, [currentIndex, imagesOnboarding, preloadedImages]);

    /**
     * Configuration pour la détection des items visibles
     */
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
    }).current;

    /**
     * Callback lors du changement d'item visible
     */
    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index !== null) {
                setCurrentIndex(viewableItems[0].index);
            }
        },
        []
    );

    const viewabilityConfigCallbackPairs = useRef([
        { onViewableItemsChanged, viewabilityConfig }
    ]).current;

    /**
     * Optimisation: calcule la position exacte de chaque item
     */
    const getItemLayout = useCallback(
        (_: ArrayLike<OnboardingItem> | null | undefined, index: number) => ({
            length: width,
            offset: width * index,
            index,
        }),
        [width]
    );

    /**
     * Navigation vers l'application principale
     * Enregistre que l'onboarding a été complété
     */
    const goToApp = useCallback(async () => {
        await AsyncStorage.setItem('onboarding', '1');
        router.replace('/(tabs)');
    }, []);

    /**
     * Fonction d'extraction de clé pour FlatList
     */
    const keyExtractor = useCallback((item: OnboardingItem) => `${item.id}`, []);

    /**
     * Fonction de rendu des items
     */
    const renderItem = useCallback(
        ({ item, index }: { item: OnboardingItem; index: number }) => (
            <OnboardingSlide
                item={item}
                index={index}
                width={width}
                height={height}
                isLast={index === imagesOnboarding.length - 1}
                onPress={goToApp}
            />
        ),
        [width, height, imagesOnboarding.length, goToApp]
    );

    /**
     * Configuration de la FlatList mémorisée
     */
    const flatListProps = useMemo(
        () => ({
            pagingEnabled: Platform.OS === 'ios',
            snapToInterval: Platform.OS === 'android' ? width : undefined,
            snapToAlignment: (Platform.OS === 'ios' ? 'center' : 'start') as 'center' | 'start',
            scrollEventThrottle: 16,
            decelerationRate: 'fast' as const,
            removeClippedSubviews: Platform.OS === 'ios',
            windowSize: 3,
            initialNumToRender: 1,
            maxToRenderPerBatch: 1,
            updateCellsBatchingPeriod: 50,
        }),
        [width]
    );

    /**
     * Handler de scroll optimisé
     */
    const scrollHandler = useMemo(
        () =>
            Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                {
                    useNativeDriver: false,
                }
            ),
        [scrollX]
    );

    return (
        <View style={styles.container}>
            {/* Logo affiché en overlay sur toutes les slides */}
            <Image
                source={logoSource}
                resizeMode="contain"
                style={styles.logo}
                defaultSource={logoSource}
            />

            {/* Liste horizontale des slides d'onboarding */}
            <Animated.FlatList
                horizontal
                data={imagesOnboarding}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                onScroll={scrollHandler}
                viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.flatListContent}
                {...flatListProps}
            />

            {/* Indicateurs de pagination */}
            <Dots scrollX={scrollX} width={width} itemCount={imagesOnboarding.length} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logo: {
        width: 80,
        height: 80,
        position: 'absolute',
        top: Platform.OS === 'android' ? 35 : 55,
        zIndex: 1000,
        alignSelf: 'center',
    },
    flatListContent: {
        paddingHorizontal: 0,
    },
    slide: {
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageContainer: {
        flex: 3,
    },
    imageBackground: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        width: '100%',
    },
    imageBackgroundImage: {
        resizeMode: 'cover',
    },
    slideText: {
        fontSize: 26,
        width: 230,
        marginLeft: 30,
        fontFamily: 'Ubuntu_Bold',
    },
    personImage: {
        resizeMode: 'cover',
        backgroundColor: 'transparent',
    },
    startButton: {
        position: 'absolute',
        backgroundColor: '#1776BA',
        width: 150,
        height: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 100,
    },
    startButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        alignSelf: 'center',
        left: 0,
        right: 0,
    },
    dot: {
        borderRadius: 10,
        marginHorizontal: 5,
        height: 12,
    },
});

export default Onboard;