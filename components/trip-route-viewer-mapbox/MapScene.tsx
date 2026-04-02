// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import {
    Camera,
    LineLayer,
    MapView,
    MarkerView,
    ShapeSource,
} from "@rnmapbox/maps";
import React from "react";
import { Image, View } from "react-native";

/**
 * Rendu de la carte Mapbox (itinéraire, marqueurs départ/arrivée, bus, passager).
 */
export function MapScene({
    mapRef,
    styles,
    isManualMode,
    handleMapPress,
    cameraCenter,
    cameraZoom,
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
}: any) {
    return (
        <MapView
            ref={mapRef}
            style={styles.map}
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
            {cameraCenter && (
                <Camera
                    centerCoordinate={cameraCenter}
                    zoomLevel={cameraZoom}
                    animationMode="flyTo"
                    animationDuration={500}
                />
            )}

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
                    <Image source={colors.flagStartImage} style={styles.flagMarker} resizeMode="contain" />
                </MarkerView>
            )}

            {isValidCoordinate(endPoint) && (
                <MarkerView id="end-point" coordinate={toMapboxCoordinates(endPoint)}>
                    <Image source={colors.flagEndImage} style={styles.flagMarker} resizeMode="contain" />
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
                            <Image source={colors.busImage} style={busMarkerImageStyle} resizeMode="contain" />
                        </View>
                    </View>
                </MarkerView>
            )}
        </MapView>
    );
}
