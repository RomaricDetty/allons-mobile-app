import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

type SkeletonProps = {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
};

/**
 * Os de skeleton — pulse opacity fluide (UI thread).
 */
export function Skeleton({
    width = '100%',
    height = 14,
    borderRadius = 10,
    style,
}: SkeletonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const opacity = useSharedValue(0.45);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            -1,
            true,
        );
    }, [opacity]);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const boneColor = colorScheme === 'dark' ? '#2C2C2E' : '#E8E8EC';

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: boneColor,
                },
                animStyle,
                style,
            ]}
        />
    );
}

type CircleProps = { size?: number; style?: StyleProp<ViewStyle> };

export function SkeletonCircle({ size = 40, style }: CircleProps) {
    return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

type LineProps = {
    width?: DimensionValue;
    height?: number;
    style?: StyleProp<ViewStyle>;
};

export function SkeletonLine({ width = '100%', height = 12, style }: LineProps) {
    return <Skeleton width={width} height={height} borderRadius={8} style={style} />;
}

type BlockProps = {
    height?: number;
    radius?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
};

/** Carte skeleton (fond carte + padding) */
export function SkeletonBlock({ height, radius = 16, style, children }: BlockProps) {
    const colors = useAppColors();
    return (
        <View
            style={[
                styles.block,
                {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderRadius: radius,
                    minHeight: height,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    block: {
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
    },
});
