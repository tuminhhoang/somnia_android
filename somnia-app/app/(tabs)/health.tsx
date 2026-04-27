import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, font } from "@/constants";
import { useAppStore, type WearableHealth } from "@/stores/useAppStore";

// ── Zone helpers ─────────────────────────────────────────────────────────────

type Zone = "green" | "amber" | "red" | "none";

function hrZone(v: number): Zone {
  if (v < 45 || v > 120) return "red";
  if (v < 60 || v > 100) return "amber";
  return "green";
}
function spo2Zone(v: number): Zone {
  if (v < 90) return "red";
  if (v < 95) return "amber";
  return "green";
}
function hrvZone(v: number): Zone {
  if (v < 20) return "red";
  if (v < 50) return "amber";
  return "green";
}
function bpZone(sys: number, dia: number): Zone {
  if (sys >= 140 || dia >= 90) return "red";
  if (sys >= 120 || dia >= 80) return "amber";
  return "green";
}
function tempZone(v: number): Zone {
  if (v > 38 || v < 36) return "red";
  if (v > 37.2 || v < 36.1) return "amber";
  return "green";
}
function stressZone(v: number): Zone {
  if (v > 70) return "red";
  if (v > 40) return "amber";
  return "green";
}
function batteryZone(v: number): Zone {
  if (v < 20) return "red";
  if (v < 50) return "amber";
  return "green";
}

const zoneColor: Record<Zone, string> = {
  green: colors.zone.green,
  amber: colors.zone.amber,
  red: colors.zone.red,
  none: colors.text.muted,
};
const zoneBg: Record<Zone, string> = {
  green: colors.zone.greenMuted,
  amber: colors.zone.amberMuted,
  red: colors.zone.redMuted,
  none: "transparent",
};
const zoneLabel: Record<Zone, string> = {
  green: "Normal",
  amber: "Borderline",
  red: "Abnormal",
  none: "",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroCard({ value, unit, label, zone, subtitle }: {
  value: string; unit: string; label: string; zone: Zone; subtitle?: string;
}) {
  const fg = zoneColor[zone];
  const bg = zoneBg[zone];
  return (
    <View style={[styles.heroCard, { borderColor: fg, backgroundColor: bg }]}>
      <View style={styles.heroTop}>
        <Text style={styles.heroLabel}>{label}</Text>
        {zone !== "none" && (
          <View style={[styles.zonePill, { backgroundColor: fg + "33" }]}>
            <Text style={[styles.zonePillText, { color: fg }]}>{zoneLabel[zone]}</Text>
          </View>
        )}
      </View>
      <View style={styles.heroValueRow}>
        <Text style={[styles.heroValue, { color: fg }]}>{value}</Text>
        <Text style={[styles.heroUnit, { color: fg + "aa" }]}>{unit}</Text>
      </View>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function MetricTile({ label, value, unit, zone, icon, subtitle }: {
  label: string; value: string; unit?: string; zone: Zone; icon: string; subtitle?: string;
}) {
  const fg = zoneColor[zone];
  return (
    <View style={[styles.tile, zone !== "none" && { borderColor: fg, borderWidth: 1 }]}>
      <View style={styles.tileHeader}>
        <Ionicons name={icon as any} size={16} color={fg} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: fg }]}>{value}</Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.tileSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="watch-outline" size={56} color={colors.text.muted} />
      <Text style={styles.emptyTitle}>No device connected</Text>
      <Text style={styles.emptyBody}>
        Connect your 2208A bracelet or X3 ring in Settings to see live health data.
      </Text>
      <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/settings")}>
        <Text style={styles.emptyBtnText}>Go to Settings</Text>
      </Pressable>
    </View>
  );
}

function NoDataState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="sync-outline" size={48} color={colors.text.muted} />
      <Text style={styles.emptyTitle}>Waiting for data</Text>
      <Text style={styles.emptyBody}>
        Device is connected. Tap "Sync Health Data" in Settings or wait for the auto-sync to complete.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 0): string {
  if (v === null) return "—";
  return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function HealthScreen() {
  const connectedBracelet = useAppStore((s) => s.connectedBracelet);
  const connectedRing = useAppStore((s) => s.connectedRing);
  const health = useAppStore((s) => s.wearableHealth);

  const isConnected = !!(connectedBracelet || connectedRing);
  const hasData = health.lastUpdated !== null;
  const deviceName = connectedBracelet
    ? `2208A · ${connectedBracelet}`
    : connectedRing
    ? `X3 · ${connectedRing}`
    : null;

  // Compute zones (null-safe — show "none" zone when no data)
  const hrZoneVal: Zone = health.heartRate !== null ? hrZone(health.heartRate) : "none";
  const spo2ZoneVal: Zone = health.spo2 !== null ? spo2Zone(health.spo2) : "none";
  const hrvZoneVal: Zone = health.hrv !== null ? hrvZone(health.hrv) : "none";
  const bpZoneVal: Zone =
    health.systolic !== null && health.diastolic !== null
      ? bpZone(health.systolic, health.diastolic)
      : "none";
  const tempZoneVal: Zone = health.temperature !== null ? tempZone(health.temperature) : "none";
  const stressZoneVal: Zone = health.stress !== null ? stressZone(health.stress) : "none";
  const batteryZoneVal: Zone = health.battery !== null ? batteryZone(health.battery) : "none";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Device status bar */}
      {isConnected && (
        <View style={styles.deviceBar}>
          <Ionicons name="bluetooth" size={14} color={colors.zone.green} />
          <Text style={styles.deviceBarText}>{deviceName}</Text>
          {hasData && (
            <Text style={styles.deviceBarTime}>· synced {relativeTime(health.lastUpdated)}</Text>
          )}
        </View>
      )}

      {/* Empty states */}
      {!isConnected && <EmptyState />}
      {isConnected && !hasData && <NoDataState />}

      {/* Health data — only rendered when we have at least one reading */}
      {isConnected && hasData && (
        <>
          {/* ── Vitals ──────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Vitals</Text>

          {/* Heart rate hero */}
          <HeroCard
            label="Heart Rate"
            value={fmt(health.heartRate)}
            unit="bpm"
            zone={hrZoneVal}
            subtitle={
              health.heartRate !== null
                ? health.heartRate < 60
                  ? "Bradycardia — below resting range"
                  : health.heartRate > 100
                  ? "Tachycardia — above resting range"
                  : "Normal resting range (60–100 bpm)"
                : undefined
            }
          />

          {/* SpO2 + HRV row */}
          <View style={styles.tileRow}>
            <MetricTile
              label="Blood Oxygen"
              value={fmt(health.spo2)}
              unit="% SpO2"
              zone={spo2ZoneVal}
              icon="water-outline"
              subtitle={health.spo2 !== null && health.spo2 < 95 ? "Low — monitor closely" : ""}
            />
            <MetricTile
              label="HRV"
              value={fmt(health.hrv)}
              unit="ms"
              zone={hrvZoneVal}
              icon="pulse-outline"
              subtitle="Heart rate variability"
            />
          </View>

          {/* ── Cardiovascular ──────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Cardiovascular</Text>
          <View style={styles.tileRow}>
            <MetricTile
              label="Blood Pressure"
              value={
                health.systolic !== null && health.diastolic !== null
                  ? `${Math.round(health.systolic)}/${Math.round(health.diastolic)}`
                  : "—"
              }
              unit="mmHg"
              zone={bpZoneVal}
              icon="heart-outline"
              subtitle={
                health.systolic !== null && health.diastolic !== null
                  ? health.systolic >= 140 || health.diastolic >= 90
                    ? "Stage 2 hypertension"
                    : health.systolic >= 130 || health.diastolic >= 80
                    ? "Stage 1 hypertension"
                    : health.systolic >= 120
                    ? "Elevated"
                    : "Normal"
                  : undefined
              }
            />
            <MetricTile
              label="Stress Index"
              value={fmt(health.stress)}
              unit="/ 100"
              zone={stressZoneVal}
              icon="alert-circle-outline"
              subtitle={
                health.stress !== null
                  ? health.stress > 70
                    ? "High stress"
                    : health.stress > 40
                    ? "Moderate stress"
                    : "Low stress"
                  : undefined
              }
            />
          </View>

          {/* ── Body ────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Body</Text>
          <View style={styles.tileRow}>
            <MetricTile
              label="Temperature"
              value={fmt(health.temperature, 1)}
              unit="°C"
              zone={tempZoneVal}
              icon="thermometer-outline"
              subtitle={
                health.temperature !== null
                  ? health.temperature > 38
                    ? "Fever"
                    : health.temperature > 37.2
                    ? "Slightly elevated"
                    : "Normal"
                  : undefined
              }
            />
            <MetricTile
              label="Device Battery"
              value={fmt(health.battery)}
              unit="%"
              zone={batteryZoneVal}
              icon="battery-half-outline"
            />
          </View>

          {/* ── Activity ────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Activity Today</Text>
          <View style={styles.tileRow}>
            <MetricTile
              label="Steps"
              value={
                health.steps !== null
                  ? health.steps >= 1000
                    ? `${(health.steps / 1000).toFixed(1)}k`
                    : fmt(health.steps)
                  : "—"
              }
              zone={health.steps !== null ? (health.steps >= 10000 ? "green" : health.steps >= 5000 ? "amber" : "none") : "none"}
              icon="footsteps-outline"
              subtitle="Daily goal: 10,000"
            />
            <MetricTile
              label="Calories"
              value={fmt(health.calories)}
              unit="kcal"
              zone="none"
              icon="flame-outline"
            />
          </View>

          {/* ── Zones legend ─────────────────────────────────────── */}
          <View style={styles.legend}>
            {(["green", "amber", "red"] as Zone[]).map((z) => (
              <View key={z} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: zoneColor[z] }]} />
                <Text style={styles.legendText}>{zoneLabel[z]}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  deviceBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  deviceBarText: { color: colors.zone.green, fontSize: font.size.sm, fontWeight: font.weight.medium },
  deviceBarTime: { color: colors.text.muted, fontSize: font.size.sm },

  sectionTitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Hero card (heart rate)
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  heroLabel: { color: colors.text.secondary, fontSize: font.size.sm, fontWeight: font.weight.semibold, textTransform: "uppercase", letterSpacing: 1 },
  zonePill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  zonePillText: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  heroValueRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  heroValue: { fontSize: font.size.hero, fontWeight: font.weight.bold },
  heroUnit: { fontSize: font.size.lg },
  heroSubtitle: { color: colors.text.muted, fontSize: font.size.sm, marginTop: spacing.xs },

  // Metric tiles
  tileRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 0,
  },
  tileHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  tileLabel: { color: colors.text.secondary, fontSize: font.size.xs, fontWeight: font.weight.medium, textTransform: "uppercase", letterSpacing: 0.5 },
  tileValueRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  tileValue: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  tileUnit: { color: colors.text.muted, fontSize: font.size.xs },
  tileSubtitle: { color: colors.text.muted, fontSize: font.size.xs, marginTop: spacing.xs },

  // Empty states
  emptyContainer: { alignItems: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text.primary, fontSize: font.size.lg, fontWeight: font.weight.semibold, marginTop: spacing.md },
  emptyBody: { color: colors.text.muted, fontSize: font.size.sm, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  emptyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyBtnText: { color: "#fff", fontWeight: font.weight.semibold, fontSize: font.size.md },

  // Legend
  legend: { flexDirection: "row", gap: spacing.md, justifyContent: "center", marginTop: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.text.muted, fontSize: font.size.xs },
});
