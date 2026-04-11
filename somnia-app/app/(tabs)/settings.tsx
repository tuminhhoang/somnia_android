/**
 * Settings — Oura connection, profile, notifications, about.
 */

import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/constants";
import {
  connectOuraRing, isOuraConnected, disconnectOura,
  isAppleHealthAvailable, requestHealthKitPermissions,
  isAppleHealthConnected, disconnectAppleHealth,
  isHealthConnectAvailable, requestHealthConnectPermissions,
  isHealthConnectConnected, disconnectHealthConnect,
} from "@/services";
import { useAppStore } from "@/stores/useAppStore";

export default function SettingsScreen() {
  const patientId = useAppStore((s) => s.patientId);
  const [ouraLinked, setOuraLinked] = useState(false);
  const [healthLinked, setHealthLinked] = useState(false);
  const [hcLinked, setHcLinked] = useState(false);
  const healthAvailable = isAppleHealthAvailable();
  const hcAvailable = isHealthConnectAvailable();

  useEffect(() => {
    isOuraConnected().then(setOuraLinked);
    isAppleHealthConnected().then(setHealthLinked);
    isHealthConnectConnected().then(setHcLinked);
  }, []);

  async function handleOuraConnect() {
    const ok = await connectOuraRing(patientId ?? "demo");
    if (ok) setOuraLinked(true);
  }

  async function handleOuraDisconnect() {
    Alert.alert("Disconnect Oura?", "You can reconnect at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await disconnectOura();
          setOuraLinked(false);
        },
      },
    ]);
  }

  async function handleHealthConnect() {
    const ok = await requestHealthKitPermissions();
    if (ok) setHealthLinked(true);
  }

  async function handleHealthDisconnect() {
    Alert.alert(
      "Disconnect Apple Health?",
      "To fully revoke access, go to Settings > Health > Data Access on your iPhone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await disconnectAppleHealth();
            setHealthLinked(false);
          },
        },
      ],
    );
  }

  async function handleHcConnect() {
    const ok = await requestHealthConnectPermissions();
    if (ok) setHcLinked(true);
  }

  async function handleHcDisconnect() {
    Alert.alert(
      "Disconnect Health Connect?",
      "To fully revoke access, go to Settings > Health Connect on your Android device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await disconnectHealthConnect();
            setHcLinked(false);
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wearable Connections */}
      <Text style={styles.sectionTitle}>Wearables</Text>
      <View style={styles.card}>
        {/* Oura Ring */}
        <View style={styles.deviceRow}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>Oura Ring</Text>
            <Text style={styles.deviceStatus}>
              {ouraLinked ? "Connected" : "Not connected"}
            </Text>
          </View>
          <View
            style={[styles.statusDot, { backgroundColor: ouraLinked ? colors.zone.green : colors.text.muted }]}
          />
        </View>
        <Pressable
          style={[styles.actionBtn, ouraLinked && styles.actionBtnDanger]}
          onPress={ouraLinked ? handleOuraDisconnect : handleOuraConnect}
        >
          <Ionicons
            name={ouraLinked ? "unlink" : "link"}
            size={16}
            color={ouraLinked ? colors.zone.red : colors.accent.primary}
          />
          <Text style={[styles.actionText, ouraLinked && styles.actionTextDanger]}>
            {ouraLinked ? "Disconnect" : "Connect Oura Ring"}
          </Text>
        </Pressable>

        {/* Apple Health — iOS only */}
        {healthAvailable && (
          <>
            <View style={[styles.deviceRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Apple Health</Text>
                <Text style={styles.deviceStatus}>
                  {healthLinked ? "Connected" : "Not connected"}
                </Text>
              </View>
              <View
                style={[styles.statusDot, { backgroundColor: healthLinked ? colors.zone.green : colors.text.muted }]}
              />
            </View>
            <Pressable
              style={[styles.actionBtn, healthLinked && styles.actionBtnDanger]}
              onPress={healthLinked ? handleHealthDisconnect : handleHealthConnect}
            >
              <Ionicons
                name={healthLinked ? "unlink" : "heart"}
                size={16}
                color={healthLinked ? colors.zone.red : colors.accent.primary}
              />
              <Text style={[styles.actionText, healthLinked && styles.actionTextDanger]}>
                {healthLinked ? "Disconnect" : "Connect Apple Health"}
              </Text>
            </Pressable>
          </>
        )}

        {/* Health Connect — Android only */}
        {hcAvailable && (
          <>
            <View style={[styles.deviceRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Health Connect</Text>
                <Text style={styles.deviceStatus}>
                  {hcLinked ? "Connected" : "Not connected"}
                </Text>
              </View>
              <View
                style={[styles.statusDot, { backgroundColor: hcLinked ? colors.zone.green : colors.text.muted }]}
              />
            </View>
            <Pressable
              style={[styles.actionBtn, hcLinked && styles.actionBtnDanger]}
              onPress={hcLinked ? handleHcDisconnect : handleHcConnect}
            >
              <Ionicons
                name={hcLinked ? "unlink" : "fitness"}
                size={16}
                color={hcLinked ? colors.zone.red : colors.accent.primary}
              />
              <Text style={[styles.actionText, hcLinked && styles.actionTextDanger]}>
                {hcLinked ? "Disconnect" : "Connect Health Connect"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Profile */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <SettingRow icon="person-outline" label="Personal Info" />
        <SettingRow icon="bed-outline" label="Sleep Goal" value="8h 0m" />
        <SettingRow icon="notifications-outline" label="Bedtime Reminder" value="On" />
      </View>

      {/* CBT-I Program */}
      <Text style={styles.sectionTitle}>CBT-I Program</Text>
      <View style={styles.card}>
        <SettingRow icon="medical-outline" label="Active Module" value="Sleep Hygiene" />
        <SettingRow icon="people-outline" label="My Clinician" value="Dr. Smith" />
        <SettingRow icon="shield-checkmark-outline" label="Privacy (PIPEDA)" />
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" />
        <SettingRow icon="document-text-outline" label="Terms of Service" />
        <SettingRow icon="lock-closed-outline" label="Privacy Policy" />
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  return (
    <Pressable style={styles.settingRow}>
      <Ionicons name={icon as any} size={20} color={colors.text.secondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  deviceInfo: { flex: 1 },
  deviceName: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  deviceStatus: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnDanger: {},
  actionText: {
    color: colors.accent.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.medium,
  },
  actionTextDanger: {
    color: colors.zone.red,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  settingLabel: {
    flex: 1,
    color: colors.text.primary,
    fontSize: font.size.md,
  },
  settingValue: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    marginRight: spacing.xs,
  },
});
