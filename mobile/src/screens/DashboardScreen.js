import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from "react-native";
import apiClient from "../api/client";
import DeviceCard from "../components/DeviceCard";
import EnergyChart from "../components/EnergyChart";
const TOKENS = {
  bg: "#0D0D0D",
  // Deep Black
  cardBg: "#1A1A1A",
  // Dark Charcoal
  accent: "#22C55E",
  // Vibrant Green
  border: "#262626",
  // Muted Gray
  textPrimary: "#FFFFFF",
  // White
  textSecondary: "#9CA3AF"
  // Muted Gray
};
export default function DashboardScreen() {
  const [selectedRoom, setSelectedRoom] = useState("living");
  const [isArmed, setIsArmed] = useState(true);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fetchDevices = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const data = await apiClient.get("/api/devices");
      if (Array.isArray(data)) {
        setDevices(data);
        setHasError(false);
      } else {
        throw new Error("Returned telemetry data is not a valid list of devices");
      }
    } catch (error) {
      console.warn("API fetch failed, utilizing sandbox simulation:", error);
      setHasError(true);
      if (devices.length === 0) {
        try {
          const fallbackData = await apiClient.get("/api/devices");
          setDevices(fallbackData);
        } catch (simError) {
          console.error("Simulation setup failure:", simError);
        }
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };
  useEffect(() => {
    fetchDevices(true);
    const intervalId = setInterval(() => {
      fetchDevices(false);
    }, 1e4);
    return () => clearInterval(intervalId);
  }, []);
  const handleToggleDevice = async (id) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;
    const nextStatus = !target.status;
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: nextStatus } : d));
    try {
      await apiClient.post(`/api/devices/${id}/control`, { status: nextStatus });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed to sync toggle with server MQTT:", err);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: !nextStatus } : d));
    }
  };
  const handleAdjustValue = async (id, step) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;
    const maxVal = target.type === "thermostat" ? 90 : 100;
    const minVal = target.type === "thermostat" ? 60 : 0;
    const nextVal = Math.max(minVal, Math.min(maxVal, target.value + step));
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, value: nextVal } : d));
    try {
      await apiClient.post(`/api/devices/${id}/control`, { value: nextVal });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed to sync adjusted value with server:", err);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, value: target.value } : d));
    }
  };
  const filteredDevices = devices.filter((device) => device.room === selectedRoom);
  const isSecurityArmed = !!isArmed;
  const ROOM_TABS = [
    { id: "living", label: "Liv" },
    { id: "kitchen", label: "Kit" },
    { id: "bedroom", label: "Bed" },
    { id: "office", label: "Off" }
  ];
  return <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={TOKENS.bg} />
      
      {
    /* Top Header */
  }
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>SYSTEM SECURITY ARMED</Text>
          <Text style={styles.headerTitle}>SmartNest Control</Text>
        </View>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>
            {devices.filter((d) => !!d.status).length} ACTIVE
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {
    /* Bento Widget 1: Overall Efficiency Card */
  }
        <View style={styles.card}>
          <View style={styles.efficiencyHeader}>
            <View>
              <Text style={styles.cardSubtitle}>OVERALL EFFICIENCY</Text>
              <Text style={styles.cardTitle}>94.2% <Text style={styles.trendText}>(+4.1%)</Text></Text>
            </View>
            <View style={styles.efficiencyIndicatorRing}>
              <View style={styles.circularIndicator}>
                <Text style={styles.circularText}>94%</Text>
              </View>
            </View>
          </View>

          {
    /* Progress Indicators */
  }
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Solar Coverage</Text>
                <Text style={styles.progressValue}>82%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: "82%" }]} />
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Battery Reserves</Text>
                <Text style={styles.progressValue}>92%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: "92%" }]} />
              </View>
            </View>
          </View>
        </View>

        {
    /* Bento Widget 2: Perimeter Security */
  }
        <View style={[styles.card, isSecurityArmed && styles.cardActiveBorder]}>
          <View style={styles.securityRow}>
            <View style={styles.securityTextGroup}>
              <Text style={styles.cardTitle}>House Perimeter Security</Text>
              <Text style={styles.cardSubtitle}>Lockdowns armed. Video feeds streaming</Text>
            </View>
            <TouchableOpacity
    activeOpacity={0.8}
    style={[
      styles.switchTrack,
      isSecurityArmed && styles.switchTrackActive
    ]}
    onPress={() => setIsArmed(!isArmed)}
    accessibilityRole="switch"
    accessibilityState={isSecurityArmed ? { checked: true } : { checked: false }}
    accessibilityLabel="Perimeter Lockdowns State"
  >
              <View style={[
    styles.switchThumb,
    isSecurityArmed && styles.switchThumbActive
  ]} />
            </TouchableOpacity>
          </View>
        </View>

        {
    /* Room Tabs Row */
  }
        <Text style={styles.sectionHeader}>ROOM VIEWPORTS</Text>
        <View style={styles.tabsRow}>
          {ROOM_TABS.map((tab) => {
    const isActive = selectedRoom === tab.id;
    return <TouchableOpacity
      key={tab.id}
      activeOpacity={0.7}
      onPress={() => setSelectedRoom(tab.id)}
      style={[
        styles.tabChip,
        !!isActive && styles.tabChipActive
      ]}
      accessibilityRole="tab"
      accessibilityState={isActive ? { selected: true } : void 0}
      accessibilityLabel={`${tab.id} view filter`}
    >
                <Text style={[
      styles.tabChipText,
      !!isActive && styles.tabChipTextActive
    ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>;
  })}
        </View>

        {
    /* Connected Devices Grid with Fallbacks */
  }
        <Text style={styles.sectionHeader}>CONNECTED HARDWARE</Text>
        
        {isLoading ? <View style={styles.statusBox}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>Connecting to hardware relays...</Text>
          </View> : hasError ? <View style={[styles.statusBox, styles.statusBoxWarning]}>
            <Text style={styles.statusTitle}>CONNECTION FALLBACK ACTIVE</Text>
            <Text style={styles.statusSubtitle}>FastAPI server is sleeping. Local telemetry simulation running.</Text>
          </View> : filteredDevices.length === 0 ? <View style={styles.statusBox}>
            <Text style={styles.statusText}>No devices detected in this room viewport.</Text>
          </View> : <View style={styles.gridContainer}>
            {filteredDevices.map((device) => {
    const isEnabled = !!device.status;
    return <View
      key={device.id}
      style={[
        styles.gridItem,
        !!isEnabled && styles.gridItemActive
      ]}
    >
                  <View style={styles.deviceHeader}>
                    <View style={styles.deviceMeta}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {device.name}
                      </Text>
                      <Text style={styles.deviceTypeLabel}>
                        {device.type.toUpperCase()}
                      </Text>
                    </View>
                    
                    {
      /* Inline Toggle */
    }
                    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.deviceSwitchTrack,
        !!isEnabled && styles.deviceSwitchTrackActive
      ]}
      onPress={() => handleToggleDevice(device.id)}
      accessibilityRole="switch"
      accessibilityState={isEnabled ? { checked: true } : { checked: false }}
      accessibilityLabel={`Toggle power for ${device.name}`}
    >
                      <View style={[
      styles.deviceSwitchThumb,
      !!isEnabled && styles.deviceSwitchThumbActive
    ]} />
                    </TouchableOpacity>
                  </View>

                  {
      /* Brightness / Temperature Steppers */
    }
                  {(device.type === "light" || device.type === "thermostat") && <View style={styles.stepperContainer}>
                      <TouchableOpacity
      activeOpacity={0.7}
      style={styles.stepButton}
      onPress={() => handleAdjustValue(device.id, device.type === "thermostat" ? -1 : -10)}
      disabled={!isEnabled}
      accessibilityRole="button"
      accessibilityLabel="Decrease value"
    >
                        <Text style={styles.stepButtonText}>-</Text>
                      </TouchableOpacity>

                      <Text style={[styles.stepValueText, !isEnabled && styles.disabledText]}>
                        {device.value}{device.type === "light" ? "%" : "\xB0"}
                      </Text>

                      <TouchableOpacity
      activeOpacity={0.7}
      style={styles.stepButton}
      onPress={() => handleAdjustValue(device.id, device.type === "thermostat" ? 1 : 10)}
      disabled={!isEnabled}
      accessibilityRole="button"
      accessibilityLabel="Increase value"
    >
                        <Text style={styles.stepButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>}

                  {
      /* Outlet specific information */
    }
                  {device.type === "outlet" && <View style={styles.powerInfoRow}>
                      <Text style={styles.powerInfoLabel}>Consumption</Text>
                      <Text style={[styles.powerInfoValue, !!isEnabled && styles.powerInfoValueActive]}>
                        {isEnabled ? `${device.value}W` : "0W"}
                      </Text>
                    </View>}
                </View>;
  })}
          </View>}

      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: TOKENS.bg
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.border,
    backgroundColor: TOKENS.bg
  },
  headerSubtitle: {
    fontSize: 9,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.accent,
    letterSpacing: 1.5
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "System",
    fontWeight: "bold",
    color: TOKENS.textPrimary,
    marginTop: 2
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: TOKENS.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.accent,
    marginRight: 6
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "800",
    color: TOKENS.accent,
    letterSpacing: 0.5
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "800",
    color: TOKENS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12
  },
  card: {
    backgroundColor: TOKENS.cardBg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 16
  },
  cardActiveBorder: {
    borderColor: TOKENS.accent
  },
  efficiencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.textPrimary
  },
  cardSubtitle: {
    fontSize: 9,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  trendText: {
    color: TOKENS.accent,
    fontSize: 12,
    fontWeight: "600"
  },
  efficiencyIndicatorRing: {
    alignItems: "center",
    justifyContent: "center"
  },
  circularIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: TOKENS.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.05)"
  },
  circularText: {
    fontSize: 11,
    fontFamily: "System",
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  progressContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: TOKENS.border,
    paddingTop: 12,
    gap: 12
  },
  progressRow: {
    gap: 6
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressLabel: {
    fontSize: 11,
    color: TOKENS.textSecondary
  },
  progressValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: TOKENS.bg,
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: TOKENS.border
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: TOKENS.accent,
    borderRadius: 3
  },
  securityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  securityTextGroup: {
    flex: 1,
    gap: 3
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    padding: 2,
    justifyContent: "center"
  },
  switchTrackActive: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: TOKENS.accent
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.textSecondary
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: TOKENS.accent
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  tabChip: {
    flex: 1,
    backgroundColor: TOKENS.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  tabChipActive: {
    backgroundColor: TOKENS.bg,
    borderColor: TOKENS.accent
  },
  tabChipText: {
    fontSize: 11,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.textSecondary
  },
  tabChipTextActive: {
    color: TOKENS.accent
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  gridItem: {
    width: "48%",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.border,
    gap: 12
  },
  gridItemActive: {
    borderColor: "rgba(34, 197, 94, 0.4)"
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  deviceMeta: {
    flex: 1,
    marginRight: 4
  },
  deviceName: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.textPrimary
  },
  deviceTypeLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: TOKENS.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2
  },
  deviceSwitchTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    padding: 1.5,
    justifyContent: "center"
  },
  deviceSwitchTrackActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: TOKENS.accent
  },
  deviceSwitchThumb: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: TOKENS.textSecondary
  },
  deviceSwitchThumbActive: {
    transform: [{ translateX: 16 }],
    backgroundColor: TOKENS.accent
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: TOKENS.cardBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: TOKENS.border
  },
  stepButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  stepValueText: {
    fontSize: 11,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  disabledText: {
    color: TOKENS.textSecondary,
    opacity: 0.5
  },
  powerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  powerInfoLabel: {
    fontSize: 9,
    color: TOKENS.textSecondary
  },
  powerInfoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: TOKENS.textSecondary
  },
  powerInfoValueActive: {
    color: TOKENS.accent
  },
  statusBox: {
    backgroundColor: TOKENS.cardBg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginVertical: 8,
    flexDirection: "row",
    gap: 8
  },
  statusBoxWarning: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    flexDirection: "column",
    gap: 4
  },
  statusTitle: {
    color: TOKENS.accent,
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4
  },
  statusSubtitle: {
    color: TOKENS.textSecondary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16
  },
  statusText: {
    color: TOKENS.textSecondary,
    fontSize: 11,
    fontStyle: "italic"
  }
});
