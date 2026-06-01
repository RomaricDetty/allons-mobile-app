import { socketBaseUrl } from '@/api/config';
import { Trip } from '@/types';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const LOGO_SIZE = 40;

type CompanyLogoBadgeProps = {
    logoUrl?: string | null;
    abbreviation?: string;
};

/**
 * Normalise une URL de logo (absolue ou relative au backend).
 */
export function resolveCompanyLogoUrl(logo?: string | null): string | undefined {
    const raw = logo?.trim();
    if (!raw) return undefined;
    if (/^https?:\/\//i.test(raw)) return raw;
    const origin = socketBaseUrl.replace(/\/$/, '');
    return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/**
 * Récupère l’URL du logo compagnie depuis les champs renvoyés par l’API.
 */
export function getTripCompanyLogoUrl(trip: Trip): string | undefined {
    const extended = trip as Trip & {
        company_logo?: string;
        company?: { logo?: string };
    };
    return resolveCompanyLogoUrl(
        trip.companyLogo || extended.company_logo || extended.company?.logo,
    );
}

/**
 * Affiche le logo de la compagnie dans l’emplacement dédié, ou l’abréviation en repli.
 */
export function CompanyLogoBadge({ logoUrl, abbreviation }: CompanyLogoBadgeProps) {
    const uri = resolveCompanyLogoUrl(logoUrl);
    const hasLogo = !!uri;

    return (
        <View
            style={[
                styles.container,
                hasLogo ? styles.containerWithImage : styles.containerFallback,
            ]}
        >
            {hasLogo ? (
                <Image
                    source={{ uri }}
                    style={styles.image}
                    contentFit="contain"
                    accessibilityLabel={abbreviation ? `Logo ${abbreviation}` : 'Logo compagnie'}
                />
            ) : (
                <Text style={styles.fallbackText} numberOfLines={1}>
                    {abbreviation || '—'}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    containerWithImage: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    containerFallback: {
        backgroundColor: '#1776BA',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    fallbackText: {
        fontSize: 12,
        fontFamily: 'Ubuntu_Bold',
        color: '#FFFFFF',
    },
});
