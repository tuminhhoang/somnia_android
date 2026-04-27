import {
  ScrollView, View, Text, Pressable, StyleSheet, Alert,
  Modal, FlatList, ActivityIndicator, TextInput, Switch,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/constants";
import {
  connectOuraRing, isOuraConnected, disconnectOura,
  isAppleHealthAvailable, requestHealthKitPermissions,
  isAppleHealthConnected, disconnectAppleHealth,
  isHealthConnectAvailable, requestHealthConnectPermissions,
  isHealthConnectConnected, disconnectHealthConnect,
} from "@/services";
import * as Wearable from "@/services/wearable";
import { useAppStore, type UserProfile } from "@/stores/useAppStore";

export default function SettingsScreen() {
  const patientId = useAppStore((s) => s.patientId);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const sleepGoalHours = useAppStore((s) => s.sleepGoalHours);
  const sleepGoalMinutes = useAppStore((s) => s.sleepGoalMinutes);
  const setSleepGoal = useAppStore((s) => s.setSleepGoal);
  const bedtimeReminderEnabled = useAppStore((s) => s.bedtimeReminderEnabled);
  const bedtimeReminderTime = useAppStore((s) => s.bedtimeReminderTime);
  const setBedtimeReminder = useAppStore((s) => s.setBedtimeReminder);
  // Connection state lives in the store so Health tab can read it
  const connectedBracelet = useAppStore((s) => s.connectedBracelet);
  const connectedRing = useAppStore((s) => s.connectedRing);
  const storeSetBracelet = useAppStore((s) => s.setConnectedBracelet);
  const storeSetRing = useAppStore((s) => s.setConnectedRing);
  const updateWearableHealth = useAppStore((s) => s.updateWearableHealth);
  const setSleepSummary = useAppStore((s) => s.setSleepSummary);

  const [ouraLinked, setOuraLinked] = useState(false);
  const [healthLinked, setHealthLinked] = useState(false);
  const [hcLinked, setHcLinked] = useState(false);
  const healthAvailable = isAppleHealthAvailable();
  const hcAvailable = isHealthConnectAvailable();

  // BLE scan UI state (local — only needed in this screen)
  const [bleScanning, setBleScanning] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Wearable.ScannedDevice[]>([]);
  const [pendingDeviceType, setPendingDeviceType] = useState<Wearable.DeviceType>("bracelet");
  const [syncing, setSyncing] = useState(false);
  const [syncDataCount, setSyncDataCount] = useState(0);
  const [lastMetrics, setLastMetrics] = useState<{ hr?: string; hrv?: string; spo2?: string }>({});
  const subscriptions = useRef<any[]>([]);

  // Settings modal visibility
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [sleepGoalVisible, setSleepGoalVisible] = useState(false);
  const [bedtimeVisible, setBedtimeVisible] = useState(false);

  // Draft state for in-progress edits
  const [draftProfile, setDraftProfile] = useState<UserProfile>({ name: "", age: "", gender: "", weight: "", height: "" });
  const [draftGoalHours, setDraftGoalHours] = useState("8");
  const [draftGoalMins, setDraftGoalMins] = useState("0");
  const [draftBedtimeEnabled, setDraftBedtimeEnabled] = useState(false);
  const [draftBedtimeTime, setDraftBedtimeTime] = useState("22:00");

  useEffect(() => {
    isOuraConnected().then(setOuraLinked);
    isAppleHealthConnected().then(setHealthLinked);
    isHealthConnectConnected().then(setHcLinked);

    if (Wearable.isAvailable) {
      const s1 = Wearable.onDeviceFound((device) => {
        setScannedDevices((prev) => {
          if (prev.some((d) => d.address === device.address)) return prev;
          return [...prev, device];
        });
      });

      const s2 = Wearable.onConnectionChanged((event) => {
        const addr = event.address ?? null;
        if (event.status === "connected") {
          if (event.deviceType === "bracelet") storeSetBracelet(addr);
          else storeSetRing(addr);
          setScanModalVisible(false);
          // Auto-sync on connect
          setSyncing(true);
          setSyncDataCount(0);
          setLastMetrics({});
          Wearable.syncTime()
            .then(() => Wearable.syncAllData())
            .catch((e: any) => Alert.alert("Sync Error", e.message))
            .finally(() => setSyncing(false));
        } else if (event.status === "disconnected") {
          if (event.deviceType === "bracelet") storeSetBracelet(null);
          else storeSetRing(null);
        }
      });

      const s3 = Wearable.onDataReceived((data) => {
        setSyncDataCount((c) => c + 1);

        // Scalar metrics — check both 2208A and X3 key names
        const hr         = data["heartRate"]    ?? data["HeartRate"]             ?? data["PPGHR"];
        const hrv        = data["hrv"]          ?? data["hrvValue"]              ?? data["KHrvTestValue"] ?? data["KHrvResultValue"];
        const spo2       = data["Blood_oxygen"];
        const systolic   = data["highPressure"] ?? data["KHrvBloodHighPressure"] ?? data["PPGSBP"];
        const diastolic  = data["lowPressure"]  ?? data["KHrvBloodLowPressure"]  ?? data["PPGDBP"];
        const temperature = data["temperature"] ?? data["Temperature"];
        const stress     = data["stress"]       ?? data["ECGStreesValue"];
        const steps      = data["step"]         ?? data["Steps"];
        const calories   = data["calories"]     ?? data["Calories"];
        const battery    = data["batteryLevel"] ?? data["Battery"];

        const patch: Record<string, number> = {};
        if (hr)          patch.heartRate    = parseFloat(hr);
        if (hrv)         patch.hrv          = parseFloat(hrv);
        if (spo2)        patch.spo2         = parseFloat(spo2);
        if (systolic)    patch.systolic     = parseFloat(systolic);
        if (diastolic)   patch.diastolic    = parseFloat(diastolic);
        if (temperature) patch.temperature  = parseFloat(temperature);
        if (stress)      patch.stress       = parseFloat(stress);
        if (steps)       patch.steps        = parseFloat(steps);
        if (calories)    patch.calories     = parseFloat(calories);
        if (battery)     patch.battery      = parseFloat(battery);

        // Always call so lastUpdated is stamped even for array-only packets
        updateWearableHealth(patch);

        // Parse sleep stage array → SleepSummary
        // Stage encoding: 0=no data, 1=awake, 2=light, 3=deep, 4=not worn
        const sleepRaw = data["arraySleepQuality"] ?? data["ArraySleep"];
        if (sleepRaw) {
          const stages = String(sleepRaw)
            .replace(/[\[\]\s]/g, "")
            .split(",")
            .map(Number)
            .filter((n) => !isNaN(n));
          const unit = data["sleepUnitLength"] ? parseInt(String(data["sleepUnitLength"]), 10) : 5;
          let deep = 0, light = 0, awake = 0;
          for (const s of stages) {
            if (s === 3) deep += unit;
            else if (s === 2) light += unit;
            else if (s === 1) awake += unit;
          }
          const total = deep + light;
          const tib = total + awake;
          setSleepSummary({
            date: new Date().toISOString().split("T")[0],
            totalMinutes: total,
            timeinBedMinutes: tib,
            efficiency: tib > 0 ? Math.round((total / tib) * 100) : 0,
            deepMinutes: deep,
            remMinutes: 0,
            lightMinutes: light,
            awakeMinutes: awake,
          });
        }

        // Keep local display metrics for sync summary in this screen
        if (hr || hrv || spo2) {
          setLastMetrics((prev) => ({
            ...prev,
            ...(hr ? { hr } : {}),
            ...(hrv ? { hrv } : {}),
            ...(spo2 ? { spo2 } : {}),
          }));
        }
      });

      subscriptions.current = [s1, s2, s3];
    }

    return () => {
      subscriptions.current.forEach((s) => s?.remove());
    };
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

  async function openBraceletScan() {
    setPendingDeviceType("bracelet");
    setScannedDevices([]);
    setScanModalVisible(true);
    setBleScanning(true);
    try {
      await Wearable.startScan("bracelet");
    } catch (e: any) {
      Alert.alert("Scan Error", e.message);
      setScanModalVisible(false);
    }
    setTimeout(() => setBleScanning(false), 15000);
  }

  async function openRingScan() {
    setPendingDeviceType("ring");
    setScannedDevices([]);
    setScanModalVisible(true);
    setBleScanning(true);
    try {
      await Wearable.startScan("ring");
    } catch (e: any) {
      Alert.alert("Scan Error", e.message);
      setScanModalVisible(false);
    }
    setTimeout(() => setBleScanning(false), 15000);
  }

  async function closeScanModal() {
    await Wearable.stopScan();
    setScanModalVisible(false);
    setBleScanning(false);
  }

  async function connectDevice(device: Wearable.ScannedDevice) {
    await Wearable.stopScan();
    setBleScanning(false);
    try {
      if (pendingDeviceType === "bracelet") {
        await Wearable.connectBracelet(device.address);
      } else {
        await Wearable.connectRing(device.address);
      }
    } catch (e: any) {
      Alert.alert("Connection Error", e.message);
      setScanModalVisible(false);
    }
  }

  async function handleDisconnectBracelet() {
    Alert.alert("Disconnect Bracelet?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await Wearable.disconnect();
          storeSetBracelet(null);
        },
      },
    ]);
  }

  async function handleDisconnectRing() {
    Alert.alert("Disconnect Ring?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await Wearable.disconnect();
          storeSetRing(null);
        },
      },
    ]);
  }

  async function handleSyncAll() {
    setSyncing(true);
    setSyncDataCount(0);
    setLastMetrics({});
    try {
      await Wearable.syncTime();
      await Wearable.syncAllData();
    } catch (e: any) {
      Alert.alert("Sync Error", e.message);
    } finally {
      setSyncing(false);
    }
  }

  function openPersonalInfo() {
    setDraftProfile(userProfile ?? { name: "", age: "", gender: "", weight: "", height: "" });
    setPersonalInfoVisible(true);
  }

  function savePersonalInfo() {
    setUserProfile(draftProfile);
    setPersonalInfoVisible(false);
  }

  function openSleepGoal() {
    setDraftGoalHours(String(sleepGoalHours));
    setDraftGoalMins(String(sleepGoalMinutes));
    setSleepGoalVisible(true);
  }

  function saveSleepGoal() {
    const h = Math.min(12, Math.max(0, parseInt(draftGoalHours) || 0));
    const m = Math.min(59, Math.max(0, parseInt(draftGoalMins) || 0));
    setSleepGoal(h, m);
    setSleepGoalVisible(false);
  }

  function openBedtimeReminder() {
    setDraftBedtimeEnabled(bedtimeReminderEnabled);
    setDraftBedtimeTime(bedtimeReminderTime);
    setBedtimeVisible(true);
  }

  function saveBedtimeReminder() {
    setBedtimeReminder(draftBedtimeEnabled, draftBedtimeTime);
    setBedtimeVisible(false);
  }

  const syncSummary = [
    lastMetrics.hr && `HR: ${lastMetrics.hr} bpm`,
    lastMetrics.hrv && `HRV: ${lastMetrics.hrv} ms`,
    lastMetrics.spo2 && `SpO2: ${lastMetrics.spo2}%`,
  ].filter(Boolean).join("  ·  ");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* BLE Device Scan Modal */}
      <Modal visible={scanModalVisible} animationType="slide" transparent onRequestClose={closeScanModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pendingDeviceType === "bracelet" ? "Find Bracelet (2208A)" : "Find Ring (X3)"}
              </Text>
              <Pressable onPress={closeScanModal}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            {bleScanning && (
              <View style={styles.scanningRow}>
                <ActivityIndicator color={colors.accent.primary} />
                <Text style={styles.scanningText}>Scanning for devices...</Text>
              </View>
            )}
            {!bleScanning && scannedDevices.length === 0 && (
              <Text style={styles.emptyText}>No devices found. Make sure your device is nearby and powered on.</Text>
            )}
            <FlatList
              data={scannedDevices}
              keyExtractor={(d) => d.address}
              renderItem={({ item }) => (
                <Pressable style={styles.deviceListRow} onPress={() => connectDevice(item)}>
                  <Ionicons name="bluetooth" size={20} color={colors.accent.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.deviceName}>{item.name || "Unknown Device"}</Text>
                    <Text style={styles.deviceStatus}>{item.address} · {item.rssi} dBm</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Personal Info Modal */}
      <Modal visible={personalInfoVisible} animationType="slide" transparent onRequestClose={() => setPersonalInfoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Info</Text>
              <Pressable onPress={() => setPersonalInfoVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            <FormField label="Name" value={draftProfile.name}
              onChangeText={(v) => setDraftProfile((p) => ({ ...p, name: v }))}
              placeholder="Your name" />
            <FormField label="Age" value={draftProfile.age}
              onChangeText={(v) => setDraftProfile((p) => ({ ...p, age: v }))}
              placeholder="e.g. 35" keyboardType="numeric" />
            <FormField label="Gender" value={draftProfile.gender}
              onChangeText={(v) => setDraftProfile((p) => ({ ...p, gender: v }))}
              placeholder="Male / Female / Other" />
            <FormField label="Weight (kg)" value={draftProfile.weight}
              onChangeText={(v) => setDraftProfile((p) => ({ ...p, weight: v }))}
              placeholder="e.g. 70" keyboardType="numeric" />
            <FormField label="Height (cm)" value={draftProfile.height}
              onChangeText={(v) => setDraftProfile((p) => ({ ...p, height: v }))}
              placeholder="e.g. 175" keyboardType="numeric" />
            <Pressable style={styles.saveBtn} onPress={savePersonalInfo}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sleep Goal Modal */}
      <Modal visible={sleepGoalVisible} animationType="slide" transparent onRequestClose={() => setSleepGoalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sleep Goal</Text>
              <Pressable onPress={() => setSleepGoalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            <Text style={styles.formLabel}>Target sleep duration</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationField}>
                <TextInput style={styles.durationInput} value={draftGoalHours}
                  onChangeText={setDraftGoalHours} keyboardType="numeric"
                  maxLength={2} placeholderTextColor={colors.text.muted} />
                <Text style={styles.durationUnit}>hours</Text>
              </View>
              <View style={styles.durationField}>
                <TextInput style={styles.durationInput} value={draftGoalMins}
                  onChangeText={setDraftGoalMins} keyboardType="numeric"
                  maxLength={2} placeholderTextColor={colors.text.muted} />
                <Text style={styles.durationUnit}>min</Text>
              </View>
            </View>
            <Pressable style={styles.saveBtn} onPress={saveSleepGoal}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Bedtime Reminder Modal */}
      <Modal visible={bedtimeVisible} animationType="slide" transparent onRequestClose={() => setBedtimeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bedtime Reminder</Text>
              <Pressable onPress={() => setBedtimeVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Enable reminder</Text>
              <Switch value={draftBedtimeEnabled} onValueChange={setDraftBedtimeEnabled}
                trackColor={{ true: colors.accent.primary }} />
            </View>
            {draftBedtimeEnabled && (
              <FormField label="Reminder time (HH:MM)" value={draftBedtimeTime}
                onChangeText={setDraftBedtimeTime} placeholder="22:00" keyboardType="numbers-and-punctuation" />
            )}
            <Pressable style={styles.saveBtn} onPress={saveBedtimeReminder}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* JStyle BLE Devices — Android only */}
      {Wearable.isAvailable && (
        <>
          <Text style={styles.sectionTitle}>Somnia Devices</Text>
          <View style={styles.card}>
            {/* 2208A Bracelet */}
            <View style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Health Bracelet (2208A)</Text>
                <Text style={styles.deviceStatus}>
                  {connectedBracelet ? `Connected · ${connectedBracelet}` : "Not connected"}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: connectedBracelet ? colors.zone.green : colors.text.muted }]} />
            </View>
            <Pressable
              style={[styles.actionBtn, connectedBracelet && styles.actionBtnDanger]}
              onPress={connectedBracelet ? handleDisconnectBracelet : openBraceletScan}
            >
              <Ionicons name={connectedBracelet ? "unlink" : "bluetooth"} size={16}
                color={connectedBracelet ? colors.zone.red : colors.accent.primary} />
              <Text style={[styles.actionText, connectedBracelet && styles.actionTextDanger]}>
                {connectedBracelet ? "Disconnect Bracelet" : "Connect Bracelet"}
              </Text>
            </Pressable>

            {/* X3 Ring */}
            <View style={[styles.deviceRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Smart Ring (X3)</Text>
                <Text style={styles.deviceStatus}>
                  {connectedRing ? `Connected · ${connectedRing}` : "Not connected"}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: connectedRing ? colors.zone.green : colors.text.muted }]} />
            </View>
            <Pressable
              style={[styles.actionBtn, connectedRing && styles.actionBtnDanger]}
              onPress={connectedRing ? handleDisconnectRing : openRingScan}
            >
              <Ionicons name={connectedRing ? "unlink" : "bluetooth"} size={16}
                color={connectedRing ? colors.zone.red : colors.accent.primary} />
              <Text style={[styles.actionText, connectedRing && styles.actionTextDanger]}>
                {connectedRing ? "Disconnect Ring" : "Connect Ring"}
              </Text>
            </Pressable>

            {/* Sync controls — shown when any device connected */}
            {(connectedBracelet || connectedRing) && (
              <>
                <Pressable style={styles.actionBtn} onPress={handleSyncAll} disabled={syncing}>
                  {syncing
                    ? <ActivityIndicator size="small" color={colors.accent.primary} />
                    : <Ionicons name="sync" size={16} color={colors.accent.primary} />}
                  <Text style={styles.actionText}>
                    {syncing ? "Syncing..." : "Sync Health Data"}
                  </Text>
                </Pressable>
                {/* Last sync summary */}
                {(syncSummary || syncDataCount > 0) && (
                  <View style={styles.syncSummaryRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.zone.green} />
                    <Text style={styles.syncSummaryText}>
                      {syncSummary || `${syncDataCount} data packet${syncDataCount !== 1 ? "s" : ""} received`}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </>
      )}

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
          <View style={[styles.statusDot, { backgroundColor: ouraLinked ? colors.zone.green : colors.text.muted }]} />
        </View>
        <Pressable
          style={[styles.actionBtn, ouraLinked && styles.actionBtnDanger]}
          onPress={ouraLinked ? handleOuraDisconnect : handleOuraConnect}
        >
          <Ionicons name={ouraLinked ? "unlink" : "link"} size={16}
            color={ouraLinked ? colors.zone.red : colors.accent.primary} />
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
                <Text style={styles.deviceStatus}>{healthLinked ? "Connected" : "Not connected"}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: healthLinked ? colors.zone.green : colors.text.muted }]} />
            </View>
            <Pressable
              style={[styles.actionBtn, healthLinked && styles.actionBtnDanger]}
              onPress={healthLinked ? handleHealthDisconnect : handleHealthConnect}
            >
              <Ionicons name={healthLinked ? "unlink" : "heart"} size={16}
                color={healthLinked ? colors.zone.red : colors.accent.primary} />
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
                <Text style={styles.deviceStatus}>{hcLinked ? "Connected" : "Not connected"}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: hcLinked ? colors.zone.green : colors.text.muted }]} />
            </View>
            <Pressable
              style={[styles.actionBtn, hcLinked && styles.actionBtnDanger]}
              onPress={hcLinked ? handleHcDisconnect : handleHcConnect}
            >
              <Ionicons name={hcLinked ? "unlink" : "fitness"} size={16}
                color={hcLinked ? colors.zone.red : colors.accent.primary} />
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
        <SettingRow icon="person-outline" label="Personal Info"
          value={userProfile?.name || undefined}
          onPress={openPersonalInfo} />
        <SettingRow icon="bed-outline" label="Sleep Goal"
          value={`${sleepGoalHours}h ${sleepGoalMinutes > 0 ? `${sleepGoalMinutes}m` : ""}`.trim()}
          onPress={openSleepGoal} />
        <SettingRow icon="notifications-outline" label="Bedtime Reminder"
          value={bedtimeReminderEnabled ? bedtimeReminderTime : "Off"}
          onPress={openBedtimeReminder} />
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
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={colors.text.secondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />}
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        keyboardType={keyboardType}
      />
    </View>
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
  statusDot: { width: 10, height: 10, borderRadius: 5 },
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
  actionTextDanger: { color: colors.zone.red },
  syncSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  syncSummaryText: {
    color: colors.zone.green,
    fontSize: font.size.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  scanningText: { color: colors.text.secondary, fontSize: font.size.sm },
  emptyText: {
    color: colors.text.muted,
    fontSize: font.size.sm,
    textAlign: "center",
    padding: spacing.lg,
  },
  deviceListRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formField: { marginBottom: spacing.md },
  formLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text.primary,
    fontSize: font.size.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  durationField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  durationInput: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text.primary,
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationUnit: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
});
