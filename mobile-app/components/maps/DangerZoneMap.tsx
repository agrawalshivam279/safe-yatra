/**
 * Safe Yatra — Mobile App
 * DangerZoneMap Component (MapView with PostGIS Dynamic Danger Polygons & User Marker).
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Polygon, Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';

export type DangerTier = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface DangerZone {
  id: string;
  name: string;
  category?: string;
  dangerScore: number;
  currentTier: DangerTier;
  centerLat: number;
  centerLng: number;
  radiusMeters?: number;
  boundary?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | string;
  justification?: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface DangerZoneMapProps {
  zones: DangerZone[];
  userLocation?: LatLng | null;
  onSelectZone?: (zone: DangerZone) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

/**
 * Returns color mapping and transparency levels per GEMINI.md specification.
 */
export function getTierColor(tier: DangerTier): { fillColor: string; strokeColor: string; label: string } {
  switch (tier) {
    case 'LOW':
      return {
        fillColor: 'rgba(39, 174, 96, 0.30)',
        strokeColor: '#27AE60',
        label: 'Low Risk',
      };
    case 'MODERATE':
      return {
        fillColor: 'rgba(243, 156, 18, 0.35)',
        strokeColor: '#F39C12',
        label: 'Moderate Caution',
      };
    case 'SEVERE':
      return {
        fillColor: 'rgba(230, 126, 34, 0.45)',
        strokeColor: '#E67E22',
        label: 'Severe Hazard',
      };
    case 'CRITICAL':
    default:
      return {
        fillColor: 'rgba(231, 76, 60, 0.55)',
        strokeColor: '#E74C3C',
        label: 'Critical Danger',
      };
  }
}

/**
 * Inverts PostGIS GeoJSON [lng, lat] pairs to react-native-maps { latitude, longitude }[]
 */
export function parseGeoJsonCoordinates(boundary: DangerZone['boundary']): LatLng[] {
  if (!boundary) return [];

  let geoObj = boundary;
  if (typeof boundary === 'string') {
    try {
      geoObj = JSON.parse(boundary);
    } catch {
      return [];
    }
  }

  if (typeof geoObj === 'object' && geoObj !== null && 'coordinates' in geoObj) {
    const rawCoords = geoObj.coordinates;
    if (Array.isArray(rawCoords) && rawCoords.length > 0) {
      const ring = Array.isArray(rawCoords[0]) ? rawCoords[0] : [];
      return (ring as number[][]).map((point) => ({
        latitude: point[1],
        longitude: point[0],
      }));
    }
  }

  return [];
}

const DEFAULT_REGION = {
  latitude: 30.7352, // Kedarnath Pilgrimage Hotspot
  longitude: 79.0669,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function DangerZoneMap({
  zones,
  userLocation,
  onSelectZone,
  initialRegion = DEFAULT_REGION,
}: DangerZoneMapProps) {
  const mapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : initialRegion;

  return (
    <View style={styles.container} testID="danger-zone-map-container">
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Render PostGIS Dynamic Danger Polygons */}
        {zones.map((zone) => {
          const polygonCoords = parseGeoJsonCoordinates(zone.boundary);
          const { fillColor, strokeColor } = getTierColor(zone.currentTier);

          if (polygonCoords.length < 3) return null;

          return (
            <Polygon
              key={`zone-poly-${zone.id}`}
              coordinates={polygonCoords}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={2}
              tappable={true}
              onPress={() => onSelectZone && onSelectZone(zone)}
            />
          );
        })}

        {/* Render Zone Center Markers with Callouts */}
        {zones.map((zone) => {
          const { strokeColor, label } = getTierColor(zone.currentTier);
          if (!zone.centerLat || !zone.centerLng) return null;

          return (
            <Marker
              key={`zone-marker-${zone.id}`}
              coordinate={{ latitude: zone.centerLat, longitude: zone.centerLng }}
              title={zone.name}
              description={`Danger Score: ${zone.dangerScore} (${label})`}
              pinColor={strokeColor}
              onPress={() => onSelectZone && onSelectZone(zone)}
            >
              <Callout style={styles.callout}>
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutTitle}>{zone.name}</Text>
                  <Text style={[styles.calloutTier, { color: strokeColor }]}>
                    Score: {zone.dangerScore} — {label}
                  </Text>
                  {zone.justification && (
                    <Text style={styles.calloutJustification} numberOfLines={2}>
                      {zone.justification}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* User GPS Location Marker */}
        {userLocation && (
          <Marker
            key="user-current-location"
            coordinate={userLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerPulse}>
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarkerPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  callout: {
    minWidth: 180,
    maxWidth: 260,
    padding: 8,
  },
  calloutContent: {
    gap: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  calloutTier: {
    fontSize: 12,
    fontWeight: '600',
  },
  calloutJustification: {
    fontSize: 11,
    color: '#475569',
  },
});
