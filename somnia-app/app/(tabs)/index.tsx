import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MetricCard, BedtimeCard, SleepStageBar } from "@/components";
import { colors, spacing, font, getZone } from "@/constants";
import { useAppStore } from "@/stores/useAppStore";

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

export default function DashboardScreen() {
  const metrics = useAppStore((s) => s.todayMetrics);
  const bedtime = useAppStore((s) => s.bedtimeWindow);
  const sleepSummary = useAppStore((s) => s.sleepSummary);
  const connectedBracelet = useAppStore((s) => s.connectedBracelet);
  const connectedRing = useAppStore((s) => s.connectedRing);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const isDeviceConnected = !!(connectedBracelet || connectedRing);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
      }
    >
      {/* Greeting */}
      <Text style={styles.greeting}>{greeting()}</Text>
      <Text style={styles.subtitle}>Here's your sleep overview</Text>

      {/* Bedtime Window — only shown when backend provides one */}
      {bedtime && (
        <View style={styles.section}>
          <BedtimeCard window={bedtime} />
        </View>
      )}

      {/* Last Night — wearable sleep data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Night</Text>

        {sleepSummary ? (
          <>
            <View style={styles.grid}>
              <MetricCard
                label="Sleep Efficiency"
                value={sleepSummary.efficiency}
                unit="%"
                zone={getZone("sleep_efficiency", sleepSummary.efficiency)}
                subtitle={`${fmtMin(sleepSummary.totalMinutes)} sleep`}
              />
              <MetricCard
                label="Time in Bed"
                value={fmtMin(sleepSummary.timeinBedMinutes)}
                zone="green"
                subtitle={`${fmtMin(sleepSummary.awakeMinutes)} awake`}
              />
              <MetricCard
                label="Deep Sleep"
                value={sleepSummary.deepMinutes}
                unit=" min"
                zone={getZone("sleep_efficiency", sleepSummary.deepMinutes > 60 ? 85 : 60)}
              />
              <MetricCard
                label="Light Sleep"
                value={sleepSummary.lightMinutes}
                unit=" min"
                zone="green"
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name={isDeviceConnected ? "sync-outline" : "watch-outline"}
              size={40}
              color={colors.text.muted}
            />
            <Text style={styles.emptyTitle}>
              {isDeviceConnected ? "No sleep data yet" : "No device connected"}
            </Text>
            <Text style={styles.emptyBody}>
              {isDeviceConnected
                ? "Sync your device in Settings to see last night's sleep stages."
                : "Connect your wearable in Settings to track sleep."}
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/settings")}>
              <Text style={styles.emptyBtnText}>Go to Settings</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Sleep Stages */}
      {sleepSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Stages</Text>
          <View style={styles.card}>
            <SleepStageBar
              deep={sleepSummary.deepMinutes}
              rem={sleepSummary.remMinutes}
              light={sleepSummary.lightMinutes}
              awake={sleepSummary.awakeMinutes}
            />
          </View>
        </View>
      )}

      {/* CBT-I metrics — only shown when backend data is available */}
      {metrics && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sleep Analysis</Text>
            <View style={styles.grid}>
              <MetricCard
                label="Sleep Debt"
                value={metrics.sleep_debt_index}
                unit="/100"
                zone={getZone("sleep_debt_index", metrics.sleep_debt_index)}
              />
              <MetricCard
                label="Circadian Score"
                value={metrics.circadian_alignment}
                unit="/100"
                zone={getZone("circadian_alignment", metrics.circadian_alignment)}
              />
              <MetricCard
                label="Arousal Index"
                value={metrics.arousal_index}
                unit="/100"
                zone={getZone("arousal_index", metrics.arousal_index)}
                subtitle={metrics.arousal_subtype}
              />
              <MetricCard
                label="CBT-I Readiness"
                value={metrics.cbti_readiness}
                unit="/100"
                zone={getZone("sleep_efficiency", metrics.cbti_readiness)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recovery</Text>
            <View style={styles.grid}>
              <MetricCard
                label="Trajectory"
                value={metrics.trajectory > 0 ? `+${metrics.trajectory}` : `${metrics.trajectory}`}
                zone={getZone("trajectory", metrics.trajectory)}
                subtitle={metrics.on_track ? "On track for remission" : "Needs attention"}
              />
              <MetricCard
                label="Predicted ISI W6"
                value={metrics.predicted_isi_w6}
                zone={getZone("isi_score", metrics.predicted_isi_w6)}
                subtitle={`Module: ${metrics.active_module.replace("_", " ")}`}
              />
            </View>
          </View>
        </>
      )}
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
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    marginTop: spacing.sm,
  },
  emptyBody: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyBtnText: {
    color: "#fff",
    fontWeight: font.weight.semibold,
    fontSize: font.size.sm,
  },
});
