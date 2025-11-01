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
     * Dimensions of the window
     * @type {Dimensions}
     * Get the width and height of the window
     * @returns void
     */
    const { width, height } = Dimensions.get('window');

    /**
     * Images for the onboarding
     * @type {Array<{id: number, bg: ImageSourcePropType, person: ImageSourcePropType, text_1: string, text_2: string, color_text: string}>}
     */
    const imagesOnboarding = [
        {
            id: 1,
            bg: require('@/assets/images/onboarding/bg_voyage.png'),
            person: require('@/assets/images/onboarding/person_travel_1.png'),
            text_1: 'Voyagez malin,',
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
    ]

    /**
     * ScrollX value
     * @type {Animated.Value}
     */
    const scrollX = React.useRef(new Animated.Value(0)).current;
    /**
     * Current index
     * @type {number}
     */
    const [currentIndex, setCurrentIndex] = React.useState(0);
    /**
     * On view change reference
     * @type {React.RefObject<{viewableItems: {index: number}[]}>}
     */

    // @ts-ignore
    const onViewChangeRef = React.useRef(({ viewableItems }) => {
        setCurrentIndex(viewableItems[0]?.index ?? 0);
    });

    /**
     * Go to the app
     * Set the onboarding status to '1' in the AsyncStorage
     * and redirect to the tabs screen
     * @returns void
     */
    const goToApp = async () => {
        await AsyncStorage.setItem('onboarding', '1');
        router.replace('/(tabs)');
    }

    /**
     * Dots component
     * Display the dots for the onboarding
     * @returns React.ReactNode
     */
    const Dots = () => {
        const dotPosition = Animated.divide(scrollX, width);
        return (
            // @ts-ignore
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: Platform.OS === 'android' ? 20 : 35 }}>
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
                            // @ts-ignore
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
        <View key={`onboard-container`} style={styles.container}>
            <Animated.FlatList
                horizontal
                pagingEnabled
                data={imagesOnboarding}
                scrollEventThrottle={16}
                snapToAlignment="center"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false },
                )}
                onViewableItemsChanged={onViewChangeRef.current}
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => `${item.id}`}
                renderItem={({ item, index }: { item: typeof imagesOnboarding[0]; index: number }) => {
                    return (

                        <View
                            key={`view-container-${index.toString()}`}
                            style={{
                                width: width,
                                height: height,
                                alignItems: 'center'
                            }}>
                            <View key={`view-content-${index.toString()}`} style={{ flex: 3 }}>
                                <ImageBackground
                                    key={`image-background-${index.toString()}`}
                                    source={item?.bg}
                                    style={{
                                        flex: 1,
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-end',
                                        width: '100%'
                                    }}>
                                    <Text style={{
                                        color: item?.color_text ? item?.color_text : '#fff',
                                        fontSize: 26,
                                        fontWeight: '700',
                                        width: 230,
                                        top: (height / 2) - 200,
                                        marginLeft: 30,
                                        fontFamily: 'Ubuntu_Bold'
                                    }}>
                                        {item.text_1} <Text key={`text-${index.toString()}`} style={{ color: item?.color_text ? item?.color_text : '#EFE4D2', fontFamily: 'Ubuntu_Bold' }}>{item.text_2}</Text>
                                    </Text>
                                    <Image
                                        source={item?.person}
                                        resizeMethod='resize'
                                        resizeMode="cover"
                                        style={{
                                            width: width,
                                            height: height - 100
                                        }}
                                    />
                                </ImageBackground>
                            </View>

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
                                        fontWeight: '700',
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
            {/* @ts-ignore */}
            <View key={`dots-container`} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Dots />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center'
    },
})

export default Onboard