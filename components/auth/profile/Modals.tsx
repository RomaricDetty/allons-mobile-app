// @ts-nocheck
import {
    STATUS_OPTIONS } from '@/constants/profile';
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface StatusModalProps {
    visible: boolean;
    selectedStatus: string;
    onClose: () => void;
    onSelectStatus: (status: string) => void;
}

/**
 * Modal de sélection du statut de réservation
 */
export const StatusModal: React.FC<StatusModalProps> = ({ visible, selectedStatus, onClose, onSelectStatus }) => {
    const colors = useAppColors();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]} onStartShouldSetResponder={() => true}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir un statut</Text>
                        <Pressable onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.icon} />
                        </Pressable>
                    </View>
                    <ScrollView>
                        {STATUS_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                style={[styles.modalOption, { borderBottomColor: colors.modalBorder }]}
                                onPress={() => {
                                    onSelectStatus(option.value);
                                    onClose();
                                }}
                            >
                                <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
                                {selectedStatus === option.value && (
                                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.activeTabColor} />
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
    },
});
