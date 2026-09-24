import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StationRowProps {
    label: string;
    stationName: string;
    cityName?: string;
    time?: string;
    dotColor: string;
    textColor: string;
    secondaryTextColor: string;
    borderColor: string;
    isLast?: boolean;
}

/**
 * Ligne de gare dans la timeline du billet
 */
export const StationRow: React.FC<StationRowProps> = ({
    label,
    stationName,
    cityName,
    time,
    dotColor,
    textColor,
    secondaryTextColor,
    borderColor,
    isLast = false,
}) => {
    const displayName = stationName?.trim() || cityName?.trim() || '—';
    const cityTrimmed = cityName?.trim() ?? '';
    const showCity =
        Boolean(cityTrimmed) &&
        cityTrimmed.toLowerCase() !== displayName.toLowerCase();

    return (
        <View style={styles.row}>
            <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: dotColor, borderColor }]} />
                {!isLast && <View style={[styles.line, { backgroundColor: borderColor }]} />}
            </View>
            <View style={styles.content}>
                <View style={styles.topLine}>
                    <Text style={[styles.label, { color: secondaryTextColor }]}>{label}</Text>
                    {time ? (
                        <Text style={[styles.time, { color: textColor }]}>{time}</Text>
                    ) : null}
                </View>
                <Text style={[styles.stationName, { color: textColor }]} numberOfLines={2}>
                    {displayName}
                </Text>
                {showCity ? (
                    <Text style={[styles.cityName, { color: secondaryTextColor }]} numberOfLines={1}>
                        {cityTrimmed}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        minHeight: 56,
    },
    rail: {
        width: 20,
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        marginTop: 4,
    },
    line: {
        flex: 1,
        width: 2,
        marginVertical: 4,
        borderRadius: 1,
    },
    content: {
        flex: 1,
        paddingBottom: 16,
        paddingLeft: 10,
    },
    topLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    time: {
        fontSize: 15,
        fontFamily: 'Ubuntu_Bold',
    },
    stationName: {
        fontSize: 16,
        fontFamily: 'Ubuntu_Medium',
    },
    cityName: {
        fontSize: 13,
        fontFamily: 'Ubuntu_Regular',
        marginTop: 2,
    },
});
