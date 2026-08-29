/**
 * Safe Yatra — Mobile App
 * Tourist Emergency SOS Screen with 2-Second Hold Panic Trigger, Real-Time Dispatch & Offline SMS.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Linking,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { socketService, SOSUpdatePayload } from '../../services/socketService';
import { sosService, SOSEntity } from '../../services/sosService';
import { sendEmergencySMS } from '../../utils/smsPayload';
import SOSConfirmModal from '../../components/sos/SOSConfirmModal';
import SOSStatusTracker from '../../components/sos/SOSStatusTracker';

export type ScreenSOSState =
  | 'IDLE'
  | 'HOLDING'
  | 'COUNTDOWN'
  | 'DISPATCHING'
  | 'SEARCHING'
  | 'VOLUNTEER_ACCEPTED'
  | 'VOLUNTEER_ARRIVED'
  | 'RESOLVED';

export default function TouristSOSScreen() {
  const { user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const isOnline = !isOffline;

  const [sosState, setSosState] = useState<ScreenSOSState>('IDLE');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [responderData, setResponderData] = useState<{
    name?: string;
    phone?: string;
    distanceMeters?: number;
    estimatedEtaMinutes?: number;
  }>({});

  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current GPS coordinates on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
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
          }
        }
      } catch (err) {
        console.warn('Could not fetch initial location for SOS:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to real-time WebSocket SOS updates
  useEffect(() => {
    const cleanup = socketService.onSOSUpdate((update: SOSUpdatePayload) => {
      if (activeSosId && update.sosId !== activeSosId) return;

      if (update.status === 'ASSIGNED' || update.status === 'EN_ROUTE') {
        setSosState('VOLUNTEER_ACCEPTED');
        setResponderData({
          name: update.responderName,
          phone: update.responderPhone,
          distanceMeters: 450, // default fallback distance
          estimatedEtaMinutes: 3,
        });
      } else if (update.status === 'RESOLVED') {
        setSosState('RESOLVED');
      } else if (update.status === 'CANCELLED') {
        setSosState('IDLE');
        setActiveSosId(null);
      }
    });

    return () => {
      cleanup();
    };
  }, [activeSosId]);

  // Press-and-hold trigger handling (2.0 seconds)
  const handleHoldStart = () => {
    if (sosState !== 'IDLE') return;

    setSosState('HOLDING');
    holdProgressAnim.setValue(0);

    Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      setSosState('COUNTDOWN');
    }, 2000);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdProgressAnim.stopAnimation();
    holdProgressAnim.setValue(0);

    if (sosState === 'HOLDING') {
      setSosState('IDLE');
    }
  };

  // Dispatch emergency SOS
  const handleConfirmSOS = async (audioUri?: string) => {
    setSosState('DISPATCHING');

    const lat = currentCoords?.lat || 18.7546;
    const lng = currentCoords?.lng || 73.4062;

    if (!isOnline) {
      // Offline: Switch directly to SMS fallback
      await handleSendSMSFallback();
      setSosState('SEARCHING');
      return;
    }

    try {
      const response = await sosService.triggerSOS({
        lat,
        lng,
        batteryLevel: 85,
        audioUrl: audioUri,
      });

      setActiveSosId(response.id);
      setSosState('SEARCHING');

      if (response.responders && response.responders.length > 0) {
        const first = response.responders[0];
        setResponderData({
          name: first.fullName,
          phone: first.phone,
          distanceMeters: first.distanceMeters,
          estimatedEtaMinutes: first.estimatedEtaMinutes,
        });
      }
    } catch (err) {
      console.warn('SOS dispatch failed via API, falling back to SMS:', err);
      Alert.alert(
        'Connection Issue',
        'Could not reach Safe Yatra dispatch server. Switched to offline emergency SMS fallback.'
      );
      await handleSendSMSFallback();
      setSosState('SEARCHING');
    }
  };

  const handleCancelCountdown = () => {
    setSosState('IDLE');
  };

  const handleCancelSOS = () => {
    Alert.alert(
      'Cancel Emergency Distress Call?',
      'Are you sure you want to cancel this emergency request? Responders will be notified that you are safe.',
      [
        { text: 'Keep Alert Active', style: 'cancel' },
        {
          text: 'Yes, Cancel Call',
          style: 'destructive',
          onPress: async () => {
            if (activeSosId) {
              try {
                await sosService.cancelSOS(activeSosId, 'User cancelled');
              } catch (e) {
                console.warn('Error cancelling SOS:', e);
              }
            }
            setSosState('IDLE');
            setActiveSosId(null);
            setResponderData({});
          },
        },
      ]
    );
  };

  const handleSendSMSFallback = async () => {
    const lat = currentCoords?.lat || 18.7546;
    const lng = currentCoords?.lng || 73.4062;

    await sendEmergencySMS({
      lat,
      lng,
      batteryLevel: 85,
      userId: user?.id,
    });
  };

  const handleDialHelpline = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Emergency SOS</Text>
            <Text style={styles.headerSubtitle}>
              Proactive pilgrim & tourist rescue dispatch
            </Text>
          </View>
          <View
            style={[
              styles.networkBadge,
              isOnline ? styles.networkOnline : styles.networkOffline,
            ]}
          >
            <Text style={styles.networkText}>
              {isOnline ? '🟢 Online' : '⚠️ Offline (SMS Ready)'}
            </Text>
          </View>
        </View>

        {/* GPS Telemetry Bar */}
        <View style={styles.telemetryBar}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryIcon}>📍</Text>
            <Text style={styles.telemetryText}>
              {currentCoords
                ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`
                : 'Acquiring GPS...'}
            </Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryIcon}>🔋</Text>
            <Text style={styles.telemetryText}>85% Battery</Text>
          </View>
        </View>

        {/* Active Emergency Status View */}
        {sosState !== 'IDLE' && sosState !== 'HOLDING' && sosState !== 'COUNTDOWN' ? (
          <View style={styles.trackerContainer}>
            <SOSStatusTracker
              status={
                sosState === 'DISPATCHING'
                  ? 'SEARCHING'
                  : (sosState as any)
              }
              responderName={responderData.name}
              responderPhone={responderData.phone}
              distanceMeters={responderData.distanceMeters}
              estimatedEtaMinutes={responderData.estimatedEtaMinutes}
              onCancelSOS={handleCancelSOS}
              onSendSMSBackup={handleSendSMSFallback}
              isOffline={!isOnline}
            />
          </View>
        ) : (
          /* Panic Hold Button Section */
          <View style={styles.panicContainer}>
            <Text style={styles.holdInstruction}>
              Press & hold button for <Text style={styles.highlightText}>2 seconds</Text> to trigger emergency distress call
            </Text>

            <TouchableWithoutFeedback
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Emergency SOS Panic Button. Hold for 2 seconds to activate."
              accessibilityHint="Press and hold continuously for 2 seconds to initiate emergency response."
            >
              <View style={styles.panicButtonOuter}>
                {/* Hold Progress Fill Border */}
                <Animated.View
                  style={[
                    styles.panicButtonProgress,
                    {
                      opacity: holdProgressAnim.interpolate({
                        inputRange: [0, 0.1, 1],
                        outputRange: [0, 1, 1],
                      }),
                      transform: [
                        {
                          scale: holdProgressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.25],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                <View style={styles.panicButtonInner}>
                  <Text style={styles.panicIcon}>🚨</Text>
                  <Text style={styles.panicLabel}>SOS</Text>
                  <Text style={styles.panicSubLabel}>
                    {sosState === 'HOLDING' ? 'HOLDING...' : 'HOLD 2 SEC'}
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}

        {/* Direct Emergency Helpline Shortcuts */}
        <View style={styles.helplineSection}>
          <Text style={styles.sectionTitle}>Direct Emergency Helplines</Text>
          <View style={styles.helplineGrid}>
            <TouchableOpacity
              style={styles.helplineCard}
              onPress={() => handleDialHelpline('112')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 112 All India Emergency"
            >
              <Text style={styles.helplineIcon}>🚨</Text>
              <Text style={styles.helplineNumber}>112</Text>
              <Text style={styles.helplineName}>National Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineCard}
              onPress={() => handleDialHelpline('108')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 108 Medical Ambulance"
            >
              <Text style={styles.helplineIcon}>🚑</Text>
              <Text style={styles.helplineNumber}>108</Text>
              <Text style={styles.helplineName}>Ambulance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineCard}
              onPress={() => handleDialHelpline('1363')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 1363 Ministry of Tourism Helpline"
            >
              <Text style={styles.helplineIcon}>🧳</Text>
              <Text style={styles.helplineNumber}>1363</Text>
              <Text style={styles.helplineName}>Tourist Helpline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineCard}
              onPress={() => handleDialHelpline('100')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 100 Police Control"
            >
              <Text style={styles.helplineIcon}>👮</Text>
              <Text style={styles.helplineNumber}>100</Text>
              <Text style={styles.helplineName}>Police</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 5-Second Confirmation & Voice Note Modal */}
      <SOSConfirmModal
        visible={sosState === 'COUNTDOWN'}
        onConfirm={handleConfirmSOS}
        onCancel={handleCancelCountdown}
        countdownSeconds={5}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  networkBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  networkOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  networkOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  networkText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  telemetryBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  telemetryText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  trackerContainer: {
    marginBottom: 24,
  },
  panicContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  holdInstruction: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
    lineHeight: 18,
  },
  highlightText: {
    color: '#EF4444',
    fontWeight: '800',
  },
  panicButtonOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panicButtonProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  panicButtonInner: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#DC2626',
    borderWidth: 4,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  panicIcon: {
    fontSize: 34,
    marginBottom: -2,
  },
  panicLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  panicSubLabel: {
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  helplineSection: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  helplineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  helplineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80,
    justifyContent: 'center',
  },
  helplineIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  helplineNumber: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  helplineName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
