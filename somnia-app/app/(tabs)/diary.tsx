import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SleepStageBar } from "@/components";
import { colors, spacing, radius, font } from "@/constants";
import { useAppStore } from "@/stores/useAppStore";

const QUALITY_LABELS = ["Terrible", "Poor", "Fair", "Good", "Great"];
const ALERT_LABELS = ["Very groggy", "Groggy", "OK", "Alert", "Very alert"];

function fmtMin(min: number | null): string {
  if (min === null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

export default function DiaryScreen() {
  const sleepSummary = useAppStore((s) => s.sleepSummary);
  const wearableHealth = useAppStore((s) => s.wearableHealth);
  const addDiaryEntry = useAppStore((s) => s.addDiaryEntry);

  const [quality, setQuality] = useState(3);
  const [alertness, setAlertness] = useState(3);
  const [notes, setNotes] = useState("");

  function handleSave() {
    addDiaryEntry({
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      quality,
      alertness,
      notes,
    });
    setNotes("");
    Alert.alert("Saved", "Diary entry recorded.");
  }

  const hasWearableData = !!(sleepSummary || wearableHealth.lastUpdated);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Today's date header */}
      <Text style={styles.date}>
        {new Date().toLocaleDateString("en-CA", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>

      {/* Wearable data summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Night (Wearable)</Text>

        {hasWearableData ? (
          <>
            <View style={styles.statRow}>
              <Stat
                label="Total Sleep"
                value={fmtMin(sleepSummary?.totalMinutes ?? null)}
              />
              <Stat
                label="Time in Bed"
                value={fmtMin(sleepSummary?.timeinBedMinutes ?? null)}
              />
              <Stat
                label="Efficiency"
                value={sleepSummary ? `${sleepSummary.efficiency}%` : "—"}
              />
            </View>
            <View style={styles.statRow}>
              <Stat label="Deep Sleep" value={fmtMin(sleepSummary?.deepMinutes ?? null)} />
              <Stat label="Light Sleep" value={fmtMin(sleepSummary?.lightMinutes ?? null)} />
              <Stat
                label="Resting HR"
                value={wearableHealth.heartRate !== null ? `${Math.round(wearableHealth.heartRate)} bpm` : "—"}
              />
            </View>
            {sleepSummary && (
              <SleepStageBar
                deep={sleepSummary.deepMinutes}
                rem={sleepSummary.remMinutes}
                light={sleepSummary.lightMinutes}
                awake={sleepSummary.awakeMinutes}
              />
            )}
          </>
        ) : (
          <View style={styles.noDataRow}>
            <Ionicons name="watch-outline" size={24} color={colors.text.muted} />
            <Text style={styles.noDataText}>
              No wearable data yet. Connect and sync your device in Settings.
            </Text>
          </View>
        )}
      </View>

      {/* Self-report */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How did you sleep?</Text>

        <Text style={styles.label}>Sleep quality</Text>
        <View style={styles.ratingRow}>
          {QUALITY_LABELS.map((lbl, i) => (
            <Pressable
              key={lbl}
              style={[styles.ratingBtn, quality === i + 1 && styles.ratingSelected]}
              onPress={() => setQuality(i + 1)}
            >
              <Text
                style={[styles.ratingText, quality === i + 1 && styles.ratingTextSelected]}
              >
                {lbl}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Morning alertness</Text>
        <View style={styles.ratingRow}>
          {ALERT_LABELS.map((lbl, i) => (
            <Pressable
              key={lbl}
              style={[styles.ratingBtn, alertness === i + 1 && styles.ratingSelected]}
              onPress={() => setAlertness(i + 1)}
            >
              <Text
                style={[styles.ratingText, alertness === i + 1 && styles.ratingTextSelected]}
              >
                {lbl}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything affecting your sleep? Caffeine, stress, exercise..."
          placeholderTextColor={colors.text.muted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit */}
      <Pressable style={styles.submitBtn} onPress={handleSave}>
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        <Text style={styles.submitText}>Save diary entry</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  date: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    marginTop: 2,
  },
  noDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  noDataText: {
    flex: 1,
    color: colors.text.muted,
    fontSize: font.size.sm,
    lineHeight: 20,
  },
  label: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  ratingRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingSelected: {
    backgroundColor: colors.accent.muted,
    borderColor: colors.accent.primary,
  },
  ratingText: {
    color: colors.text.muted,
    fontSize: font.size.xs,
  },
  ratingTextSelected: {
    color: colors.accent.primary,
    fontWeight: font.weight.semibold,
  },
  notesInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: font.size.md,
    textAlignVertical: "top",
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.accent.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
});
