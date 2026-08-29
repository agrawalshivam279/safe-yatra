/**
 * Safe Yatra — Mobile App
 * Floating Emergency SOS Panic Button Component.
 */

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface SOSButtonProps {
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export default function SOSButton({
  onPress,
  size = 68,
  style,
  disabled = false,
}: SOSButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  const buttonSizeStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const haloSizeStyle = {
    width: size + 16,
    height: size + 16,
    borderRadius: (size + 16) / 2,
  };

  return (
    <View style={[styles.container, style]}>
      {/* Outer Pulsing Emergency Halo */}
      <Animated.View
        style={[
          styles.halo,
          haloSizeStyle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main Panic Touch Target */}
      <TouchableOpacity
        style={[styles.button, buttonSizeStyle, disabled && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS Panic Button"
        accessibilityHint="Tap to trigger immediate emergency dispatch and alert nearby Yaatri Mitras"
      >
        <Text style={styles.icon}>🚨</Text>
        <Text style={styles.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(239, 68, 68, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  button: {
    backgroundColor: '#DC2626',
    borderWidth: 2.5,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    minHeight: 48,
    minWidth: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 18,
    marginBottom: -2,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
