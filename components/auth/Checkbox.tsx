//@ts-nocheck
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/legal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface CheckboxProps {
    checked: boolean;
    onToggle: () => void;
    /** Si true, affiche le libellé avec liens CGU / confidentialité. */
    withLegalLinks?: boolean;
    label?: string;
}

/**
 * Composant checkbox personnalisé
 */
export const Checkbox = ({
    label = "J'accepte les conditions d'utilisation et la politique de confidentialité",
    checked,
    onToggle,
    withLegalLinks = false,
}: CheckboxProps) => {
    const colorScheme = useColorScheme() ?? 'light';

    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const linkColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    const checkboxBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF';
    const checkboxBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const checkboxCheckedColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    const openUrl = (url: string) => {
        Linking.openURL(url).catch(() => undefined);
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={styles.checkboxHit}
                onPress={onToggle}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
            >
                <View
                    style={[
                        styles.checkbox,
                        {
                            backgroundColor: checked ? checkboxCheckedColor : checkboxBackgroundColor,
                            borderColor: checked ? checkboxCheckedColor : checkboxBorderColor,
                        },
                    ]}
                >
                    {checked && (
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    )}
                </View>
            </Pressable>
            {withLegalLinks ? (
                <Text style={[styles.label, { color: textColor }]}>
                    J'accepte les{' '}
                    <Text
                        style={[styles.link, { color: linkColor }]}
                        onPress={() => openUrl(TERMS_OF_USE_URL)}
                    >
                        conditions d'utilisation
                    </Text>
                    {' '}et la{' '}
                    <Text
                        style={[styles.link, { color: linkColor }]}
                        onPress={() => openUrl(PRIVACY_POLICY_URL)}
                    >
                        politique de confidentialité
                    </Text>
                </Text>
            ) : (
                <Pressable onPress={onToggle} style={styles.labelPressable}>
                    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
                </Pressable>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    checkboxHit: {
        paddingTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelPressable: {
        flex: 1,
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
    },
    link: {
        fontFamily: 'Ubuntu_Medium',
        textDecorationLine: 'underline',
    },
});
