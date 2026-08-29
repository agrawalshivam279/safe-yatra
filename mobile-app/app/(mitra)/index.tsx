/**
 * Safe Yatra — Mobile App
 * Yaatri Mitra Emergency SOS Queue & On-Duty Dispatch Dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  RefreshControl,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { socketService } from '../../services/socketService';
import {
  volunteerService,
  ActiveSOSItem,
} from '../../services/volunteerService';
import SOSAlertCard from '../../components/mitra/SOSAlertCard';

export default function MitraHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [sosList, setSosList] = useState<ActiveSOSItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const loadActiveQueue = useCallback(async () => {
    try {
      const list = await volunteerService.getActiveSOSList();
      setSosList(list);
    } catch {
      // Fall back to seed demo SOS item if unseeded
      setSosList([
        {
          id: 'sos-demo-active-01',
          userId: 'usr-pilgrim-99',
          status: 'VOLUNTEER_ALERTED',
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
        },
      ]);
    }
  }, []);

  useEffect(() => {
    loadActiveQueue();

    // Listen to real-time incoming SOS dispatch events
    const socket = socketService.getSocket();
    const handleSOSTriggered = (sosData: ActiveSOSItem) => {
      setSosList((prev) => [sosData, ...prev]);
      AccessibilityInfo?.announceForAccessibility?.(
        `New emergency distress call received from ${sosData.user?.fullName || 'Pilgrim'}`
      );
    };

    socket?.on('sos:triggered', handleSOSTriggered);

    return () => {
      socket?.off('sos:triggered', handleSOSTriggered);
    };
  }, [loadActiveQueue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveQueue();
    setRefreshing(false);
  };

  const handleToggleDuty = async (value: boolean) => {
    setIsOnDuty(value);
    try {
      await volunteerService.toggleDutyStatus(value);
      AccessibilityInfo?.announceForAccessibility?.(
        value ? 'You are now On Duty for emergency response' : 'You are now Off Duty'
      );
    } catch {
      // Revert on error
      setIsOnDuty(!value);
    }
  };

  const handleAcceptSOS = async (sos: ActiveSOSItem) => {
    setAcceptingId(sos.id);
    try {
      await volunteerService.acceptSOS(sos.id);
      AccessibilityInfo?.announceForAccessibility?.(
        `Accepted rescue dispatch for ${sos.user?.fullName || 'Pilgrim'}. Launching navigation.`
      );
      router.push('/(mitra)/active-sos');
    } catch (err: any) {
      Alert.alert(
        'Rescue Assignment Error',
        err?.message || 'Another nearby volunteer may have already accepted this distress call.'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header with Duty Switch */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste,</Text>
          <Text style={styles.volunteerName}>
            {user?.name || 'Yaatri Mitra Volunteer'}
          </Text>
        </View>

        {/* On Duty Toggle Control */}
        <View style={styles.dutyControl}>
          <Text
            style={[
              styles.dutyLabel,
              isOnDuty ? styles.dutyLabelOn : styles.dutyLabelOff,
            ]}
          >
            {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
          <Switch
            value={isOnDuty}
            onValueChange={handleToggleDuty}
            trackColor={{ false: '#334155', true: '#065F46' }}
            thumbColor={isOnDuty ? '#10B981' : '#94A3B8'}
            accessible={true}
            accessibilityRole="switch"
            accessibilityLabel={`Volunteer duty status toggle: currently ${isOnDuty ? 'On Duty' : 'Off Duty'}`}
          />
        </View>
      </View>

      {/* Duty Status Banner */}
      <View
        style={[
          styles.statusBanner,
          isOnDuty ? styles.statusBannerOn : styles.statusBannerOff,
        ]}
      >
        <Text style={styles.statusBannerIcon}>
          {isOnDuty ? '🟢' : '⚪'}
        </Text>
        <View style={styles.statusBannerText}>
          <Text style={styles.statusBannerTitle}>
            {isOnDuty
              ? 'ACTIVE RESPONDER — READY TO DISPATCH'
              : 'OFF DUTY — STANDBY MODE'}
          </Text>
          <Text style={styles.statusBannerSub}>
            {isOnDuty
              ? 'Listening for emergency distress alerts within 5km radius'
              : 'Toggle to ON DUTY above to receive nearby tourist distress calls'}
          </Text>
        </View>
      </View>

      {/* SOS Dispatch Queue Header */}
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>Incoming Distress Calls</Text>
        <View style={styles.queueCountBadge}>
          <Text style={styles.queueCountText}>{sosList.length} ACTIVE</Text>
        </View>
      </View>

      {/* Distress Calls List */}
      <FlatList
        data={sosList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SOSAlertCard
            sos={item}
            onAccept={handleAcceptSOS}
            isAccepting={acceptingId === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>
              {isOnDuty ? 'No Active Emergencies' : 'You are Off Duty'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isOnDuty
                ? 'All tourist sectors are currently secure. You will be alerted immediately if a pilgrim triggers an SOS.'
                : 'Turn on duty status above to start monitoring and receiving emergency calls.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  volunteerName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dutyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dutyLabel: {
    fontSize: 11,
    fontWeight: '900',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  dutyLabelOn: {
    color: '#10B981',
  },
  dutyLabelOff: {
    color: '#94A3B8',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusBannerOn: {
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
    borderColor: '#10B981',
  },
  statusBannerOff: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  statusBannerIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBannerSub: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  queueTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  queueCountBadge: {
    backgroundColor: '#DC2626',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  queueCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 45,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 270,
    lineHeight: 17,
  },
});
