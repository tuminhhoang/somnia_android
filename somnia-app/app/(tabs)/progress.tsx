/**
 * Progress — weekly trajectory, ISI history, and CBT-I module status.
 */

import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MetricCard } from "@/components";
import { colors, spacing, radius, font, getZone } from "@/constants";

const MOCK_WEEKS = [
  { week: 1, se: 72, hrv: 28, isi: 19, trajectory: -0.2 },
  { week: 2, se: 78, hrv: 31, isi: 16, trajectory: 0.1 },
  { week: 3, se: 83, hrv: 34, isi: 13, trajectory: 0.35 },
  { week: 4, se: 87, hrv: 37, isi: 10, trajectory: 0.52 },
];

export default function ProgressScreen() {
  const router = useRouter();
  const latest = MOCK_WEEKS[MOCK_WEEKS.length - 1];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your CBT-I Progress</Text>

      {/* Trajectory Summary */}
      <View style={styles.grid}>
        <MetricCard
          label="Trajectory"
          value={latest.trajectory > 0 ? `+${latest.trajectory}` : `${latest.trajectory}`}
          zone={getZone("trajectory", latest.trajectory)}
          subtitle="Week-over-week trend"
        />
        <MetricCard
          label="Current ISI"
          value={latest.isi}
          unit="/28"
          zone={getZone("isi_score", latest.isi)}
          subtitle={latest.isi < 8 ? "Remission" : latest.isi <= 14 ? "Subthreshold" : "Clinical"}
        />
      </View>

      {/* Weekly History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Progress</Text>
        {MOCK_WEEKS.map((w) => (
          <View key={w.week} style={styles.weekRow}>
            <Text style={styles.weekLabel}>Week {w.week}</Text>
            <View style={styles.weekStats}>
              <MiniStat label="SE" value={`${w.se}%`} />
              <MiniStat label="HRV" value={`${w.hrv}`} />
              <MiniStat label="ISI" value={`${w.isi}`} />
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      w.trajectory > 0.3
                        ? colors.zone.greenMuted
                        : w.trajectory > -0.3
                          ? colors.zone.amberMuted
                          : colors.zone.redMuted,
                  },
                ]}
              >
                <Ionicons
                  name={w.trajectory > 0 ? "arrow-up" : "arrow-down"}
                  size={12}
                  color={
                    w.trajectory > 0.3
                      ? colors.zone.green
                      : w.trajectory > -0.3
                        ? colors.zone.amber
                        : colors.zone.red
                  }
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Take ISI Assessment */}
      <Pressable style={styles.isiButton} onPress={() => router.push("/onboarding/isi")}>
        <Ionicons name="clipboard-outline" size={20} color={colors.accent.primary} />
        <Text style={styles.isiButtonText}>Take ISI Assessment</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
      </Pressable>
    </ScrollView>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heading: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  weekLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    width: 60,
  },
  weekStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  miniStat: { alignItems: "center" },
  miniValue: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
  },
  miniLabel: {
    color: colors.text.muted,
    fontSize: font.size.xs,
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  isiButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  isiButtonText: {
    flex: 1,
    color: colors.accent.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
  },
});
