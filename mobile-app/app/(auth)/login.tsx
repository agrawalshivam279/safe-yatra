/**
 * Safe Yatra — Mobile App
 * Login Screen (Email/Password with Validation & Error Feedback).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, role } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: cleanEmail, password });
      // Redirection is handled automatically by NavigationGuard in _layout.tsx
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please check your credentials.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Safe Yatra Header Badge */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
          <Text style={styles.brandTitle}>Safe Yatra</Text>
          <Text style={styles.brandSubtitle}>
            Smart Tourist Safety & Emergency Response
          </Text>
          {role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                Active Persona: {role === 'YAATRI_MITRA' ? '🤝 Yaatri Mitra' : '🏕️ Tourist'}
              </Text>
            </View>
          )}
        </View>

        {/* Error Notification Banner */}
        {errorMessage && (
          <View
            style={styles.errorBanner}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`Error: ${errorMessage}`}
          >
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {/* Credentials Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="tourist@safeyatra.in"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Email Address Input"
            accessibilityHint="Enter your registered email address"
          />

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessible={true}
              accessibilityLabel="Password Input"
              accessibilityHint="Enter your password"
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowPassword(!showPassword)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🔒'}</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign in button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Navigation Actions */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => router.push('/(auth)/register')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Navigate to registration"
          >
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.highlightText}>Register</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleLink}
            onPress={() => router.push('/(auth)/role-select')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Select user role"
          >
            <Text style={styles.roleLinkText}>🔄 Change Role / Mode</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 12,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 13,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
    marginBottom: 16,
    minHeight: 48,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  eyeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  secondaryLink: {
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  highlightText: {
    color: '#10B981',
    fontWeight: '600',
  },
  roleLink: {
    marginTop: 8,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  roleLinkText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '500',
  },
});
