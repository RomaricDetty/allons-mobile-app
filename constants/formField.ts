/**
 * Tokens partagés pour tous les champs de saisie AllOn.
 * Cible unique : fill #F3F3F7, radius 16, hauteur 50, texte 14.
 */
import { Colors } from '@/constants/theme';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const FORM_FIELD_HEIGHT = 50;
export const FORM_FIELD_RADIUS = 16;
export const FORM_FIELD_FONT_SIZE = 14;
export const FORM_FIELD_LABEL_SIZE = 14;
export const FORM_FIELD_PADDING_H = 16;
export const FORM_FIELD_PADDING_V = 12;
export const FORM_FIELD_TEXTAREA_MIN_HEIGHT = 100;
export const FORM_FIELD_FOCUS_BORDER = '#1776BA';

export type FormFieldColorScheme = 'light' | 'dark';

export function getFormFieldColors(scheme: FormFieldColorScheme = 'light') {
    const theme = Colors[scheme];
    return {
        text: theme.text,
        secondaryText: theme.secondaryText,
        background: theme.inputBackground,
        placeholder: theme.placeholder,
        border: theme.border,
        danger: theme.danger,
        focusBorder: FORM_FIELD_FOCUS_BORDER,
        disabledBackground: scheme === 'dark' ? '#1C1C1E' : '#E8E8EC',
        disabledText: theme.secondaryText,
    };
}

/** Styles de base réutilisables (composer avec couleurs dynamiques). */
export const formFieldBaseStyles = StyleSheet.create({
    field: {
        marginBottom: 16,
    } as ViewStyle,
    label: {
        fontSize: FORM_FIELD_LABEL_SIZE,
        fontFamily: 'Ubuntu_Medium',
        marginBottom: 8,
    } as TextStyle,
    input: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: FORM_FIELD_PADDING_H,
        paddingVertical: FORM_FIELD_PADDING_V,
        fontSize: FORM_FIELD_FONT_SIZE,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
    } as TextStyle,
    inputMultiline: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: FORM_FIELD_PADDING_H,
        paddingVertical: FORM_FIELD_PADDING_V,
        fontSize: FORM_FIELD_FONT_SIZE,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 0,
        minHeight: FORM_FIELD_TEXTAREA_MIN_HEIGHT,
        textAlignVertical: 'top',
    } as TextStyle,
    search: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: FORM_FIELD_PADDING_H,
        fontSize: FORM_FIELD_FONT_SIZE,
        fontFamily: 'Ubuntu_Regular',
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
    } as TextStyle,
    select: {
        borderRadius: FORM_FIELD_RADIUS,
        paddingHorizontal: FORM_FIELD_PADDING_H,
        paddingVertical: FORM_FIELD_PADDING_V,
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    } as ViewStyle,
    otp: {
        borderRadius: FORM_FIELD_RADIUS,
        borderWidth: 0,
        height: FORM_FIELD_HEIGHT,
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        letterSpacing: 8,
        textAlign: 'center',
    } as TextStyle,
});
