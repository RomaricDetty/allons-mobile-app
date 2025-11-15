// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SelectionBottomSheetProps {
    visible: boolean;
    title: string;
    options: Array<{value: string, label: string}>;
    currentValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
}

/**
 * Composant pour le bottom sheet de sélection
 */
export const SelectionBottomSheet = ({
    visible,
    title,
    options,
    currentValue,
    onSelect,
    onClose
}: SelectionBottomSheetProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const insets = useSafeAreaInsets();
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour le bottom sheet
    const contentBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const optionBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#F3F3F7';
    // Utilise #1776BA si tintColor est blanc en dark mode
    const checkIconColor = tintColor === '#fff' ? '#1776BA' : tintColor;

    const handleSelection = (value: string) => {
        onSelect(value);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.selectionBottomSheetOverlay}
                onPress={onClose}
            >
                <View
                    style={[
                        styles.selectionBottomSheetContent,
                        {
                            backgroundColor: contentBackgroundColor,
                            paddingBottom: Math.max(insets.bottom, 20)
                        }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Header */}
                    <View style={[
                        styles.selectionBottomSheetHeader,
                        { borderBottomColor: borderColor }
                    ]}>
                        <Text style={[styles.selectionBottomSheetTitle, { color: textColor }]}>{title}</Text>
                        <Pressable
                            onPress={onClose}
                            style={styles.selectionBottomSheetCloseButton}
                        >
                            <Icon name="close" size={24} color={iconColor} />
                        </Pressable>
                    </View>

                    {/* Options */}
                    <ScrollView style={styles.selectionOptionsList}>
                        {options.map((option, index) => (
                            <Pressable
                                key={index}
                                style={[
                                    styles.selectionOptionItem,
                                    { borderBottomColor: optionBorderColor }
                                ]}
                                onPress={() => handleSelection(option.value)}
                            >
                                <Text style={[styles.selectionOptionText, { color: textColor }]}>{option.label}</Text>
                                {currentValue === option.value && (
                                    <Icon name="check" size={20} color={checkIconColor} />
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    selectionBottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    selectionBottomSheetContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    selectionBottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    selectionBottomSheetTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    selectionBottomSheetCloseButton: {
        padding: 4,
    },
    selectionOptionsList: {
        maxHeight: 400,
    },
    selectionOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    selectionOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
});

