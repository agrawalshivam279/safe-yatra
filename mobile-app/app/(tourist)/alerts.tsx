/**
 * Safe Yatra — Mobile App
 * Tourist Safety Alerts Feed Screen with Tier Filters, Search & Detail Modal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  notificationService,
  StoredAlert,
} from '../../services/notificationService';
import AlertHistoryCard, {
  getAlertBadgeStyle,
  formatRelativeTime,
} from '../../components/alerts/AlertHistoryCard';

export type AlertFilter = 'ALL' | 'CRITICAL' | 'SEVERE' | 'BROADCAST';

export default function TouristAlertsScreen() {
  const [alerts, setAlerts] = useState<StoredAlert[]>([]);
  const [filter, setFilter] = useState<AlertFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<StoredAlert | null>(null);

  const loadAlerts = useCallback(async () => {
    const data = await notificationService.getAlerts();
    setAlerts(data);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    await loadAlerts();
    AccessibilityInfo.announceForAccessibility('All safety alerts marked as read');
  };

  const handleClearAll = async () => {
    await notificationService.clearAlerts();
    await loadAlerts();
    AccessibilityInfo.announceForAccessibility('Alert history cleared');
  };

  const handleSelectAlert = async (alert: StoredAlert) => {
    setSelectedAlert(alert);
    if (!alert.isRead) {
      await notificationService.markAsRead(alert.id);
      await loadAlerts();
    }
  };

  // Filtered and searched alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Tier / Type filter
      if (filter === 'CRITICAL' && alert.tier !== 'CRITICAL') return false;
      if (filter === 'SEVERE' && alert.tier !== 'SEVERE') return false;
      if (filter === 'BROADCAST' && alert.type !== 'BROADCAST') return false;

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = alert.title.toLowerCase().includes(q);
        const matchesMsg = alert.message.toLowerCase().includes(q);
        const matchesZone = alert.zoneName?.toLowerCase().includes(q) || false;
        return matchesTitle || matchesMsg || matchesZone;
      }

      return true;
    });
  }, [alerts, filter, searchQuery]);

  const unreadCount = useMemo(() => {
    return alerts.filter((a) => !a.isRead).length;
  }, [alerts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Hazard Alerts</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>
            Real-time geofence breaches & disaster broadcasts
          </Text>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={handleMarkAllRead}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Mark all alerts as read"
          >
            <Text style={styles.actionText}>Read All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionPill, styles.clearPill]}
            onPress={handleClearAll}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all alert history"
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by sector, keyword or alert..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessible={true}
          accessibilityLabel="Search alerts input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear search input"
          >
            <Text style={styles.clearSearchIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Category Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'CRITICAL', 'SEVERE', 'BROADCAST'] as AlertFilter[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${tab}`}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === 'ALL'
                ? 'All Alerts'
                : tab === 'CRITICAL'
                ? '🔴 Critical'
                : tab === 'SEVERE'
                ? '🟠 Severe'
                : '📢 Broadcast'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alert Feed List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertHistoryCard alert={item} onPress={handleSelectAlert} />
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
            <Text style={styles.emptyTitle}>No Safety Alerts</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No alerts matched your search query.'
                : filter !== 'ALL'
                ? `No ${filter.toLowerCase()} alerts in your feed.`
                : 'All sectors are clear. You are currently in a low-risk zone.'}
            </Text>
          </View>
        }
      />

      {/* Alert Detail Modal */}
      <Modal
        visible={!!selectedAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedAlert && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalBadgeRow}>
                    {(() => {
                      const b = getAlertBadgeStyle(
                        selectedAlert.type,
                        selectedAlert.tier
                      );
                      return (
                        <View
                          style={[
                            styles.modalBadge,
                            {
                              backgroundColor: b.badgeBg,
                              borderColor: b.badgeBorder,
                            },
                          ]}
                        >
                          <Text style={styles.modalBadgeIcon}>{b.icon}</Text>
                          <Text
                            style={[
                              styles.modalBadgeLabel,
                              { color: b.badgeText },
                            ]}
                          >
                            {b.label}
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.modalTime}>
                      {formatRelativeTime(selectedAlert.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                  {selectedAlert.zoneName && (
                    <Text style={styles.modalZone}>
                      📍 {selectedAlert.zoneName}
                    </Text>
                  )}
                </View>

                {/* Modal Body */}
                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalMessage}>
                    {selectedAlert.message}
                  </Text>

                  {selectedAlert.justification && (
                    <View style={styles.justificationCard}>
                      <Text style={styles.justificationTitle}>
                        AI Hazard Justification
                      </Text>
                      <Text style={styles.justificationText}>
                        {selectedAlert.justification}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Dismiss Button */}
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setSelectedAlert(null)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Acknowledge and close alert detail modal"
                >
                  <Text style={styles.dismissButtonText}>
                    Acknowledge & Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  clearPill: {
    borderColor: '#475569',
  },
  clearText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    height: 46,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  clearSearchIcon: {
    color: '#94A3B8',
    fontSize: 14,
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 44,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#10B981',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    elevation: 20,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  modalBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalTime: {
    color: '#64748B',
    fontSize: 11,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 4,
  },
  modalZone: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalMessage: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  justificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  justificationTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  justificationText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
