import React, { memo, ReactNode } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle,
} from 'react-native';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps {
    title: string;
    onPress: () => void;
    variant?: AppButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    icon?: ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

const BRAND = '#1776BA';
const DANGER = '#C44747';

/**
 * Bouton d’action uniforme AllOn (primary / secondary / danger / ghost).
 */
export const AppButton = memo<AppButtonProps>(({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    fullWidth = true,
    icon,
    style,
    textStyle,
}) => {
    const isDisabled = disabled || loading;
    const variantStyle = variantStyles[variant];
    const ripple =
        variant === 'primary' || variant === 'danger'
            ? 'rgba(255, 255, 255, 0.25)'
            : 'rgba(23, 118, 186, 0.12)';

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={[
                styles.base,
                variantStyle.container,
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            android_ripple={{ color: ripple }}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variantStyle.spinner}
                />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.label, variantStyle.label, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </Pressable>
    );
});

AppButton.displayName = 'AppButton';

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
    },
    fullWidth: {
        width: '100%',
        alignSelf: 'stretch',
    },
    label: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.65,
    },
});

const variantStyles = {
    primary: {
        container: {
            backgroundColor: BRAND,
        } as ViewStyle,
        label: {
            color: '#FFFFFF',
        } as TextStyle,
        spinner: '#FFFFFF',
    },
    secondary: {
        container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: BRAND,
        } as ViewStyle,
        label: {
            color: BRAND,
        } as TextStyle,
        spinner: BRAND,
    },
    danger: {
        container: {
            backgroundColor: DANGER,
        } as ViewStyle,
        label: {
            color: '#FFFFFF',
        } as TextStyle,
        spinner: '#FFFFFF',
    },
    ghost: {
        container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: '#E0E0E0',
        } as ViewStyle,
        label: {
            color: '#11181C',
        } as TextStyle,
        spinner: BRAND,
    },
};
