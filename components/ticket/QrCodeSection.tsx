import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Interface pour les props du composant QrCodeSection
 */
interface QrCodeSectionProps {
    qrCode: string;
    isLoadingQrCode: boolean;
    error: string | null;
    primaryBlue: string;
    textColor: string;
    secondaryTextColor: string;
    onRetry: () => void;
    onViewQRCode: () => void;
}

/**
 * Composant pour afficher la section QR Code
 */
export const QrCodeSection: React.FC<QrCodeSectionProps> = ({
    qrCode,
    isLoadingQrCode,
    error,
    primaryBlue,
    textColor,
    secondaryTextColor,
    onRetry,
    onViewQRCode,
}) => {
    return (
        <View style={styles.qrCodeContainer}>
            {isLoadingQrCode ? (
                <ActivityIndicator size="large" color={primaryBlue} />
            ) : error || !qrCode || qrCode.trim() === '' ? (
                <View style={styles.qrCodeErrorContainer}>
                    <Icon name="alert-circle-outline" size={40} color={secondaryTextColor} />
                    <Text style={[styles.qrCodeErrorText, { color: secondaryTextColor }]}>
                        Impossible de charger le QR Code
                    </Text>
                    <TouchableOpacity
                        onPress={onRetry}
                        style={[styles.retryButton, { borderColor: primaryBlue }]}
                    >
                        <Text style={[styles.retryButtonText, { color: primaryBlue }]}>
                            Réessayer
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <QRCode
                        value={qrCode}
                        size={150}
                        color={primaryBlue}
                        backgroundColor="transparent"
                    />
                    <TouchableOpacity
                        onPress={onViewQRCode}
                        activeOpacity={1}
                        style={styles.qrCodeOverlay}
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    qrCodeContainer: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrCodeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 150,
        height: 150,
    },
    qrCodeErrorContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    qrCodeErrorText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    retryButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    retryButtonText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
    },
});

