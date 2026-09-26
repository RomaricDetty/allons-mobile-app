import { SeatBadge } from '@/components/ui/SeatBadge';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Passenger {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    seatNumber?: number | null;
    seatNumberReturn?: number | null;
}

interface PassengerCardExtendedProps {
    passenger: Passenger;
    textColor: string;
    secondaryTextColor: string;
    primaryBlue: string;
    backgroundColor: string;
    borderColor: string;
    seatNumber?: number | null;
}

/**
 * Carte passager confirmation — même layout siège que le billet.
 */
export const PassengerCardExtended = memo<PassengerCardExtendedProps>(({
    passenger,
    textColor,
    secondaryTextColor,
    primaryBlue,
    backgroundColor,
    borderColor,
    seatNumber,
}) => {
    const hasSeat = seatNumber !== null && seatNumber !== undefined;

    return (
        <View style={[styles.passengerCard, { backgroundColor, borderColor }]}>
            <View style={styles.topRow}>
                <View style={styles.passengerInfo}>
                    <Text style={[styles.passengerName, { color: textColor }]} numberOfLines={1}>
                        {passenger.firstName} {passenger.lastName}
                    </Text>
                    {passenger.email ? (
                        <Text style={[styles.passengerDetail, { color: secondaryTextColor }]} numberOfLines={1}>
                            {passenger.email}
                        </Text>
                    ) : null}
                    {passenger.phone ? (
                        <Text style={[styles.passengerDetail, { color: secondaryTextColor }]}>
                            {passenger.phone}
                        </Text>
                    ) : null}
                </View>
                {hasSeat ? (
                    <SeatBadge
                        seatNumber={seatNumber!}
                        primaryBlue={primaryBlue}
                        secondaryTextColor={secondaryTextColor}
                        borderColor={borderColor}
                    />
                ) : null}
            </View>
        </View>
    );
});

PassengerCardExtended.displayName = 'PassengerCardExtended';

const styles = StyleSheet.create({
    passengerCard: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    passengerInfo: {
        flex: 1,
        minWidth: 0,
    },
    passengerName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Bold',
        marginBottom: 6,
    },
    passengerDetail: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginBottom: 2,
    },
});
