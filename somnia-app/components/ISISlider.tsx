import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, font } from "@/constants";

interface ISISliderProps {
  question: string;
  options: readonly string[];
  value: number;
  onChange: (val: number) => void;
}

export function ISISlider({ question, options, value, onChange }: ISISliderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.options}>
        {options.map((label, i) => (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            style={[styles.option, value === i && styles.optionSelected]}
          >
            <Text style={[styles.optionText, value === i && styles.optionTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  question: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.accent.muted,
    borderColor: colors.accent.primary,
  },
  optionText: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
  },
  optionTextSelected: {
    color: colors.accent.primary,
    fontWeight: font.weight.semibold,
  },
});
