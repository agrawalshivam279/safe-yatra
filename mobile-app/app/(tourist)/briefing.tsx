/**
 * Safe Yatra — Mobile App
 * Pre-Trip Safety Briefing Screen (Destination Search & Multi-Factor Hazard Inspection).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafetyBriefingCard, { SafetyBriefingData } from '../../components/briefing/SafetyBriefingCard';
import apiClient from '../../services/api';

const QUICK_DESTINATIONS = [
  { name: 'Kedarnath', icon: '🏔️' },
  { name: 'Badrinath', icon: '🛕' },
  { name: 'Lonavala', icon: '🌊' },
  { name: 'Haridwar', icon: '🌅' },
  { name: 'Vaishno Devi', icon: '⛰️' },
];

export default function BriefingScreen() {
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [briefing, setBriefing] = useState<SafetyBriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBriefing = async (destinationName: string) => {
    const cleanDest = destinationName.trim();
    if (!cleanDest) return;

    Keyboard.dismiss();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.get(
        `/api/v1/danger/briefing/${encodeURIComponent(cleanDest)}`
      );

      if (response.data?.success && response.data.data) {
        setBriefing(response.data.data);
      } else {
        setErrorMessage('Safety briefing data is unavailable for this destination.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Unable to load safety briefing for this location.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Screen Title & Subtitle */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Pre-Trip Safety Briefing</Text>
          <Text style={styles.screenSubtitle}>
            Inspect real-time environmental hazards before traveling to pilgrimage & trek sites
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination (e.g. Kedarnath)"
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (errorMessage) setErrorMessage(null);
            }}
            onSubmitEditing={() => fetchBriefing(query)}
            returnKeyType="search"
            accessible={true}
            accessibilityLabel="Destination search input"
            accessibilityHint="Enter a pilgrimage or trek destination name"
          />

          <TouchableOpacity
            style={[styles.searchButton, (!query.trim() || isLoading) && styles.searchButtonDisabled]}
            onPress={() => fetchBriefing(query)}
            disabled={!query.trim() || isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Search destination safety briefing"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Destination Hotspot Pills */}
        <Text style={styles.quickPillsHeading}>Popular Hotspots</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPillsContainer}
        >
          {QUICK_DESTINATIONS.map((dest) => (
            <TouchableOpacity
              key={dest.name}
              style={[
                styles.quickPill,
                query.toLowerCase() === dest.name.toLowerCase() && styles.quickPillActive,
              ]}
              onPress={() => {
                setQuery(dest.name);
                fetchBriefing(dest.name);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Select ${dest.name}`}
            >
              <Text style={styles.quickPillIcon}>{dest.icon}</Text>
              <Text
                style={[
                  styles.quickPillText,
                  query.toLowerCase() === dest.name.toLowerCase() && styles.quickPillTextActive,
                ]}
              >
                {dest.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Error Notification */}
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

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer} accessible={true} accessibilityLabel="Loading safety briefing">
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>
              Analyzing weather, terrain, crowd & incident history...
            </Text>
          </View>
        )}

        {/* Briefing Result Card */}
        {briefing && !isLoading && <SafetyBriefingCard briefing={briefing} />}

        {/* Empty State Instructions */}
        {!briefing && !isLoading && !errorMessage && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🛡️</Text>
            </View>
            <Text style={styles.emptyTitle}>Proactive Pilgrimage Safety</Text>
            <Text style={styles.emptyDescription}>
              Select a popular site above or type any destination name to generate a calibrated
              AI hazard briefing before starting your yatra.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 48,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 18,
  },
  quickPillsHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 10,
  },
  quickPillsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    gap: 6,
  },
  quickPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  quickPillIcon: {
    fontSize: 15,
  },
  quickPillText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  quickPillTextActive: {
    color: '#34D399',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 14,
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyStateContainer: {
    backgroundColor: '#1E293B50',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },
});
