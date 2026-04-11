/**
 * ISI Questionnaire — Insomnia Severity Index (7 questions, 0-28 score).
 */

import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ISISlider } from "@/components";
import { colors, spacing, radius, font, ISI_QUESTIONS, getISISeverity } from "@/constants";

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  no_insomnia: { label: "No clinically significant insomnia", color: colors.zone.green },
  subthreshold: { label: "Subthreshold insomnia", color: colors.zone.amber },
  moderate: { label: "Moderate insomnia", color: colors.zone.amber },
  severe: { label: "Severe insomnia", color: colors.zone.red },
};

export default function ISIScreen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(0));
  const [submitted, setSubmitted] = useState(false);

  const totalScore = answers.reduce((a, b) => a + b, 0);
  const severity = getISISeverity(totalScore);
  const severityInfo = SEVERITY_LABELS[severity];

  function updateAnswer(index: number, value: number) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleContinue() {
    router.back();
  }

  if (submitted) {
    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Your ISI Score</Text>
          <Text style={[styles.resultScore, { color: severityInfo.color }]}>
            {totalScore}
          </Text>
          <Text style={styles.resultMax}>out of 28</Text>
          <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + "22" }]}>
            <Text style={[styles.severityText, { color: severityInfo.color }]}>
              {severityInfo.label}
            </Text>
          </View>
          <Text style={styles.resultExplanation}>
            {severity === "no_insomnia"
              ? "Your sleep is within a healthy range. We'll help you maintain and optimize it."
              : severity === "subthreshold"
                ? "You're experiencing mild sleep difficulties. CBT-I techniques can help improve your sleep."
                : "Your results suggest significant sleep difficulties. Our program is designed to help with exactly this."}
          </Text>
        </View>
        <Pressable style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Insomnia Severity Index</Text>
      <Text style={styles.instructions}>
        Please rate the severity of your sleep problems over the last 2 weeks.
      </Text>

      {ISI_QUESTIONS.map((q, i) => (
        <ISISlider
          key={q.key}
          question={`${i + 1}. ${q.label}`}
          options={q.options}
          value={answers[i]}
          onChange={(val) => updateAnswer(i, val)}
        />
      ))}

      <Pressable style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitBtnText}>Submit Assessment</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heading: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginBottom: spacing.sm,
  },
  instructions: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  submitBtn: {
    backgroundColor: colors.accent.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  // Result screen
  resultContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    padding: spacing.lg,
    justifyContent: "center",
  },
  resultCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  resultTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultScore: {
    fontSize: 64,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  resultMax: {
    color: colors.text.muted,
    fontSize: font.size.md,
    marginBottom: spacing.md,
  },
  severityBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  severityText: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  resultExplanation: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    textAlign: "center",
    lineHeight: 22,
  },
  continueBtn: {
    backgroundColor: colors.accent.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
  },
});
