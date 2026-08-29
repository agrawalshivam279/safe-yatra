/**
 * Safe Yatra — Mobile App
 * Real-Time Emergency SOS Response & Volunteer Approach Tracker.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  AccessibilityInfo,
} from 'react-native';

export interface SOSStatusTrackerProps {
  status:
    | 'SEARCHING'
    | 'VOLUNTEER_ALERTED'
    | 'VOLUNTEER_ACCEPTED'
    | 'VOLUNTEER_ARRIVED'
    | 'RESOLVED'
    | 'CANCELLED';
  responderName?: string;
  responderPhone?: string;
  distanceMeters?: number;
  estimatedEtaMinutes?: number;
  onCancelSOS: () => void;
  onSendSMSBackup: () => void;
  isOffline?: boolean;
}

export default function SOSStatusTracker({
  status,
  responderName,
  responderPhone,
  distanceMeters,
  estimatedEtaMinutes,
  onCancelSOS,
  onSendSMSBackup,
  isOffline = false,
}: SOSStatusTrackerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  // Screen reader announcements on status change
  useEffect(() => {
    if (status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED') {
      AccessibilityInfo.announceForAccessibility(
        'SOS alert active. Searching for nearby Yaatri Mitra volunteers.'
      );
    } else if (status === 'VOLUNTEER_ACCEPTED') {
      const etaText = estimatedEtaMinutes ? `${estimatedEtaMinutes} minutes` : 'a few minutes';
      AccessibilityInfo.announceForAccessibility(
        `Yaatri Mitra ${responderName || 'Volunteer'} has accepted your emergency request and is ${etaText} away.`
      );
    } else if (status === 'VOLUNTEER_ARRIVED') {
      AccessibilityInfo.announceForAccessibility(
        'Yaatri Mitra responder has arrived at your location.'
      );
    }
  }, [status, responderName, estimatedEtaMinutes]);

  const handleCallResponder = () => {
    if (responderPhone) {
      Linking.openURL(`tel:${responderPhone}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Header Banner */}
      <View
        style={[
          styles.headerBanner,
          status === 'VOLUNTEER_ACCEPTED' && styles.headerBannerActive,
          status === 'VOLUNTEER_ARRIVED' && styles.headerBannerArrived,
          status === 'RESOLVED' && styles.headerBannerResolved,
        ]}
      >
        <Animated.Text
          style={[
            styles.bannerIcon,
            (status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED') && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED'
            ? '📡'
            : status === 'VOLUNTEER_ACCEPTED'
            ? '🏃'
            : status === 'VOLUNTEER_ARRIVED'
            ? '🤝'
            : '✅'}
        </Animated.Text>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>
            {status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED'
              ? 'ALERT DISPATCHED — SEARCHING RESCUERS'
              : status === 'VOLUNTEER_ACCEPTED'
              ? 'YAATRI MITRA EN ROUTE'
              : status === 'VOLUNTEER_ARRIVED'
              ? 'RESCUER ARRIVED AT YOUR LOCATION'
              : 'EMERGENCY RESOLVED'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED'
              ? 'Notified on-duty volunteers & central command center'
              : status === 'VOLUNTEER_ACCEPTED'
              ? 'Live tracking responder approach'
              : status === 'VOLUNTEER_ARRIVED'
              ? 'Please confirm with responder at the scene'
              : 'All systems clear'}
          </Text>
        </View>
      </View>

      {/* Responder Card (When Volunteer is Assigned) */}
      {(status === 'VOLUNTEER_ACCEPTED' || status === 'VOLUNTEER_ARRIVED') && (
        <View style={styles.responderCard}>
          <View style={styles.responderRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>🧑‍🌾</Text>
            </View>
            <View style={styles.responderInfo}>
              <Text style={styles.responderName}>
                {responderName || 'Verified Yaatri Mitra'}
              </Text>
              <Text style={styles.responderRole}>Certified Safety Volunteer</Text>
            </View>
            {responderPhone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallResponder}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Call responder ${responderName || ''}`}
              >
                <Text style={styles.callIcon}>📞</Text>
                <Text style={styles.callLabel}>Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ETA & Distance Telemetry */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {estimatedEtaMinutes !== undefined ? `${estimatedEtaMinutes} min` : '~3 min'}
              </Text>
              <Text style={styles.metricLabel}>ESTIMATED ETA</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {distanceMeters !== undefined
                  ? distanceMeters >= 1000
                    ? `${(distanceMeters / 1000).toFixed(1)} km`
                    : `${Math.round(distanceMeters)} m`
                  : 'Nearby'}
              </Text>
              <Text style={styles.metricLabel}>DISTANCE</Text>
            </View>
          </View>
        </View>
      )}

      {/* Searching Live Radar Animation */}
      {(status === 'SEARCHING' || status === 'VOLUNTEER_ALERTED') && (
        <View style={styles.searchingBox}>
          <Text style={styles.searchingText}>
            ⏳ Transmitting GPS coordinates to nearby volunteers within 5km radius...
          </Text>
        </View>
      )}

      {/* Offline SMS Backup Option */}
      <TouchableOpacity
        style={[styles.smsBackupButton, isOffline && styles.smsBackupButtonOffline]}
        onPress={onSendSMSBackup}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Send Offline Emergency SMS via 112"
      >
        <Text style={styles.smsIcon}>💬</Text>
        <Text style={styles.smsText}>
          {isOffline
            ? '⚠️ Offline Detected — Send Emergency SMS (112)'
            : 'Send Backup SOS via SMS (112)'}
        </Text>
      </TouchableOpacity>

      {/* Cancel Action */}
      {status !== 'RESOLVED' && status !== 'CANCELLED' && (
        <TouchableOpacity
          style={styles.cancelSOSButton}
          onPress={onCancelSOS}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel Active Emergency Distress Call"
        >
          <Text style={styles.cancelSOSText}>Cancel Emergency Call</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  headerBanner: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBannerActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  headerBannerArrived: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  headerBannerResolved: {
    backgroundColor: '#14532D',
    borderColor: '#22C55E',
  },
  bannerIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  responderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  responderInfo: {
    flex: 1,
  },
  responderName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  responderRole: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
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
    fontSize: 14,
    marginRight: 4,
  },
  callLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  searchingBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  searchingText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  smsBackupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  smsBackupButtonOffline: {
    backgroundColor: '#7C2D12',
    borderColor: '#EA580C',
  },
  smsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  smsText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelSOSButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  cancelSOSText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
