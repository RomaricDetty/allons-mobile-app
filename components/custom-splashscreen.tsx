import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const CustomSplashScreen = () => {
    return (
        <View style={styles.splashContainer}>
            <Text style={
                { 
                    fontSize: 50, 
                    fontFamily: 'Ubuntu_Bold', 
                    color: '#ffffff',
                }
            }>AllOn</Text>
            <Image
                source={require('@/assets/images/onboarding/logo-allon-blanc.png')}
                resizeMode="contain"
                style={styles.logo}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: '#1776BA',
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: height,
        // position: 'absolute',
        // bottom: 30,
        // zIndex: 1000,
    },
    logo: {
        width: 80,
        height: 80,
        position: 'absolute',
        bottom: 30,
        zIndex: 1000,
    },
});

export default CustomSplashScreen;