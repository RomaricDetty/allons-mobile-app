/**
 * Config Expo dynamique : secrets Mapbox hors repo, allowBackup Android off.
 * L’accès runtime carte = EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN (pk.*).
 * Le download SDK natif = MAPBOX_DOWNLOAD_TOKEN (sk.*) uniquement en CI / .env local.
 */
const appJson = require("./app.json");

module.exports = () => {
    const config = { ...appJson.expo };

    config.android = {
        ...config.android,
        allowBackup: false,
    };

    const downloadToken =
        process.env.MAPBOX_DOWNLOAD_TOKEN ||
        process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ||
        "";

    config.plugins = (config.plugins || []).map((plugin) => {
        if (Array.isArray(plugin) && plugin[0] === "@rnmapbox/maps") {
            return [
                "@rnmapbox/maps",
                {
                    ...(plugin[1] || {}),
                    RNMAPBOX_MAPS_DOWNLOAD_TOKEN: downloadToken,
                    RNMapboxMapsVersion: (plugin[1] && plugin[1].RNMapboxMapsVersion) || "11.18.2",
                },
            ];
        }
        return plugin;
    });

    config.extra = {
        ...(config.extra || {}),
        mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
    };

    return config;
};
