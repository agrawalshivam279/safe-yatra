/**
 * Safe Yatra — Mobile App
 * Yaatri Mitra Active Rescue Navigation & Response Lifecycle Screen.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { socketService } from '../../services/socketService';
import {
  volunteerService,
  ActiveSOSItem,
} from '../../services/volunteerService';

export default function ActiveSOSRescueScreen() {
  const router = useRouter();

  const [activeSOS, setActiveSOS] = useState<ActiveSOSItem>({
    id: 'sos-demo-active-01',
    userId: 'usr-pilgrim-99',
    status: 'VOLUNTEER_ACCEPTED',
    batteryLevel: 14,
    distanceMeters: 380,
    estimatedEtaMinutes: 2,
    lat: 18.7546,
    lng: 73.4062,
    createdAt: new Date().toISOString(),
    user: {
      id: 'usr-pilgrim-99',
      fullName: 'Ananya Sen',
      phone: '+919876543210',
    },
  });

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isArrived, setIsArrived] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start 5-second GPS location streaming to WebSocket hub
  useEffect(() => {
    let isMounted = true;

    const streamGPS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          if (isMounted) {
            setCurrentCoords({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });

            // Stream location to WebSocket
            socketService.emitLocationUpdate({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracy: loc.coords.accuracy || 5,
              speed: loc.coords.speed || 1.2,
            });

            // Also ping volunteer location API
            await volunteerService.recordLocation(
              loc.coords.latitude,
              loc.coords.longitude
            );
          }
        }
      } catch (err) {
        console.warn('GPS streaming error during rescue:', err);
      }
    };

    streamGPS();
    streamIntervalRef.current = setInterval(streamGPS, 5000);

    return () => {
      isMounted = false;
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, []);

  const handleOpenMaps = () => {
    const destLat = activeSOS.lat || 18.7546;
    const destLng = activeSOS.lng || 73.4062;

    const url =
      Platform.OS === 'android'
        ? `geo:${destLat},${destLng}?q=${destLat},${destLng}(Tourist Location)`
        : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;

    Linking.openURL(url);
  };

  const handleCallTourist = () => {
    if (activeSOS.user?.phone) {
      Linking.openURL(`tel:${activeSOS.user.phone}`);
    }
  };

  const handleConfirmArrival = async () => {
    setIsProcessing(true);
    try {
      await volunteerService.arriveSOS(activeSOS.id);
      setIsArrived(true);
      setActiveSOS((prev) => ({ ...prev, status: 'VOLUNTEER_ARRIVED' }));
      AccessibilityInfo?.announceForAccessibility?.(
        'Arrival confirmed. You are at the tourist location.'
      );
    } catch (err: any) {
      Alert.alert('Arrival Error', err?.message || 'Failed to record arrival.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveRescue = async () => {
    Alert.alert(
      'Resolve Emergency Rescue?',
      'Please confirm the tourist is safe and emergency assistance has concluded.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Confirm & Resolve',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await volunteerService.resolveSOS(activeSOS.id, 'Tourist assisted safely');
              AccessibilityInfo?.announceForAccessibility?.(
                'Emergency resolved. Thank you for your service.'
              );
              router.replace('/(mitra)');
            } catch (err: any) {
              Alert.alert('Resolution Error', err?.message || 'Failed to resolve SOS.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Top Emergency Status Banner */}
        <View
          style={[
            styles.statusHeader,
            isArrived ? styles.statusHeaderArrived : styles.statusHeaderEnRoute,
          ]}
        >
          <Text style={styles.statusIcon}>{isArrived ? '🤝' : '🏃'}</Text>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {isArrived ? 'ARRIVED AT SCENE' : 'RESCUE IN PROGRESS — EN ROUTE'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isArrived
                ? 'Assisting tourist at coordinates. Confirm safety before resolving.'
                : 'Streaming your real-time approach to the tourist and command center (5s GPS)'}
            </Text>
          </View>
        </View>

        {/* Distressed Tourist Profile Card */}
        <View style={styles.touristCard}>
          <Text style={styles.cardSectionTitle}>Distressed Pilgrim Details</Text>
          <View style={styles.touristRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.touristInfo}>
              <Text style={styles.touristName}>
                {activeSOS.user?.fullName || 'Distressed Pilgrim'}
              </Text>
              <Text style={styles.touristStatus}>🚨 Distress Call Active</Text>
            </View>
            {activeSOS.user?.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallTourist}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Call tourist at ${activeSOS.user.phone}`}
              >
                <Text style={styles.callIcon}>📞</Text>
                <Text style={styles.callLabel}>Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Target Coordinates & Battery */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryIcon}>📍</Text>
              <Text style={styles.telemetryValue}>
                {activeSOS.distanceMeters !== undefined
                  ? `${activeSOS.distanceMeters}m`
                  : '380m'}
              </Text>
              <Text style={styles.telemetryLabel}>DISTANCE</Text>
            </View>
            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryIcon}>⏱️</Text>
              <Text style={styles.telemetryValue}>
                {activeSOS.estimatedEtaMinutes !== undefined
                  ? `${activeSOS.estimatedEtaMinutes} min`
                  : '~2 min'}
              </Text>
              <Text style={styles.telemetryLabel}>APPROACH ETA</Text>
            </View>
            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryIcon}>🔋</Text>
              <Text style={styles.telemetryValue}>
                {activeSOS.batteryLevel !== undefined
                  ? `${activeSOS.batteryLevel}%`
                  : '14%'}
              </Text>
              <Text style={styles.telemetryLabel}>PHONE BATTERY</Text>
            </View>
          </View>
        </View>

        {/* Turn-by-Turn Navigation Map Launcher */}
        <TouchableOpacity
          style={styles.mapsLauncher}
          onPress={handleOpenMaps}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open Turn by Turn Navigation in Google Maps"
        >
          <Text style={styles.mapsIcon}>🗺️</Text>
          <View style={styles.mapsTextContainer}>
            <Text style={styles.mapsTitle}>Open Turn-by-Turn Navigation</Text>
            <Text style={styles.mapsSubtitle}>
              Launches Google Maps / Apple Maps to tourist location
            </Text>
          </View>
          <Text style={styles.mapsArrow}>➔</Text>
        </TouchableOpacity>

        {/* Lifecycle Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isArrived ? (
            <TouchableOpacity
              style={[styles.arriveButton, isProcessing && styles.buttonDisabled]}
              onPress={handleConfirmArrival}
              disabled={isProcessing}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Confirm arrival at tourist location"
            >
              <Text style={styles.arriveButtonText}>
                {isProcessing ? 'CONFIRMING...' : "I'VE ARRIVED AT SCENE 🤝"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.resolveButton, isProcessing && styles.buttonDisabled]}
              onPress={handleResolveRescue}
              disabled={isProcessing}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Mark emergency rescue as safely resolved"
            >
              <Text style={styles.resolveButtonText}>
                {isProcessing ? 'RESOLVING...' : 'MARK RESCUE RESOLVED ✅'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  statusHeaderEnRoute: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  statusHeaderArrived: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  statusIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  touristCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
  },
  cardSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  touristRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  touristInfo: {
    flex: 1,
  },
  touristName: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
  },
  touristStatus: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minHeight: 44,
  },
  callIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  callLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  telemetryIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  telemetryValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  telemetryLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  mapsLauncher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    minHeight: 64,
  },
  mapsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  mapsTextContainer: {
    flex: 1,
  },
  mapsTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  mapsSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  mapsArrow: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  arriveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    elevation: 6,
  },
  arriveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resolveButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    elevation: 6,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
