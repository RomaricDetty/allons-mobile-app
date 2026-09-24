// @ts-nocheck
import {
    useAppColors } from '@/hooks/use-app-colors';
import { clearPendingPayment,
    getPendingPayment } from '@/utils/pendingPayment';
import { CommonActions,
    useNavigation } from '@react-navigation/native';
import { router,
    useLocalSearchParams } from 'expo-router';
import React,
    { useCallback,
    useEffect,
    useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton } from '@/components/ui/AppButton';

const REASON_MESSAGES: Record<string, string> = {
    failed: 'Le paiement a été refusé ou annulé. Vous pouvez réessayer depuis l’écran de réservation.',
    expired: 'La session de paiement a expiré. Les sièges ont été libérés — recommencez la réservation.',
    missing_booking: 'Impossible de retrouver la réservation associée à ce paiement.',
    cancelled: 'Le paiement a été annulé avant confirmation.',
};

/**
 * Écran de retour paiement en échec (Universal Link / scheme).
 * Bouton pour revenir à l’écran de réservation (passagers / paiement).
 */
export default function PaymentErrorScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ bookingId?: string; reason?: string }>();
    const [hasReservationContext, setHasReservationContext] = useState(false);

    const primaryBlue = colors.activeTabColor;
    const reason = (params.reason as string) || 'failed';
    const message = REASON_MESSAGES[reason] || REASON_MESSAGES.failed;

    useEffect(() => {
        getPendingPayment().then((pending) => {
            setHasReservationContext(!!pending?.trip);
        });
    }, []);

    const goBackToReservation = useCallback(async () => {
        const pending = await getPendingPayment();

        if (pending?.trip) {
            const paramsToRestore = {
                trip: pending.trip,
                returnTrip: pending.returnTrip,
                searchParams: pending.searchParams,
                feesAndTaxes: pending.feesAndTaxes,
            };
            await clearPendingPayment();

            navigation.dispatch(
                CommonActions.reset({
                    index: 1,
                    routes: [
                        { name: '(tabs)' as any },
                        {
                            name: 'trip/passengers-info' as any,
                            params: paramsToRestore,
                        },
                    ],
                })
            );
            return;
        }

        await clearPendingPayment();
        router.replace('/(tabs)');
    }, [navigation]);

    const goHome = useCallback(async () => {
        await clearPendingPayment();
        router.replace('/(tabs)');
    }, []);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 16,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.body}>
                <View style={styles.statusBlock}>
                    <View
                        style={[
                            styles.iconWell,
                            { backgroundColor: colors.dangerMuted },
                        ]}
                    >
                        <Icon name="close" size={32} color={colors.danger} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Paiement échoué
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        {message}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <AppButton
                    title={
                        hasReservationContext
                            ? 'Retour à la réservation'
                            : 'Retour à l’accueil'
                    }
                    onPress={goBackToReservation}
                    style={{ backgroundColor: primaryBlue }}
                />

                {hasReservationContext ? (
                    <AppButton
                        title="Aller à l’accueil"
                        onPress={goHome}
                        variant="secondary"
                    />
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBlock: {
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        gap: 12,
    },
    iconWell: {
        width: 64,
        height: 64,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Ubuntu_Bold',
        fontSize: 22,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Ubuntu_Regular',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    actions: {
        gap: 4,
    },
});
