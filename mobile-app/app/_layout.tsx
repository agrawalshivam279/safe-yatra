/**
 * Safe Yatra — Mobile App
 * Root layout with authentication context.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a5276' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tourist)" options={{ headerShown: false }} />
        <Stack.Screen name="(mitra)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
