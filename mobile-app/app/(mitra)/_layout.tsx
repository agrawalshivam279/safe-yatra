/**
 * Safe Yatra — Mobile App
 * Yaatri Mitra Mode Tab Navigator Layout.
 */

import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

export default function MitraLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SOS Queue',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚨</Text>,
          tabBarAccessibilityLabel: 'Emergency SOS Queue Tab',
        }}
      />
      <Tabs.Screen
        name="active-sos"
        options={{
          title: 'Active Rescue',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏃</Text>,
          tabBarAccessibilityLabel: 'Active Rescue Navigation Tab',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📋</Text>,
          tabBarAccessibilityLabel: 'Past Rescue Responses Tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
          tabBarAccessibilityLabel: 'Volunteer Profile Tab',
        }}
      />
    </Tabs>
  );
}
