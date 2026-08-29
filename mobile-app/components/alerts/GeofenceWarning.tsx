/**
 * Safe Yatra — Mobile App
 * GeofenceWarning Component (Full-Screen Hazard Breach Modal with 3-Second Hold Confirmation).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { GeofenceAlertPayload } from '../../services/socketService';
import { getTierColor } from '../maps/DangerZoneMap';

export interface GeofenceWarningProps {
  alert: GeofenceAlertPayload | null;
  visible: boolean;
  onTurnBack: () => void;
  onAcknowledgeRisk: (zoneId: string) => void;
}

export default function GeofenceWarning({
  alert,
  visible,
  onTurnBack,
  onAcknowledgeRisk,
}: GeofenceWarningProps) {
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  const holdAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pulsing animation for emergency siren
  useEffect(() => {
    if (!visible) return;

    const sirenLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    sirenLoop.start();

    return () => {
      sirenLoop.stop();
    };
  }, [visible, pulseAnim]);

  if (!alert) return null;

  const { strokeColor, label } = getTierColor(alert.tier);

  const handlePressIn = () => {
    setIsHolding(true);
    setHoldProgress(0);
    holdAnim.setValue(0);

    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      setIsHolding(false);
      setHoldProgress(100);
      onAcknowledgeRisk(alert.zoneId);
    }, 3000);
  };

  const handlePressOut = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    Animated.timing(holdAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const progressWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      accessible={true}
      accessibilityLabel={`Critical Hazard Alert: You have entered ${alert.zoneName}`}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Pulsing Siren Badge */}
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.sirenContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.sirenIcon}>🚨</Text>
            </Animated.View>
            <Text style={styles.headerTag}>CRITICAL HAZARD WARNING</Text>
            <Text style={styles.zoneTitle}>{alert.zoneName}</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Danger Score Gauge */}
            <View style={styles.scoreRow}>
              <View
                style={[
                  styles.tierPill,
                  { backgroundColor: `${strokeColor}25`, borderColor: strokeColor },
                ]}
              >
                <Text style={[styles.tierPillText, { color: strokeColor }]}>
                  {label.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.scoreText}>
                Danger Score: <Text style={styles.scoreValue}>{alert.dangerScore}/100</Text>
              </Text>
            </View>

            {/* Justification Box */}
            <View style={styles.justificationBox}>
              <Text style={styles.justificationHeading}>AI Risk Assessment</Text>
              <Text style={styles.justificationBody}>
                {alert.justification ||
                  'Severe environmental risk detected. Unstable weather or high terrain slope within this sector.'}
              </Text>
            </View>

            <Text style={styles.warningInstruction}>
              You have crossed into a restricted high-risk geofence. For your safety, turn back immediately.
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Primary Action: Turn Back */}
            <TouchableOpacity
              style={styles.turnBackButton}
              onPress={onTurnBack}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Turn Back Safe Route button"
              accessibilityHint="Navigates back to safe zone immediately"
            >
              <Text style={styles.turnBackButtonText}>🛡️ Turn Back (Safe Route)</Text>
            </TouchableOpacity>

            {/* Secondary Action: 3-Second Hold Confirmation */}
            <TouchableOpacity
              style={styles.overrideButton}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="I Understand the Risk, Hold for 3 seconds"
              accessibilityHint="Press and hold for 3 seconds to override danger warning"
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressWidth },
                ]}
              />
              <Text style={styles.overrideButtonText}>
                {isHolding
                  ? '⏳ Holding... (Keep pressing)'
                  : '⚠️ I Understand the Risk (Hold 3s)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sirenContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7F1D1D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  sirenIcon: {
    fontSize: 28,
  },
  headerTag: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  zoneTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    maxHeight: 220,
    marginBottom: 20,
  },
  bodyContent: {
    gap: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoreText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  scoreValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  justificationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  justificationHeading: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
    marginBottom: 4,
  },
  justificationBody: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  warningInstruction: {
    fontSize: 12,
    color: '#FDA4AF',
    lineHeight: 16,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 10,
  },
  turnBackButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  turnBackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  overrideButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#475569',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#DC2626',
  },
  overrideButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    zIndex: 2,
  },
});
