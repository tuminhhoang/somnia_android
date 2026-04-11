import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "@/constants";
import type { BedtimeWindow } from "@/types";

interface BedtimeCardProps {
  window: BedtimeWindow;
}

export function BedtimeCard({ window: w }: BedtimeCardProps) {
  const hours = Math.floor(w.tib_minutes / 60);
  const mins = w.tib_minutes % 60;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tonight's Bedtime Window</Text>
      <View style={styles.row}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Lights Out</Text>
          <Text style={styles.time}>{w.lights_out}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Rise Time</Text>
          <Text style={styles.time}>{w.rise_time}</Text>
        </View>
      </View>
      <Text style={styles.tib}>
        {hours}h {mins > 0 ? `${mins}m` : ""} time in bed
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent.muted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  title: {
    color: colors.accent.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeBlock: {
    alignItems: "center",
    flex: 1,
  },
  timeLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    marginBottom: spacing.xs,
  },
  time: {
    color: colors.text.primary,
    fontSize: font.size.hero,
    fontWeight: font.weight.bold,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: colors.accent.primary,
    opacity: 0.3,
    marginHorizontal: spacing.lg,
  },
  tib: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
