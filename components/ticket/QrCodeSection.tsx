import { AppButton } from '@/components/ui/AppButton';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface QrCodeSectionProps {
    qrCode: string;
    isLoadingQrCode: boolean;
    error: string | null;
    primaryBlue: string;
    textColor: string;
    secondaryTextColor: string;
    frameBackground: string;
    borderColor: string;
    onRetry: () => void;
    onViewQRCode: () => void;
}

/**
 * Section QR du billet : cadre dédié + accès agrandi
 */
export const QrCodeSection: React.FC<QrCodeSectionProps> = ({
    qrCode,
    isLoadingQrCode,
    error,
    primaryBlue,
    textColor,
    secondaryTextColor,
    frameBackground,
    borderColor,
    onRetry,
    onViewQRCode,
}) => {
    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.frame,
                    {
                        backgroundColor: frameBackground,
                        borderColor,
                    },
                ]}
            >
                {isLoadingQrCode ? (
                    <ActivityIndicator size="large" color={primaryBlue} />
                ) : error || !qrCode || qrCode.trim() === '' ? (
                    <View style={styles.errorBox}>
                        <View style={styles.iconBlock}>
                            <Icon name="qrcode-remove" size={22} color={secondaryTextColor} />
                        </View>
                        <Text style={[styles.errorText, { color: secondaryTextColor }]}>
                            Impossible de charger le QR Code
                        </Text>
                        <AppButton
                            title="Réessayer"
                            onPress={onRetry}
                            variant="secondary"
                            fullWidth={false}
                            style={styles.retryButton}
                        />
                    </View>
                ) : (
                    <QRCode
                        value={qrCode}
                        size={168}
                        color={primaryBlue}
                        backgroundColor="transparent"
                    />
                )}
            </View>

            {qrCode && !error && !isLoadingQrCode ? (
                <>
                    <Text style={[styles.hint, { color: secondaryTextColor }]}>
                        Présentez ce code à l’embarquement
                    </Text>
                    <AppButton
                        title="Agrandir le QR code"
                        onPress={onViewQRCode}
                        variant="secondary"
                        icon={<Icon name="fullscreen" size={20} color={primaryBlue} />}
                    />
                </>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        gap: 14,
        alignItems: 'stretch',
    },
    frame: {
        alignSelf: 'center',
        width: 200,
        height: 200,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    hint: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
        lineHeight: 18,
    },
    errorBox: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 8,
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        textAlign: 'center',
    },
    retryButton: {
        minWidth: 120,
    },
});
