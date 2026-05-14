import Constants from "expo-constants";

/** Jeton de secours (dev) si aucune variable d’environnement ni extra Expo n’est défini. */
const FALLBACK_MAPBOX_TOKEN =
    "sk.eyJ1IjoiZGV0dHktcm9tYXJpYyIsImEiOiJjbWtxMzRmbzkwam5pM2dzOTkxbDBxOHF0In0.FTLTCaKPMw8mPG_9CvIhiw";

/**
 * Résout le jeton d’accès Mapbox (priorité : env public → extra Expo → secours).
 */
export function resolveMapboxAccessToken(): string {
    const fromEnv = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (fromEnv && String(fromEnv).trim() !== "") return String(fromEnv).trim();

    const extra = Constants.expoConfig?.extra as { mapboxAccessToken?: string } | undefined;
    if (extra?.mapboxAccessToken && extra.mapboxAccessToken.trim() !== "") {
        return extra.mapboxAccessToken.trim();
    }

    return FALLBACK_MAPBOX_TOKEN;
}
