// @ts-nocheck
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ErrorModalProps {
    visible: boolean;
    title: string;
    errors: string[];
    onClose: () => void;
}

/**
 * Composant modal pour afficher les erreurs de validation de manière esthétique
 */
export const ErrorModal = ({
    visible,
    title,
    errors,
    onClose
}: ErrorModalProps) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.overlay}
                onPress={onClose}
            >
                <View
                    style={styles.modalContent}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Header avec icône d'alerte */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Icon name="alert-circle" size={28} color="#FF6B6B" />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    {/* Liste des erreurs */}
                    <ScrollView 
                        style={styles.errorsContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {errors.map((error, index) => (
                            <View key={index} style={styles.errorItem}>
                                {/* <View style={styles.errorBullet}>
                                    <Icon name="close-circle" size={16} color="#FF6B6B" />
                                </View> */}
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Bouton de fermeture */}
                    <Pressable
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>OK</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
        textAlign: 'center',
    },
    errorsContainer: {
        maxHeight: 300,
        marginBottom: 20,
    },
    errorItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingLeft: 4,
    },
    errorBullet: {
        marginRight: 10,
        marginTop: 2,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        color: '#333',
        lineHeight: 20,
    },
    closeButton: {
        backgroundColor: '#1776BA',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        // marginTop: 20,
    },
    closeButtonText: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});

