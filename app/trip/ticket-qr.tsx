// @ts-nocheck
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Note: Vous devrez installer react-native-qrcode-svg ou react-native-qr-code
import QRCode from 'react-native-qrcode-svg';

/**
 * Écran d'affichage du QR code de vérification du ticket
 */
const TicketQR = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    
    // Couleurs dynamiques basées sur le thème
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const tintColor = useThemeColor({}, 'tint');
    
    // Couleurs spécifiques pour l'écran
    const cardBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const secondaryTextColor = colorScheme === 'dark' ? '#9BA1A6' : '#666';
    const headerBackgroundColor = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const headerBorderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0';
    const scrollBackgroundColor = colorScheme === 'dark' ? '#000000' : '#F5F5F5';
    const primaryBlue = tintColor === '#fff' ? '#1776BA' : tintColor;
    const qrCodeBackgroundColor = colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF';

    // Récupération du code du ticket
    const ticketCode = route.params?.ticketCode as string | undefined;
    const ticketId = route.params?.ticketId as string | undefined;
    if (!ticketCode || !ticketId) {
        return (
            <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
                <Text style={{ color: textColor }}>Erreur : Aucun code de ticket trouvé</Text>
            </View>
        );
    }

    // URL ou données pour le QR code (à adapter selon votre API)
    const qrCodeData = `https://allon-frontoffice-ng.onrender.com/verify-ticket/${ticketId}?ref=${ticketCode}`;

    return (
        <View style={[styles.container, { backgroundColor: scrollBackgroundColor }]}>
            {/* Header avec bouton retour */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top,
                    backgroundColor: headerBackgroundColor,
                    borderBottomColor: headerBorderColor
                }
            ]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={25} color={iconColor} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Card principale */}
                <View style={[styles.mainCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    {/* Header avec icône QR */}
                    <View style={styles.qrHeader}>
                        <Icon name="qrcode" size={24} color={primaryBlue} />
                        <Text style={[styles.qrTitle, { color: textColor }]}>Code QR de vérification</Text>
                    </View>

                    {/* Container QR Code */}
                    <View style={[styles.qrContainer, { backgroundColor: qrCodeBackgroundColor }]}>
                        <QRCode
                            value={qrCodeData}
                            size={230}
                            color={primaryBlue}
                            backgroundColor="transparent"
                        />
                        
                        {/* Identifiant du ticket */}
                        <Text style={[styles.ticketIdentifier, { color: textColor, marginTop: 16 }]}>
                            {ticketCode}
                        </Text>
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsContainer}>
                        <View style={styles.instructionRow}>
                            <View style={[styles.checkIcon, { backgroundColor: primaryBlue }]}>
                                <Icon name="check" size={16} color="#FFFFFF" />
                            </View>
                            <Text style={[styles.instructionText, { color: textColor }]}>
                                Scannez ce QR code pour vérifier l'authenticité du ticket
                            </Text>
                        </View>
                        <Text style={[styles.instructionSubtext, { color: secondaryTextColor }]}>
                            Ce code QR contient un lien de vérification sécurisé vers votre ticket.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 32,
        alignItems: 'center',
    },
    mainCard: {
        borderRadius: 12,
        padding: 25,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
    },
    qrHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
    },
    qrTitle: {
        fontSize: 20,
        fontFamily: 'Ubuntu_Bold',
    },
    qrContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        // borderWidth: 1,
        // borderColor: "red",
        // shadowColor: '#000',
        // shadowOffset: {
        //     width: 0,
        //     height: 2,
        // },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3,
    },
    qrPlaceholder: {
        width: 300,
        height: 300,
        borderRadius: 8,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    ticketIdentifier: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
        textAlign: 'center',
        marginTop: 16,
    },
    instructionsContainer: {
        marginTop: 8,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    checkIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    instructionText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 20,
    },
    instructionSubtext: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Regular',
        lineHeight: 18,
        marginLeft: 36,
    },
});

export default TicketQR;
