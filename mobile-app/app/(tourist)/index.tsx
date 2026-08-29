/**
 * Safe Yatra — Mobile App
 * Tourist Home Map Screen (Dynamic PostGIS Polygons, User Location & Floating SOS Panic Button).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DangerZoneMap, { DangerZone, getTierColor } from '../../components/maps/DangerZoneMap';
import SOSButton from '../../components/sos/SOSButton';
import apiClient from '../../services/api';

export default function TouristHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [zones, setZones] = useState<DangerZone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<DangerZone | null>(null);

  // Default simulated location for Kedarnath Valley
  const [userLocation] = useState({
    latitude: 30.7352,
    longitude: 79.0669,
  });

  const fetchZones = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get('/api/v1/danger/zones');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setZones(response.data.data);
      } else {
        setZones([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch dynamic danger zones.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Aggregate zone tier distribution for top summary pill
  const tierCounts = zones.reduce(
    (acc, z) => {
      acc[z.currentTier] = (acc[z.currentTier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <View style={styles.container}>
      {/* Layer 1 & 2: Base Map & Danger Zone Polygons */}
      <DangerZoneMap
        zones={zones}
        userLocation={userLocation}
        onSelectZone={(zone) => setSelectedZone(zone)}
      />

      {/* Floating Top Header / Status Pill */}
      <View style={[styles.topHeaderContainer, { top: insets.top + 10 }]}>
        <View style={styles.statusPill}>
          <View style={styles.liveIndicator} />
          <Text style={styles.statusTitle}>Kedarnath Hotspot</Text>
          <Text style={styles.tierSummaryText}>
            {`🟢 ${tierCounts.LOW || 0}  🟡 ${tierCounts.MODERATE || 0}  🟠 ${tierCounts.SEVERE || 0}  🔴 ${tierCounts.CRITICAL || 0}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchZones}
          disabled={isLoading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Refresh danger zones"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Toast if fetch failed */}
      {errorMessage && (
        <View style={[styles.errorToast, { top: insets.top + 70 }]}>
          <Text style={styles.errorToastText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {/* Layer 4: Persistent Floating SOS Panic Button */}
      <View style={[styles.floatingSOSContainer, { bottom: insets.bottom + 20 }]}>
        <SOSButton
          onPress={() => router.push('/(tourist)/sos')}
          size={68}
        />
      </View>

      {/* Selected Zone Detail Modal Sheet */}
      {selectedZone && (
        <Modal
          visible={!!selectedZone}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedZone(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{selectedZone.name}</Text>
                  <Text style={styles.modalCategory}>
                    {selectedZone.category || 'Monitored Sector'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedZone(null)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Close zone details"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Score & Tier Badge */}
                <View style={styles.scoreRow}>
                  <View
                    style={[
                      styles.tierBadge,
                      {
                        backgroundColor: getTierColor(selectedZone.currentTier).fillColor,
                        borderColor: getTierColor(selectedZone.currentTier).strokeColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierBadgeText,
                        { color: getTierColor(selectedZone.currentTier).strokeColor },
                      ]}
                    >
                      {getTierColor(selectedZone.currentTier).label.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.scoreNumber}>
                    Score: <Text style={styles.scoreHighlight}>{selectedZone.dangerScore}/100</Text>
                  </Text>
                </View>

                {/* Justification Text */}
                {selectedZone.justification ? (
                  <View style={styles.justificationBox}>
                    <Text style={styles.justificationLabel}>Hazard Assessment</Text>
                    <Text style={styles.justificationContent}>
                      {selectedZone.justification}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    Active PostGIS safety geofence with continuous ML danger score telemetry.
                  </Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalDismissButton}
                onPress={() => setSelectedZone(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Dismiss zone card"
              >
                <Text style={styles.modalDismissText}>Back to Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeaderContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293BE8',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 48,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginRight: 8,
  },
  tierSummaryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 'auto',
    fontWeight: '600',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 18,
  },
  errorToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 10,
    zIndex: 10,
  },
  errorToastText: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  floatingSOSContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreNumber: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  scoreHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  justificationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  justificationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  justificationContent: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
  },
  noDataText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalDismissButton: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalDismissText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
});
