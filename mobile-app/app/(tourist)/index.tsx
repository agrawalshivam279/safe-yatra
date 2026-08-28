/**
 * Safe Yatra — Tourist Home Screen
 * Interactive map with color-coded danger zones.
 */

import { View, Text, StyleSheet } from 'react-native';
// import MapView from 'react-native-maps';

export default function TouristHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Safe Yatra</Text>
      <Text style={styles.subtitle}>Interactive Danger Zone Map</Text>
      {/* TODO: Add MapView with DangerZoneOverlay and GeofenceOverlay */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Map Component</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 60,
    color: '#1a5276',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    margin: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 18,
  },
});
