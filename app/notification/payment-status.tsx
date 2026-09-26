// @ts-nocheck
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppColors } from '@/hooks/use-app-colors';
import { PaymentNotificationStatus } from '@/interfaces/paymentNotification';
import { formatPaymentMethodDisplay } from '@/constants/paymentMethods';
import { consumePaymentNotificationScreenAccess } from '@/utils/paymentNotificationGate';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Écran détail notification paiement (échec / expiré).
 * Accessible uniquement via un tap push (gate mémoire éphémère).
 */
export default function PaymentNotificationStatusScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const params = useLocalSearchParams<{
        status?: string;
        bookingId?: string;
        bookingCode?: string;
        routeLabel?: string;
        amount?: string;
        currency?: string;
        provider?: string;
        passengerCount?: string;
        travelDate?: string;
    }>();

    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        const ok = consumePaymentNotificationScreenAccess();
        if (!ok || !params.bookingId || !params.status) {
            router.replace('/(tabs)');
            return;
        }
        setAllowed(true);
    }, [params.bookingId, params.status]);

    const status = (params.status || 'failed') as PaymentNotificationStatus;
    const primaryBlue = colors.activeTabColor;

    const headline = useMemo(() => {
        if (status === 'success') return 'Paiement confirmé';
        if (status === 'expired') return 'Session expirée';
        return 'Paiement échoué';
    }, [status]);

    const iconName = status === 'success' ? 'check-circle' : status === 'expired' ? 'timer-off' : 'close-circle';
    const iconColor = status === 'success' ? colors.success : colors.danger;

    const rows = [
        { label: 'Référence', value: params.bookingCode || '—' },
        { label: 'Trajet', value: params.routeLabel || '—' },
        { label: 'Date', value: params.travelDate || '—' },
        {
            label: 'Montant',
            value:
                params.amount && params.amount !== '—'
                    ? `${params.amount} ${params.currency || 'XOF'}`
                    : params.currency || '—',
        },
        { label: 'Moyen de paiement', value: formatPaymentMethodDisplay(params.provider) },
        { label: 'Passagers', value: params.passengerCount || '—' },
    ];

    const goHome = () => router.replace('/(tabs)');

    if (!allowed) {
        return <View style={[styles.container, { backgroundColor: colors.scrollBackground }]} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            <ScreenHeader
                title="Statut du paiement"
                onBack={goHome}
                iconColor={colors.icon}
                textColor={colors.text}
                backgroundColor={colors.headerBackground}
                borderColor={colors.border}
                paddingTop={insets.top}
            />

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: Math.max(insets.bottom, 16) + 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={[
                        styles.statusCard,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Icon name={iconName} size={36} color={iconColor} />
                    <Text style={[styles.title, { color: colors.text }]}>{headline}</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        Détails issus de la notification.
                    </Text>
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    {rows.map((row, index) => (
                        <View
                            key={row.label}
                            style={[
                                styles.row,
                                {
                                    borderBottomColor: colors.border,
                                    borderBottomWidth: index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                                },
                            ]}
                        >
                            <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>
                                {row.label}
                            </Text>
                            <Text style={[styles.rowValue, { color: colors.text }]}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                <AppButton title="Retour à l'accueil" onPress={goHome} style={{ backgroundColor: primaryBlue }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 14,
    },
    statusCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 4,
    },
    rowLabel: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    rowValue: {
        fontFamily: 'Ubuntu_Medium',
        fontSize: 15,
        lineHeight: 20,
    },
});
