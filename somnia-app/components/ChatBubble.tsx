import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "@/constants";
import type { CoachMessage } from "@/types";

interface ChatBubbleProps {
  message: CoachMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.text, isUser && styles.textUser]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  bubbleAssistant: {
    backgroundColor: colors.bg.card,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleUser: {
    backgroundColor: colors.accent.secondary,
    borderBottomRightRadius: radius.sm,
  },
  text: {
    color: colors.text.primary,
    fontSize: font.size.md,
    lineHeight: 22,
  },
  textUser: {
    color: "#FFFFFF",
  },
});
