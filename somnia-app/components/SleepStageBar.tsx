import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "@/constants";

interface SleepStageBarProps {
  deep: number; // minutes
  rem: number;
  light: number;
  awake: number;
}

export function SleepStageBar({ deep, rem, light, awake }: SleepStageBarProps) {
  const total = deep + rem + light + awake;
  if (total === 0) return null;

  const pct = (v: number) => `${((v / total) * 100).toFixed(0)}%`;

  const segments: { color: string; value: number; label: string }[] = [
    { color: colors.stage.deep, value: deep, label: "Deep" },
    { color: colors.stage.rem, value: rem, label: "REM" },
    { color: colors.stage.light, value: light, label: "Light" },
    { color: colors.stage.awake, value: awake, label: "Awake" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {segments.map(
          (seg) =>
            seg.value > 0 && (
              <View
                key={seg.label}
                style={[
                  styles.segment,
                  {
                    backgroundColor: seg.color,
                    flex: seg.value,
                  },
                ]}
              />
            )
        )}
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{seg.label}</Text>
            <Text style={styles.legendValue}>{pct(seg.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    height: 12,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  legendLabel: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    marginRight: 2,
  },
  legendValue: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    fontWeight: font.weight.medium,
  },
});
