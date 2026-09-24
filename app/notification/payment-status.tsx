// @ts-nocheck
import {
    useAppColors } from '@/hooks/use-app-colors';
import { PaymentNotificationStatus } from '@/interfaces/paymentNotification';
import { consumePaymentNotificationScreenAccess } from '@/utils/paymentNotificationGate';
import { router,
    useLocalSearchParams } from 'expo-router';
import React,
    { useEffect,
    useMemo,
    useState } from 'react';
import { Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton } from '@/components/ui/AppButton';

/**
 * Écran détail notification paiement.
 * Accessible uniquement via un tap push (gate mémoire éphémère).
 * Aucune persistance : les données viennent uniquement des params de la notif.
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

    const iconName = status === 'success' ? 'check' : status === 'expired' ? 'timer-off' : 'close';
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
        { label: 'Moyen de paiement', value: params.provider || '—' },
        { label: 'Passagers', value: params.passengerCount || '—' },
    ];

    if (!allowed) {
        return <View style={[styles.container, { backgroundColor: colors.background }]} />;
    }

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.replace('/(tabs)')}
                    hitSlop={12}
                    style={styles.closeHit}
                >
                    <Icon name="close" size={22} color={colors.text} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.iconSlot}>
                    <Icon name={iconName} size={28} color={iconColor} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{headline}</Text>
                <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                    Détails issus de la notification — non enregistrés dans l’application.
                </Text>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    {rows.map((row) => (
                        <View key={row.label} style={[styles.row, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>
                                {row.label}
                            </Text>
                            <Text style={[styles.rowValue, { color: colors.text }]}>
                                {row.value}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <AppButton
                title="Fermer"
                onPress={() => router.replace('/(tabs)')}
                style={{ backgroundColor: primaryBlue }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    closeHit: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingBottom: 24,
        gap: 12,
    },
    iconSlot: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 22,
    },
    subtitle: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
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
