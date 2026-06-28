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
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
export default function DashboardScreen({ navigation }) {
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [isArmed, setIsArmed] = useState(true);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [roomMapping, setRoomMapping] = useState({});
  const [dbRooms, setDbRooms] = useState([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  const fetchRoomsMapping = async () => {
    try {
      const homesRes = await apiClient.get('/api/homes');
      if (homesRes.data && homesRes.data.length > 0) {
        const homeId = homesRes.data[0].id;
        const roomsRes = await apiClient.get(`/api/rooms/home/${homeId}`);
        if (roomsRes.data && roomsRes.data.length > 0) {
          const mapping = {};
          roomsRes.data.forEach(r => {
            mapping[r.id] = r.name;
          });
          setRoomMapping(mapping);
          setDbRooms(roomsRes.data);
        } else {
          setDbRooms([]);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch room mapping:", e);
    }
  };

  const fetchUnreadAlertsCount = async () => {
    try {
      const res = await apiClient.get('/api/alerts?unread_only=true');
      setUnreadAlertsCount(res.data.length);
    } catch (e) {
      console.warn("Failed to fetch unread alerts count:", e);
    }
  };

  const fetchDevices = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const response = await apiClient.get("/api/devices");
      const data = response.data;
      if (Array.isArray(data)) {
        const formattedList = data.map(d => {
          let mobileType = 'outlet';
          if (d.device_type === 'light') mobileType = 'light';
          else if (d.device_type === 'ac') mobileType = 'thermostat';
          else if (d.device_type === 'fan') mobileType = 'outlet';
          else if (d.device_type === 'tv') mobileType = 'outlet';
          else if (d.device_type === 'plug') mobileType = 'outlet';

          return {
            id: d.id,
            name: d.name,
            room_id: d.room_id,
            type: mobileType,
            status: d.current_state?.status === 'ON',
            value: d.current_state?.value !== undefined ? d.current_state.value : (d.device_type === 'ac' ? 72 : 50)
          };
        });
        setDevices(formattedList);
        setHasError(false);
      } else {
        throw new Error("Returned telemetry data is not a valid list of devices");
      }
    } catch (error) {
      console.warn("API fetch failed:", error);
      setHasError(true);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRoomsMapping();
    fetchUnreadAlertsCount();
  }, []);

  useEffect(() => {
    fetchDevices(devices.length === 0);
    const intervalId = setInterval(() => {
      fetchDevices(false);
      fetchUnreadAlertsCount();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [roomMapping]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRoomsMapping();
      fetchDevices(true);
      fetchUnreadAlertsCount();
    });
    return unsubscribe;
  }, [navigation, roomMapping]);

  const handleToggleDevice = async (id) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;
    const nextStatus = !target.status;
    
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: nextStatus } : d));
    
    try {
      await apiClient.post(`/api/devices/${id}/control`, {
        state: { status: nextStatus ? 'ON' : 'OFF' }
      });
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
      await apiClient.post(`/api/devices/${id}/control`, {
        state: { 
          status: target.status ? 'ON' : 'OFF',
          value: nextVal 
        }
      });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed to sync adjusted value with server:", err);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, value: target.value } : d));
    }
  };

  const handleBulkControl = async (turnOn) => {
    const targetState = turnOn ? 'ON' : 'OFF';
    const deviceIds = filteredDevices.map(d => d.id);

    if (deviceIds.length === 0) return;

    setDevices(prev => prev.map(d => deviceIds.includes(d.id) ? { ...d, status: turnOn } : d));

    try {
      await apiClient.post('/api/devices/bulk-control', {
        device_ids: deviceIds,
        state: { status: targetState }
      });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed bulk control operation:", err);
      fetchDevices(true);
    }
  };

  const filteredDevices = selectedRoom === "all"
    ? devices
    : devices.filter((device) => device.room_id === selectedRoom);

  const isSecurityArmed = !!isArmed;
  const ROOM_TABS = [
    { id: "all", label: "All" },
    ...dbRooms.map((r) => ({ id: r.id, label: r.name }))
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
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.bellButton}
            onPress={() => navigation.navigate("Alerts")}
            accessibilityRole="button"
            accessibilityLabel="System Notifications Center"
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={TOKENS.accent} />
            {unreadAlertsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadAlertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>
              {devices.filter((d) => !!d.status).length} ACTIVE
            </Text>
          </View>
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
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>ROOM VIEWPORTS</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Rooms")} style={styles.manageLink}>
            <MaterialCommunityIcons name="cog" size={14} color={TOKENS.accent} />
            <Text style={styles.manageLinkText}>Manage</Text>
          </TouchableOpacity>
        </View>
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
      accessibilityLabel={`${tab.label} view filter`}
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

        {/* Master Switch bulk control */}
        {filteredDevices.length > 0 && (
          <View style={styles.masterSwitchCard}>
            <View style={styles.masterSwitchInfo}>
              <MaterialCommunityIcons name="power" size={22} color={TOKENS.accent} />
              <View style={styles.masterSwitchTextGroup}>
                <Text style={styles.masterSwitchTitle}>Master Switch</Text>
                <Text style={styles.masterSwitchSubtitle}>
                  Turn all {selectedRoom === "all" ? "home" : "room"} devices ON or OFF
                </Text>
              </View>
            </View>
            <View style={styles.masterSwitchActions}>
              <TouchableOpacity
                style={[styles.bulkButton, styles.bulkButtonOff]}
                onPress={() => handleBulkControl(false)}
              >
                <Text style={styles.bulkButtonTextOff}>ALL OFF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkButton, styles.bulkButtonOn]}
                onPress={() => handleBulkControl(true)}
              >
                <Text style={styles.bulkButtonTextOn}>ALL ON</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
      {/* Floating Action Button (FAB) to Add Device */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("AddDevice")}
        accessibilityRole="button"
        accessibilityLabel="Register New Appliance"
      >
        <MaterialCommunityIcons name="plus" size={28} color={TOKENS.bg} />
      </TouchableOpacity>
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
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  manageLinkText: {
    color: TOKENS.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  masterSwitchCard: {
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.border,
    marginBottom: 16,
    flexDirection: "column",
    gap: 12
  },
  masterSwitchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  masterSwitchTextGroup: {
    flex: 1
  },
  masterSwitchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TOKENS.textPrimary
  },
  masterSwitchSubtitle: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginTop: 2
  },
  masterSwitchActions: {
    flexDirection: "row",
    gap: 10
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  bulkButtonOff: {
    backgroundColor: "transparent",
    borderColor: "#EF4444"
  },
  bulkButtonOn: {
    backgroundColor: TOKENS.accent,
    borderColor: TOKENS.accent
  },
  bulkButtonTextOff: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700"
  },
  bulkButtonTextOn: {
    color: TOKENS.bg,
    fontSize: 12,
    fontWeight: "700"
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  bellButton: {
    position: "relative",
    padding: 4
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900"
  }
});
