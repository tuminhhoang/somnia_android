/**
 * AI Coach — CBT-I coaching chat powered by Claude.
 */

import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ChatBubble } from "@/components";
import { colors, spacing, radius, font } from "@/constants";
import { useAppStore } from "@/stores/useAppStore";
import { sendCoachMessage } from "@/services";
import type { CoachMessage } from "@/types";

const WELCOME_MESSAGE: CoachMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Good morning! I'm your Somnia sleep coach. I've reviewed your sleep data from last night. How are you feeling this morning?",
  timestamp: Date.now(),
};

export default function CoachScreen() {
  const messages = useAppStore((s) => s.coachMessages);
  const loading = useAppStore((s) => s.coachLoading);
  const addMessage = useAppStore((s) => s.addCoachMessage);
  const setLoading = useAppStore((s) => s.setCoachLoading);
  const patientId = useAppStore((s) => s.patientId);

  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  const allMessages =
    messages.length > 0 ? messages : [WELCOME_MESSAGE];

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput("");
    setLoading(true);

    try {
      const { reply } = await sendCoachMessage(patientId ?? "demo", text);
      const assistantMsg: CoachMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };
      addMessage(assistantMsg);
    } catch {
      addMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={listRef}
        data={allMessages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typing}>
          <Text style={styles.typingText}>Somnia is thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message your sleep coach..."
          placeholderTextColor={colors.text.muted}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendButton, !input.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  messages: {
    paddingVertical: spacing.md,
  },
  typing: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typingText: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg.secondary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: font.size.md,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.accent.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
