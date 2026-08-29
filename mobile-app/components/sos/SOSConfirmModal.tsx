/**
 * Safe Yatra — Mobile App
 * SOS Confirmation & Voice Memo Recording Modal (5-Second Safety Countdown).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { Audio } from 'expo-av';

export interface SOSConfirmModalProps {
  visible: boolean;
  onConfirm: (audioUri?: string) => void;
  onCancel: () => void;
  countdownSeconds?: number;
}

export default function SOSConfirmModal({
  visible,
  onConfirm,
  onCancel,
  countdownSeconds = 5,
}: SOSConfirmModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(countdownSeconds);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Cleanup helper for audio recording
  const cleanupAudio = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording || !status.isDoneRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch {
        // Ignore audio cleanup errors
      }
      recordingRef.current = null;
    }
    setIsRecording(false);
  };

  // Reset and start countdown when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSecondsLeft(countdownSeconds);
      setRecordedUri(null);
      setRecordingDuration(0);
      progressAnim.setValue(1);

      AccessibilityInfo.announceForAccessibility(
        `Emergency SOS triggered. Dispatching in ${countdownSeconds} seconds. Tap Cancel if this is a false alarm.`
      );

      // Countdown progress animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: countdownSeconds * 1000,
        useNativeDriver: false,
      }).start();

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      cleanupAudio();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      cleanupAudio();
    };
  }, [visible, countdownSeconds]);

  // Handle countdown completion
  useEffect(() => {
    if (visible && secondsLeft === 0) {
      handleFinalConfirm();
    }
  }, [secondsLeft, visible]);

  const handleFinalConfirm = async () => {
    let finalUri = recordedUri;
    if (isRecording && recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        finalUri = recordingRef.current.getURI();
        recordingRef.current = null;
      } catch {
        // Fall back to null audio uri
      }
    }
    cleanupAudio();
    onConfirm(finalUri || undefined);
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          setRecordedUri(uri);
          recordingRef.current = null;
        }
      } catch (err) {
        console.warn('Error stopping audio recording:', err);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsRecording(true);
        setRecordingDuration(0);

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            if (prev >= 9) {
              // 10s max duration reached
              handleToggleRecord();
              return 10;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (err) {
        console.warn('Error starting audio recording:', err);
        setIsRecording(false);
      }
    }
  };

  const handleCancel = async () => {
    await cleanupAudio();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Siren Badge */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🚨</Text>
            <Text style={styles.title}>EMERGENCY SOS</Text>
          </View>

          {/* Countdown Display */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownNumber}>{secondsLeft}</Text>
            <Text style={styles.countdownLabel}>Dispatching in seconds...</Text>
          </View>

          {/* Animated Progress Bar */}
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Voice Memo Recording Section */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceTitle}>Optional 10s Voice Memo</Text>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                recordedUri ? styles.recordedButton : null,
              ]}
              onPress={handleToggleRecord}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording
                  ? 'Stop Voice Memo Recording'
                  : recordedUri
                  ? 'Voice Memo Recorded. Tap to re-record'
                  : 'Record 10-Second Voice Memo'
              }
            >
              <Text style={styles.recordIcon}>
                {isRecording ? '⏹️' : recordedUri ? '✅' : '🎙️'}
              </Text>
              <Text style={styles.recordLabel}>
                {isRecording
                  ? `Recording... ${10 - recordingDuration}s`
                  : recordedUri
                  ? 'Voice Clip Saved'
                  : 'Record Voice Note'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Immediate Trigger Button */}
            <TouchableOpacity
              style={styles.sendNowButton}
              onPress={handleFinalConfirm}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Send Emergency SOS Immediately"
            >
              <Text style={styles.sendNowText}>SEND SOS NOW ⚡</Text>
            </TouchableOpacity>

            {/* Cancel False Alarm Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Cancel SOS Emergency False Alarm"
            >
              <Text style={styles.cancelText}>CANCEL (FALSE ALARM)</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0F172A',
    borderColor: '#DC2626',
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  countdownNumber: {
    color: '#F8FAFC',
    fontSize: 54,
    fontWeight: '900',
  },
  countdownLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  voiceSection: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  voiceTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 48,
    width: '100%',
  },
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordedButton: {
    backgroundColor: '#065F46',
  },
  recordIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  recordLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  sendNowButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sendNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
