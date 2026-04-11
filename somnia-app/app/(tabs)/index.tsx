/**
 * Dashboard — "Tonight" tab.
 * Shows today's metrics, bedtime window, and sleep stage breakdown.
 */

import { ScrollView, View, Text, StyleSheet, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { MetricCard, BedtimeCard, SleepStageBar } from "@/components";
import { colors, spacing, font, getZone } from "@/constants";
import { useAppStore } from "@/stores/useAppStore";

export default function DashboardScreen() {
  const metrics = useAppStore((s) => s.todayMetrics);
  const bedtime = useAppStore((s) => s.bedtimeWindow);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: fetch fresh metrics from API
    setRefreshing(false);
  }, []);

  // Demo data for initial build
  const demo = metrics ?? {
    sleep_efficiency: 87.5,
    tib_action: "hold" as const,
    sleep_debt_index: 32.1,
    circadian_alignment: 78.4,
    arousal_index: 28.5,
    arousal_subtype: "none" as const,
    cbti_readiness: 72.3,
    active_module: "sleep_hygiene" as const,
    trajectory: 0.42,
    predicted_isi_w6: 6.8,
    on_track: true,
  };

  const demoBedtime = bedtime ?? {
    lights_out: "23:00",
    rise_time: "06:30",
    tib_minutes: 450,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
      }
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Good evening</Text>
      <Text style={styles.subtitle}>Here's your sleep overview</Text>

      {/* Bedtime Window */}
      <View style={styles.section}>
        <BedtimeCard window={demoBedtime} />
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Night</Text>
        <View style={styles.grid}>
          <MetricCard
            label="Sleep Efficiency"
            value={demo.sleep_efficiency}
            unit="%"
            zone={getZone("sleep_efficiency", demo.sleep_efficiency)}
            subtitle={demo.tib_action.replace("_", " ")}
          />
          <MetricCard
            label="Sleep Debt"
            value={demo.sleep_debt_index}
            unit="/100"
            zone={getZone("sleep_debt_index", demo.sleep_debt_index)}
          />
          <MetricCard
            label="Circadian Score"
            value={demo.circadian_alignment}
            unit="/100"
            zone={getZone("circadian_alignment", demo.circadian_alignment)}
          />
          <MetricCard
            label="Arousal Index"
            value={demo.arousal_index}
            unit="/100"
            zone={getZone("arousal_index", demo.arousal_index)}
            subtitle={demo.arousal_subtype}
          />
        </View>
      </View>

      {/* Sleep Stages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Stages</Text>
        <View style={styles.card}>
          <SleepStageBar deep={90} rem={80} light={150} awake={30} />
        </View>
      </View>

      {/* Recovery Trajectory */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recovery</Text>
        <View style={styles.grid}>
          <MetricCard
            label="Trajectory"
            value={demo.trajectory > 0 ? `+${demo.trajectory}` : `${demo.trajectory}`}
            zone={getZone("trajectory", demo.trajectory)}
            subtitle={demo.on_track ? "On track for remission" : "Needs attention"}
          />
          <MetricCard
            label="Predicted ISI W6"
            value={demo.predicted_isi_w6}
            zone={getZone("isi_score", demo.predicted_isi_w6)}
            subtitle={`Module: ${demo.active_module.replace("_", " ")}`}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    color: colors.text.primary,
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: font.size.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: spacing.md,
  },
});
