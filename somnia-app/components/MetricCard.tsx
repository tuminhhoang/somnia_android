import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "@/constants";
import type { ThresholdZone } from "@/types";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  zone?: ThresholdZone;
  subtitle?: string;
}

const zoneColors: Record<ThresholdZone, { bg: string; text: string }> = {
  green: { bg: colors.zone.greenMuted, text: colors.zone.green },
  amber: { bg: colors.zone.amberMuted, text: colors.zone.amber },
  red: { bg: colors.zone.redMuted, text: colors.zone.red },
};

export function MetricCard({ label, value, unit, zone, subtitle }: MetricCardProps) {
  const zoneStyle = zone ? zoneColors[zone] : null;

  return (
    <View style={[styles.card, zoneStyle && { borderColor: zoneStyle.text, borderWidth: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, zoneStyle && { color: zoneStyle.text }]}>
          {value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    minWidth: "47%",
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  value: {
    color: colors.text.primary,
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
  },
  unit: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    marginLeft: spacing.xs,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    marginTop: spacing.xs,
  },
});
