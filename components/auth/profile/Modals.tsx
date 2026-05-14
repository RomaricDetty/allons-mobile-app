// @ts-nocheck
import { STATUS_OPTIONS } from '@/constants/profile';
import { useAppColors } from '@/hooks/use-app-colors';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
                                    <MaterialCommunityIcons name="check" size={20} color={colors.activeTabColor} />
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Modal de confirmation de déconnexion
 */
export const LogoutModal: React.FC<LogoutModalProps> = ({ visible, onClose, onConfirm }) => {
    const colors = useAppColors();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View
                    style={[
                        styles.logoutModalContent,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <Text style={[styles.logoutModalTitle, { color: colors.text }]}>Déconnexion</Text>
                    <Text style={[styles.logoutModalMessage, { color: colors.secondaryText }]}>
                        Êtes-vous sûr de vouloir vous déconnecter ?
                    </Text>
                    <View style={styles.logoutModalButtons}>
                        <Pressable
                            style={[styles.logoutModalButton, styles.logoutModalButtonCancel, { borderColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.logoutModalButtonText, { color: colors.text }]}>Annuler</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.logoutModalButton, styles.logoutModalButtonConfirm]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.logoutModalButtonTextConfirm}>Se déconnecter</Text>
                        </Pressable>
                    </View>
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
    logoutModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '50%',
    },
    logoutModalTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 16,
    },
    logoutModalMessage: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 24,
    },
    logoutModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 24,
    },
    logoutModalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutModalButtonCancel: {
        borderWidth: 1,
        // backgroundColor: '#FFFFFF',
    },
    logoutModalButtonConfirm: {
        backgroundColor: '#DC3545',
    },
    logoutModalButtonText: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
    },
    logoutModalButtonTextConfirm: {
        fontSize: 14,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});
