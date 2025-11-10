// @ts-nocheck
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
                    style={styles.selectionBottomSheetContent}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Header */}
                    <View style={styles.selectionBottomSheetHeader}>
                        <Text style={styles.selectionBottomSheetTitle}>{title}</Text>
                        <Pressable
                            onPress={onClose}
                            style={styles.selectionBottomSheetCloseButton}
                        >
                            <Icon name="close" size={24} color="#000" />
                        </Pressable>
                    </View>

                    {/* Options */}
                    <ScrollView style={styles.selectionOptionsList}>
                        {options.map((option, index) => (
                            <Pressable
                                key={index}
                                style={styles.selectionOptionItem}
                                onPress={() => handleSelection(option.value)}
                            >
                                <Text style={styles.selectionOptionText}>{option.label}</Text>
                                {currentValue === option.value && (
                                    <Icon name="check" size={20} color="#1776BA" />
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
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        // paddingBottom: 20,
    },
    selectionBottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    selectionBottomSheetTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
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
        borderBottomColor: '#F3F3F7',
    },
    selectionOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        color: '#000',
    },
});

