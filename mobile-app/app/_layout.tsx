/**
 * Safe Yatra — Mobile App
 * Root Application Layout & Authentication Route Guard.
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';

function NavigationGuard() {
  const { isAuthenticated, role, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated user to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated user to appropriate persona interface
      if (role === 'YAATRI_MITRA') {
        router.replace('/(mitra)');
      } else {
        router.replace('/(tourist)');
      }
    }
  }, [isAuthenticated, role, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} accessible={true} accessibilityLabel="Initializing Safe Yatra">
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Initializing Safe Yatra...</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationGuard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
});
