// @ts-nocheck
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppColors } from '@/hooks/use-app-colors';
import { clearPendingPayment, getPendingPayment } from '@/utils/pendingPayment';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const REASON_MESSAGES: Record<string, string> = {
    failed: 'Le paiement a été refusé ou annulé. Vous pouvez réessayer depuis l’écran de réservation.',
    expired: 'La session de paiement a expiré. Les sièges ont été libérés — recommencez la réservation.',
    missing_booking: 'Impossible de retrouver la réservation associée à ce paiement.',
    cancelled: 'Le paiement a été annulé avant confirmation.',
};

const REASON_TITLES: Record<string, string> = {
    failed: 'Paiement échoué',
    expired: 'Session expirée',
    missing_booking: 'Réservation introuvable',
    cancelled: 'Paiement annulé',
};

/**
 * Écran de retour paiement en échec (Universal Link / scheme).
 */
export default function PaymentErrorScreen() {
    const insets = useSafeAreaInsets();
    const colors = useAppColors();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ bookingId?: string; reason?: string }>();
    const [hasReservationContext, setHasReservationContext] = useState(false);

    const primaryBlue = colors.activeTabColor;
    const reason = (params.reason as string) || 'failed';
    const title = REASON_TITLES[reason] || REASON_TITLES.failed;
    const message = REASON_MESSAGES[reason] || REASON_MESSAGES.failed;
    const statusIcon = reason === 'expired' ? 'timer-off' : 'close-circle';

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
        <View style={[styles.container, { backgroundColor: colors.scrollBackground }]}>
            <ScreenHeader
                title={title}
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
                <View style={styles.statusBlock}>
                    <Icon name={statusIcon} size={40} color={colors.danger} />
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        {message}
                    </Text>
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        gap: 28,
    },
    statusBlock: {
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        alignItems: 'center',
        gap: 12,
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
        gap: 8,
    },
});
