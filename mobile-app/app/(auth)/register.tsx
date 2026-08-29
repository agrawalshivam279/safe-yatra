/**
 * Safe Yatra — Mobile App
 * Registration Screen (Name, Phone, Email, Password, Emergency Contact & Role).
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
import { UserRole } from '../../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('TOURIST');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanPhone || !cleanEmail || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (cleanName.length < 2) {
      setErrorMessage('Name must be at least 2 characters long.');
      return;
    }

    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password,
        role: selectedRole,
        emergencyContact: emergencyContact.trim() || undefined,
      });
      // Navigation is handled automatically by NavigationGuard in _layout.tsx
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please check your information.';
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
        <View style={styles.headerContainer}>
          <Text style={styles.brandTitle}>Create Account</Text>
          <Text style={styles.brandSubtitle}>
            Join Safe Yatra to protect and explore with confidence
          </Text>
        </View>

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

        <View style={styles.formContainer}>
          {/* Persona Role Selection */}
          <Text style={styles.inputLabel}>Select Your Role</Text>
          <View style={styles.rolePickerContainer}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedRole === 'TOURIST' && styles.roleOptionActive,
              ]}
              onPress={() => setSelectedRole('TOURIST')}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedRole === 'TOURIST' }}
              accessibilityLabel="Tourist role"
            >
              <Text style={styles.roleEmoji}>🏕️</Text>
              <Text
                style={[
                  styles.roleText,
                  selectedRole === 'TOURIST' && styles.roleTextActive,
                ]}
              >
                Tourist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedRole === 'YAATRI_MITRA' && styles.roleOptionActive,
              ]}
              onPress={() => setSelectedRole('YAATRI_MITRA')}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedRole === 'YAATRI_MITRA' }}
              accessibilityLabel="Yaatri Mitra Volunteer role"
            >
              <Text style={styles.roleEmoji}>🤝</Text>
              <Text
                style={[
                  styles.roleText,
                  selectedRole === 'YAATRI_MITRA' && styles.roleTextActive,
                ]}
              >
                Yaatri Mitra
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Aarav Sharma"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            accessible={true}
            accessibilityLabel="Full Name input"
          />

          {/* Phone Number */}
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor="#64748B"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            accessible={true}
            accessibilityLabel="Phone Number input"
          />

          {/* Email Address */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="aarav@example.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Email Address input"
          />

          {/* Password */}
          <Text style={styles.inputLabel}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            accessible={true}
            accessibilityLabel="Password input"
          />

          {/* Emergency Contact */}
          <Text style={styles.inputLabel}>Emergency Contact Phone (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 00000"
            placeholderTextColor="#64748B"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
            accessible={true}
            accessibilityLabel="Emergency contact phone input"
          />

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Register account button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => router.push('/(auth)/login')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.highlightText}>Sign In</Text>
            </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
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
  rolePickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 48,
    gap: 8,
  },
  roleOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  roleEmoji: {
    fontSize: 18,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  roleTextActive: {
    color: '#34D399',
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
    marginBottom: 14,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    marginTop: 20,
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
});
