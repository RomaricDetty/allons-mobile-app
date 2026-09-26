import Constants from "expo-constants";

/**
 * Résout le jeton d’accès Mapbox **public** (`pk.*`) uniquement.
 * Priorité : EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN → extra Expo.
 * Aucun secret `sk.*` ne doit vivre dans le bundle.
 */
export function resolveMapboxAccessToken(): string {
    const fromEnv = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (fromEnv && String(fromEnv).trim() !== "") {
        return String(fromEnv).trim();
    }

    const extra = Constants.expoConfig?.extra as { mapboxAccessToken?: string } | undefined;
    if (extra?.mapboxAccessToken && extra.mapboxAccessToken.trim() !== "") {
        return extra.mapboxAccessToken.trim();
    }

    if (__DEV__) {
        console.warn(
            "[Mapbox] EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN manquant. " +
                "Définir un token public pk.* dans .env (voir .env.example)."
        );
    }
    return "";
}
