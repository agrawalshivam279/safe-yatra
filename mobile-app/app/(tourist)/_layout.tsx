/**
 * Safe Yatra — Mobile App
 * Tourist Mode Tab Navigator Layout.
 */

import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

export default function TouristLayout() {
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
          title: 'Live Map',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
          tabBarAccessibilityLabel: 'Live Tourist Map Tab',
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🔔</Text>,
          tabBarAccessibilityLabel: 'Hazard Alerts Tab',
        }}
      />
      <Tabs.Screen
        name="briefing"
        options={{
          title: 'Briefing',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📋</Text>,
          tabBarAccessibilityLabel: 'Pre-Trip Safety Briefing Tab',
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'Emergency',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚨</Text>,
          tabBarAccessibilityLabel: 'Emergency SOS Trigger Tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
          tabBarAccessibilityLabel: 'User Profile Tab',
        }}
      />
    </Tabs>
  );
}
