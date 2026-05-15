import {
    Camera,
    LineLayer,
    MapView,
    MarkerView,
    ShapeSource,
} from "@rnmapbox/maps";
import React, { memo, type RefObject } from "react";
import { Image, View } from "react-native";

type MapSceneProps = {
    mapRef: RefObject<MapView | null>;
    cameraRef: RefObject<React.ElementRef<typeof Camera> | null>;
    defaultCameraCenter: [number, number];
    defaultCameraZoom: number;
    styles: Record<string, any>;
    isManualMode: boolean;
    handleMapPress: (coords: [number, number]) => void;
    /** Déplacement manuel de la carte (pincer / glisser). */
    onRegionWillChange?: (event: { properties?: { isUserInteraction?: boolean } }) => void;
    routeGeoJSON: any;
    isValidCoordinate: (coord: unknown) => boolean;
    startPoint: { latitude: number; longitude: number } | null;
    endPoint: { latitude: number; longitude: number } | null;
    passengerLocation: { latitude: number; longitude: number } | null;
    busPosition: { latitude: number; longitude: number } | null;
    busRotation: number;
    busMarkerImageStyle: any;
    toMapboxCoordinates: (coord: {
        latitude: number;
        longitude: number;
    }) => [number, number];
    colors: Record<string, any>;
};

/**
 * Carte Mapbox : itinéraire, drapeaux départ/arrivée, position passager et bus (assets inchangés).
 */
function MapSceneInner({
    mapRef,
    cameraRef,
    defaultCameraCenter,
    defaultCameraZoom,
    styles,
    isManualMode,
    handleMapPress,
    onRegionWillChange,
    routeGeoJSON,
    isValidCoordinate,
    startPoint,
    endPoint,
    passengerLocation,
    busPosition,
    busRotation,
    busMarkerImageStyle,
    toMapboxCoordinates,
    colors,
}: MapSceneProps) {
    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            onRegionWillChange={onRegionWillChange}
            onPress={(feature: any) => {
                if (!isManualMode) return;
                let coords: [number, number] | null = null;

                if (feature.geometry && "coordinates" in feature.geometry) {
                    coords = feature.geometry.coordinates as [number, number];
                } else if (feature.coordinates) {
                    if (
                        typeof feature.coordinates.longitude === "number" &&
                        typeof feature.coordinates.latitude === "number"
                    ) {
                        coords = [
                            feature.coordinates.longitude,
                            feature.coordinates.latitude,
                        ];
                    }
                }

                if (coords) handleMapPress(coords);
            }}
        >
            <Camera
                ref={cameraRef}
                defaultSettings={{
                    centerCoordinate: defaultCameraCenter,
                    zoomLevel: defaultCameraZoom,
                }}
            />

            {routeGeoJSON && (
                <ShapeSource id="routeSource" shape={routeGeoJSON}>
                    <LineLayer
                        id="routeLayer"
                        style={{
                            lineColor: colors.ACCENT,
                            lineWidth: 5,
                            lineCap: "round",
                            lineJoin: "round",
                        }}
                    />
                </ShapeSource>
            )}

            {isValidCoordinate(startPoint) && (
                <MarkerView id="start-point" coordinate={toMapboxCoordinates(startPoint)}>
                    <Image
                        source={colors.flagStartImage}
                        style={styles.flagMarker}
                        resizeMode="contain"
                    />
                </MarkerView>
            )}

            {isValidCoordinate(endPoint) && (
                <MarkerView id="end-point" coordinate={toMapboxCoordinates(endPoint)}>
                    <Image
                        source={colors.flagEndImage}
                        style={styles.flagMarker}
                        resizeMode="contain"
                    />
                </MarkerView>
            )}

            {isValidCoordinate(passengerLocation) && (
                <MarkerView id="passenger-location" coordinate={toMapboxCoordinates(passengerLocation)}>
                    <View style={styles.userLocationPinContainer}>
                        <Image
                            source={colors.userLocationPinImage}
                            style={styles.userLocationPinMarker}
                            resizeMode="contain"
                        />
                    </View>
                </MarkerView>
            )}

            {isValidCoordinate(busPosition) && (
                <MarkerView id="bus-marker" coordinate={toMapboxCoordinates(busPosition)}>
                    <View style={styles.busMarkerContainer}>
                        <View style={[{ transform: [{ rotate: `${busRotation}deg` }] }]}>
                            <Image
                                source={colors.busImage}
                                style={busMarkerImageStyle}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                </MarkerView>
            )}
        </MapView>
    );
}

export const MapScene = memo(MapSceneInner);
