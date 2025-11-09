import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface CheckboxProps {
    label: string;
    checked: boolean;
    onToggle: () => void;
}

/**
 * Composant checkbox personnalisé
 */
export const Checkbox = ({ label, checked, onToggle }: CheckboxProps) => {
    return (
        <Pressable style={styles.container} onPress={onToggle}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                )}
            </View>
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#1776BA',
        borderColor: '#1776BA',
    },
    label: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
});

