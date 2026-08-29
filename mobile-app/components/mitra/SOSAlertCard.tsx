/**
 * Safe Yatra — Mobile App
 * Yaatri Mitra Incoming SOS Distress Dispatch Card.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ActiveSOSItem } from '../../services/volunteerService';

export interface SOSAlertCardProps {
  sos: ActiveSOSItem;
  onAccept: (sos: ActiveSOSItem) => void;
  isAccepting?: boolean;
}

export default function SOSAlertCard({
  sos,
  onAccept,
  isAccepting = false,
}: SOSAlertCardProps) {
  const touristName = sos.user?.fullName || 'Distressed Pilgrim';
  const touristPhone = sos.user?.phone;
  const distanceStr =
    sos.distanceMeters !== undefined
      ? sos.distanceMeters >= 1000
        ? `${(sos.distanceMeters / 1000).toFixed(1)} km away`
        : `${Math.round(sos.distanceMeters)} m away`
      : 'Within 500m';
  const etaStr =
    sos.estimatedEtaMinutes !== undefined
      ? `~${sos.estimatedEtaMinutes} min walk`
      : '~3 min walk';

  const handleDialTourist = () => {
    if (touristPhone) {
      Linking.openURL(`tel:${touristPhone}`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Siren Banner */}
      <View style={styles.header}>
        <View style={styles.sirenGroup}>
          <Text style={styles.sirenIcon}>🚨</Text>
          <Text style={styles.headerTitle}>EMERGENCY DISTRESS CALL</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>PENDING</Text>
        </View>
      </View>

      {/* Tourist Identity & Phone */}
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.touristInfo}>
          <Text style={styles.touristName}>{touristName}</Text>
          {touristPhone ? (
            <TouchableOpacity
              onPress={handleDialTourist}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Call tourist ${touristName} at ${touristPhone}`}
            >
              <Text style={styles.touristPhone}>📞 {touristPhone}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.touristPhone}>Tourist Persona</Text>
          )}
        </View>
      </View>

      {/* Metrics Row (Distance, ETA, Battery) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>📍</Text>
          <Text style={styles.metricVal}>{distanceStr}</Text>
          <Text style={styles.metricLbl}>DISTANCE</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>⏱️</Text>
          <Text style={styles.metricVal}>{etaStr}</Text>
          <Text style={styles.metricLbl}>ESTIMATED ETA</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>🔋</Text>
          <Text style={styles.metricVal}>
            {sos.batteryLevel !== undefined ? `${sos.batteryLevel}%` : '85%'}
          </Text>
          <Text style={styles.metricLbl}>BATTERY</Text>
        </View>
      </View>

      {/* Audio Memo Indicator */}
      {sos.audioUrl && (
        <View style={styles.audioBadge}>
          <Text style={styles.audioIcon}>🎙️</Text>
          <Text style={styles.audioText}>Voice memo attached to distress call</Text>
        </View>
      )}

      {/* Primary Accept Action Button */}
      <TouchableOpacity
        style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
        onPress={() => onAccept(sos)}
        disabled={isAccepting}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Accept emergency rescue for ${touristName}, ${distanceStr}`}
        accessibilityHint="Accepts emergency call and launches navigation"
      >
        <Text style={styles.acceptButtonText}>
          {isAccepting ? 'ACCEPTING RESCUE...' : 'ACCEPT RESCUE 🏃'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sirenGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sirenIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  headerTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
  },
  touristInfo: {
    flex: 1,
  },
  touristName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  touristPhone: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  audioIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  audioText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    elevation: 4,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
