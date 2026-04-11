/**
 * Onboarding — welcome screen + connect wearable + initial ISI.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/constants";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="moon" size={64} color={colors.accent.primary} />
        <Text style={styles.title}>Welcome to Somna</Text>
        <Text style={styles.subtitle}>
          Your personal sleep coach, powered by CBT-I — the gold standard
          treatment for insomnia.
        </Text>
      </View>

      <View style={styles.steps}>
        <StepItem
          number={1}
          title="Connect your wearable"
          description="Oura Ring, Whoop, or Apple Watch"
        />
        <StepItem
          number={2}
          title="Complete sleep assessment"
          description="Quick 7-question ISI questionnaire"
        />
        <StepItem
          number={3}
          title="Get your personalized plan"
          description="AI-powered coaching tailored to you"
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/onboarding/isi")}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function StepItem({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    padding: spacing.lg,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.hero,
    fontWeight: font.weight.bold,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  steps: {
    marginBottom: spacing.xxl,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.muted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: colors.accent.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  stepContent: { flex: 1 },
  stepTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  stepDesc: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    marginTop: 2,
  },
  actions: {
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.accent.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
  },
});
