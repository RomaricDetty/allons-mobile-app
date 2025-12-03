// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import {
    Animated, Dimensions, Image,
    ImageBackground, Platform, Pressable,
    StyleSheet, Text, View
} from 'react-native';


const Onboard = () => {
    /**
     * Dimensions de la fenêtre
     * Récupère la largeur et la hauteur
     */
    const { width, height } = Dimensions.get('window');

    /**
     * Images pour l'onboarding
     */
    const imagesOnboarding = [
        {
            id: 1,
            bg: require('../../assets/images/onboarding/bg_voyage.png'),
            person: require('../../assets/images/onboarding/person_travel_1.png'),
            text_1: 'Voyagez malin',
            text_2: 'Payez moins !',
            color_text: ''
        },
        {
            id: 2,
            bg: require('../../assets/images/onboarding/bg_voyage.png'),
            person: require('../../assets/images/onboarding/person_travel_2.png'),
            text_1: 'Voyagez en toute ',
            text_2: 'Sécurité !',
            color_text: ''
        },
        {
            id: 3,
            bg: require('../../assets/images/onboarding/bg_voyage.png'),
            person: require('../../assets/images/onboarding/person_travel_3.png'),
            text_1: 'Partez loin sans',
            text_2: 'Casser votre tirelire !',
            color_text: ''
        }
    ];

    /**
     * Valeur du scroll horizontal
     */
    const scrollX = React.useRef(new Animated.Value(0)).current;

    /**
     * Index actuel de la slide
     */
    const [currentIndex, setCurrentIndex] = React.useState(0);

    /**
     * Configuration pour la détection des items visibles
     */
    const viewabilityConfig = React.useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
    }).current;

    /**
     * Callback lors du changement d'item visible
     */
    const onViewableItemsChanged = React.useCallback(
        ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
            if (viewableItems.length > 0 && viewableItems[0].index !== null) {
                setCurrentIndex(viewableItems[0].index);
            }
        },
        []
    );

    /**
     * Optimisation: calcule la position exacte de chaque item
     */
    const getItemLayout = React.useCallback(
        (_: any, index: number) => ({
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
    const goToApp = async () => {
        await AsyncStorage.setItem('onboarding', '1');
        router.replace('/(tabs)');
    };

    /**
     * Composant des indicateurs de pagination (dots)
     */
    const Dots = () => {
        const dotPosition = Animated.divide(scrollX, width);
        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                bottom: Platform.OS === 'android' ? 30 : 35
            }}>
                {imagesOnboarding.map((_, index) => {
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
                            style={{
                                borderRadius: 10,
                                marginHorizontal: 5,
                                width: dotWidth,
                                height: 12,
                                backgroundColor: dotColor,
                            }}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Logo affiché en overlay sur toutes les slides */}
            <Image
                source={require('@/assets/images/onboarding/logo-allon-blanc.png')}
                resizeMode="contain"
                style={styles.logo}
            />

            {/* Liste horizontale des slides d'onboarding */}
            <Animated.FlatList
                horizontal
                pagingEnabled
                data={imagesOnboarding}
                scrollEventThrottle={16}
                snapToAlignment="center"
                decelerationRate="fast"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                        useNativeDriver: false,
                        listener: undefined,
                    },
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => `${item.id}`}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                updateCellsBatchingPeriod={50}
                renderItem={({ item, index }: { item: typeof imagesOnboarding[0]; index: number }) => {
                    return (
                        <View
                            style={{
                                width: width,
                                height: height,
                                alignItems: 'center'
                            }}>
                            <View style={{ flex: 3 }}>
                                <ImageBackground
                                    source={item?.bg}
                                    style={{
                                        flex: 1,
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-end',
                                        width: '100%'
                                    }}
                                    imageStyle={{ resizeMode: 'cover' }}
                                >
                                    <Text style={{
                                        color: item?.color_text ? item?.color_text : '#fff',
                                        fontSize: 26,
                                        width: 230,
                                        top: (height / 2) - 200,
                                        marginLeft: 30,
                                        fontFamily: 'Ubuntu_Bold'
                                    }}>
                                        {item.text_1} <Text style={{ color: item?.color_text ? item?.color_text : '#EFE4D2', fontFamily: 'Ubuntu_Bold' }}>{item.text_2}</Text>
                                    </Text>
                                    <Image
                                        source={item?.person}
                                        resizeMethod='resize'
                                        resizeMode="cover"
                                        style={{
                                            width: width,
                                            height: height - 100
                                        }}
                                        progressiveRenderingEnabled={Platform.OS === 'android'}
                                        fadeDuration={0}
                                    />
                                </ImageBackground>
                            </View>

                            {/* Bouton "Commencer" sur la dernière slide */}
                            {index === imagesOnboarding.length - 1 &&
                                <Pressable
                                    onPress={goToApp}
                                    style={{
                                        position: 'absolute',
                                        top: height - 120,
                                        backgroundColor: '#1776BA',
                                        width: 150,
                                        height: 45,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 100,
                                    }}
                                >
                                    <Text style={{
                                        color: '#ffffff',
                                        fontSize: 16,
                                        fontFamily: 'Ubuntu_Bold'
                                    }}>
                                        Commencer
                                    </Text>
                                </Pressable>
                            }
                        </View>
                    );
                }}
            />

            {/* Indicateurs de pagination */}
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Dots />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center'
    },
    logo: {
        width: 80,
        height: 80,
        position: 'absolute',
        top: Platform.OS === 'android' ? 30 : 55,
        zIndex: 1000,
        alignSelf: 'center',
    },
});

export default Onboard;