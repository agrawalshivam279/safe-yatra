/**
 * Safe Yatra — Mobile App
 * SafetyBriefingCard Component (Score Gauge, 4-Factor Breakdown & Actionable Advisory).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTierColor } from '../maps/DangerZoneMap';

export interface SafetyFactor {
  score: number;
  weight?: number;
  details?: string;
}

export interface SafetyBriefingData {
  destination: string;
  overallScore: number;
  tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  factors?: {
    weather?: SafetyFactor;
    terrain?: SafetyFactor;
    crowd?: SafetyFactor;
    history?: SafetyFactor;
  };
  advisory?: string;
  generatedAt?: string;
}

export interface SafetyBriefingCardProps {
  briefing: SafetyBriefingData;
}

function getFactorColor(score: number): string {
  if (score <= 25) return '#10B981'; // Green
  if (score <= 50) return '#F59E0B'; // Amber
  if (score <= 75) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

export default function SafetyBriefingCard({ briefing }: SafetyBriefingCardProps) {
  const { strokeColor, label } = getTierColor(briefing.tier);

  const factors = [
    {
      key: 'weather',
      title: 'Weather & Meteorology',
      icon: '🌧️',
      weight: '35%',
      score: briefing.factors?.weather?.score ?? 0,
      details: briefing.factors?.weather?.details || 'Normal atmospheric conditions.',
    },
    {
      key: 'terrain',
      title: 'Terrain & Elevation',
      icon: '⛰️',
      weight: '20%',
      score: briefing.factors?.terrain?.score ?? 0,
      details: briefing.factors?.terrain?.details || 'Stable trail slope and accessibility.',
    },
    {
      key: 'crowd',
      title: 'Crowd Density',
      icon: '👥',
      weight: '25%',
      score: briefing.factors?.crowd?.score ?? 0,
      details: briefing.factors?.crowd?.details || 'Comfortable footfall and movement.',
    },
    {
      key: 'history',
      title: 'Historical Incidents',
      icon: '📜',
      weight: '20%',
      score: briefing.factors?.history?.score ?? 0,
      details: briefing.factors?.history?.details || 'Low recorded incidents in 2km radius.',
    },
  ];

  return (
    <View style={styles.card} accessible={true} accessibilityLabel={`Safety Briefing for ${briefing.destination}`}>
      {/* Header with Destination & Overall Score Gauge */}
      <View style={styles.header}>
        <View style={styles.destinationWrapper}>
          <Text style={styles.destinationTitle}>{briefing.destination}</Text>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: `${strokeColor}20`, borderColor: strokeColor },
            ]}
          >
            <Text style={[styles.tierBadgeText, { color: strokeColor }]}>
              {label.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.gaugeContainer}>
          <Text style={[styles.gaugeScore, { color: strokeColor }]}>
            {briefing.overallScore}
          </Text>
          <Text style={styles.gaugeLabel}>Risk Index</Text>
        </View>
      </View>

      {/* 4-Factor Risk Breakdown */}
      <Text style={styles.sectionHeading}>Hazard Breakdown</Text>
      <View style={styles.factorsList}>
        {factors.map((factor) => {
          const factorColor = getFactorColor(factor.score);
          return (
            <View
              key={factor.key}
              style={styles.factorItem}
              accessible={true}
              accessibilityLabel={`${factor.title}: Score ${factor.score} out of 100`}
            >
              <View style={styles.factorHeader}>
                <Text style={styles.factorTitle}>
                  {factor.icon} {factor.title}{' '}
                  <Text style={styles.factorWeight}>({factor.weight})</Text>
                </Text>
                <Text style={[styles.factorScore, { color: factorColor }]}>
                  {factor.score}/100
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(factor.score, 100)}%`,
                      backgroundColor: factorColor,
                    },
                  ]}
                />
              </View>

              <Text style={styles.factorDetails}>{factor.details}</Text>
            </View>
          );
        })}
      </View>

      {/* Actionable AI Safety Advisory */}
      {briefing.advisory && (
        <View style={styles.advisoryBox}>
          <View style={styles.advisoryHeader}>
            <Text style={styles.advisoryIcon}>💡</Text>
            <Text style={styles.advisoryTitle}>Actionable Travel Advisory</Text>
          </View>
          <Text style={styles.advisoryContent}>{briefing.advisory}</Text>
        </View>
      )}

      {briefing.generatedAt && (
        <Text style={styles.timestampText}>
          Telemetry generated: {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  destinationWrapper: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 80,
  },
  gaugeScore: {
    fontSize: 26,
    fontWeight: '900',
  },
  gaugeLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  factorsList: {
    gap: 14,
    marginBottom: 18,
  },
  factorItem: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  factorWeight: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  factorScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorDetails: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  advisoryBox: {
    backgroundColor: '#0C4A6E25',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
    marginBottom: 12,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  advisoryIcon: {
    fontSize: 16,
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  advisoryContent: {
    fontSize: 13,
    color: '#E0F2FE',
    lineHeight: 19,
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
});
