/**
 * Safe Yatra — Mobile App
 * Role & Persona Selection Screen (Tourist vs Yaatri Mitra Volunteer).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../services/authService';

export default function RoleSelectScreen() {
  const router = useRouter();
  const { setRole, role: currentRole } = useAuth();

  const handleSelectRole = async (selectedRole: UserRole) => {
    await setRole(selectedRole);
    if (selectedRole === 'YAATRI_MITRA') {
      router.replace('/(mitra)');
    } else {
      router.replace('/(tourist)');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Choose Your Mode</Text>
        <Text style={styles.subtitle}>
          Safe Yatra adapts its interface to your journey and mission
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Tourist Persona Card */}
        <TouchableOpacity
          style={[
            styles.card,
            currentRole === 'TOURIST' && styles.cardSelectedTourist,
          ]}
          onPress={() => handleSelectRole('TOURIST')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Select Tourist Mode"
          accessibilityHint="Enables live danger map, geofence alerts, pre-trip briefing and emergency SOS"
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleTourist}>
              <Text style={styles.cardIcon}>🏕️</Text>
            </View>
            <View style={styles.cardTitleWrapper}>
              <Text style={styles.cardTitle}>Tourist Mode</Text>
              <Text style={styles.cardTagTourist}>Explore & Stay Safe</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
            • Real-time hazard notifications & danger zone polygons{'\n'}
            • Pre-trip safety briefings for pilgrimage & trekking sites{'\n'}
            • One-touch 2-second hold panic SOS with GPS lock
          </Text>
          <View style={styles.selectBadgeTourist}>
            <Text style={styles.selectBadgeTextTourist}>
              {currentRole === 'TOURIST' ? '✓ Currently Active' : 'Select Tourist Mode →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Yaatri Mitra Persona Card */}
        <TouchableOpacity
          style={[
            styles.card,
            currentRole === 'YAATRI_MITRA' && styles.cardSelectedMitra,
          ]}
          onPress={() => handleSelectRole('YAATRI_MITRA')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Select Yaatri Mitra Volunteer Mode"
          accessibilityHint="Enables nearby SOS distress alerts, incident navigation, and first response"
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleMitra}>
              <Text style={styles.cardIcon}>🤝</Text>
            </View>
            <View style={styles.cardTitleWrapper}>
              <Text style={styles.cardTitle}>Yaatri Mitra Mode</Text>
              <Text style={styles.cardTagMitra}>Community First Responder</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
            • Proximity-based SOS alerts within 5km of your location{'\n'}
            • Live GPS navigation to tourists in distress{'\n'}
            • On-duty toggle & incident resolution log
          </Text>
          <View style={styles.selectBadgeMitra}>
            <Text style={styles.selectBadgeTextMitra}>
              {currentRole === 'YAATRI_MITRA' ? '✓ Currently Active' : 'Select Yaatri Mitra Mode →'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/(auth)/login')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Back to sign in screen"
      >
        <Text style={styles.backButtonText}>← Back to Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    minHeight: 180,
  },
  cardSelectedTourist: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B20',
  },
  cardSelectedMitra: {
    borderColor: '#38BDF8',
    backgroundColor: '#0369A120',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconCircleTourist: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleMitra: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0369A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitleWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardTagTourist: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
    marginTop: 2,
  },
  cardTagMitra: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 16,
  },
  selectBadgeTourist: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  selectBadgeTextTourist: {
    color: '#34D399',
    fontWeight: '600',
    fontSize: 14,
  },
  selectBadgeMitra: {
    backgroundColor: '#0369A1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  selectBadgeTextMitra: {
    color: '#BAE6FD',
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
});
