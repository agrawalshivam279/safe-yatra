/**
 * Safe Yatra — Mobile App
 * Alert History Card Component with Tier Badges, Unread Indicators & Accessibility.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StoredAlert } from '../../services/notificationService';

export interface AlertHistoryCardProps {
  alert: StoredAlert;
  onPress: (alert: StoredAlert) => void;
}

export function formatRelativeTime(dateString: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

export function getAlertBadgeStyle(type: StoredAlert['type'], tier?: StoredAlert['tier']) {
  if (type === 'BROADCAST') {
    return {
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeBorder: '#8B5CF6',
      badgeText: '#A78BFA',
      icon: '📢',
      label: 'BROADCAST',
    };
  }

  if (type === 'SOS') {
    return {
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeBorder: '#EF4444',
      badgeText: '#F87171',
      icon: '🚨',
      label: 'EMERGENCY',
    };
  }

  switch (tier) {
    case 'CRITICAL':
      return {
        badgeBg: 'rgba(220, 38, 38, 0.15)',
        badgeBorder: '#DC2626',
        badgeText: '#EF4444',
        icon: '🛑',
        label: 'CRITICAL',
      };
    case 'SEVERE':
      return {
        badgeBg: 'rgba(234, 88, 12, 0.15)',
        badgeBorder: '#EA580C',
        badgeText: '#FB923C',
        icon: '⚠️',
        label: 'SEVERE',
      };
    case 'MODERATE':
      return {
        badgeBg: 'rgba(217, 119, 6, 0.15)',
        badgeBorder: '#D97706',
        badgeText: '#FBBF24',
        icon: '🟡',
        label: 'MODERATE',
      };
    default:
      return {
        badgeBg: 'rgba(22, 163, 74, 0.15)',
        badgeBorder: '#16A34A',
        badgeText: '#4ADE80',
        icon: 'ℹ️',
        label: 'INFO',
      };
  }
}

export default function AlertHistoryCard({ alert, onPress }: AlertHistoryCardProps) {
  const badge = getAlertBadgeStyle(alert.type, alert.tier);
  const timeText = formatRelativeTime(alert.timestamp);

  return (
    <TouchableOpacity
      style={[styles.card, !alert.isRead && styles.cardUnread]}
      onPress={() => onPress(alert)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${badge.label} alert: ${alert.title}. ${alert.zoneName ? `In ${alert.zoneName}.` : ''} ${!alert.isRead ? 'Unread.' : 'Read.'} ${timeText}.`}
      accessibilityHint="Tap to view full AI risk justification and safety details"
    >
      {/* Top Meta Bar */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View
            style={[
              styles.badge,
              { backgroundColor: badge.badgeBg, borderColor: badge.badgeBorder },
            ]}
          >
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <Text style={[styles.badgeLabel, { color: badge.badgeText }]}>
              {badge.label}
            </Text>
          </View>
          {alert.zoneName && (
            <Text style={styles.zoneName} numberOfLines={1}>
              📍 {alert.zoneName}
            </Text>
          )}
        </View>

        <View style={styles.timeGroup}>
          {!alert.isRead && <View style={styles.unreadDot} />}
          <Text style={styles.timeText}>{timeText}</Text>
        </View>
      </View>

      {/* Alert Title */}
      <Text style={[styles.title, !alert.isRead && styles.titleUnread]} numberOfLines={2}>
        {alert.title}
      </Text>

      {/* Message Snippet */}
      <Text style={styles.messageSnippet} numberOfLines={2}>
        {alert.message}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 90,
  },
  cardUnread: {
    borderColor: '#38BDF8',
    backgroundColor: '#1E293B',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  badgeIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  zoneName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    marginRight: 6,
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  titleUnread: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  messageSnippet: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
});
