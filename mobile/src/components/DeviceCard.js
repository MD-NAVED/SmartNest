import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
const TOKENS = {
  bg: "#0D0D0D",
  cardBg: "#1A1A1A",
  accent: "#22C55E",
  border: "#262626",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF"
};
export default function DeviceCard({ device, onToggle, onIncrease, onDecrease }) {
  const isEnabled = !!device.status;
  return <View style={[
    styles.card,
    isEnabled && styles.cardActive
  ]}>
      <View style={styles.cardHeader}>
        <View style={styles.infoBlock}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {device.name}
          </Text>
          <Text style={styles.deviceType}>
            {device.type.toUpperCase()}
          </Text>
        </View>

        {
    /* Toggle Switch */
  }
        <TouchableOpacity
    style={[styles.switchTrack, isEnabled && styles.switchTrackActive]}
    onPress={onToggle}
    activeOpacity={0.8}
    accessibilityRole="switch"
    accessibilityState={{ checked: isEnabled }}
    accessibilityLabel={`Toggle ${device.name}`}
  >
          <View style={[styles.switchThumb, isEnabled && styles.switchThumbActive]} />
        </TouchableOpacity>
      </View>

      {
    /* Adjuster controls for Light (dimmer) or Thermostat (temperature) */
  }
      {(device.type === "light" || device.type === "thermostat") && <View style={styles.adjusterRow}>
          <TouchableOpacity
    style={styles.adjustButton}
    onPress={onDecrease}
    accessibilityRole="button"
    accessibilityLabel="Decrease value"
  >
            <Text style={styles.adjustButtonText}>-</Text>
          </TouchableOpacity>
          
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {device.value}{device.type === "light" ? "%" : "\xB0F"}
            </Text>
          </View>

          <TouchableOpacity
    style={styles.adjustButton}
    onPress={onIncrease}
    accessibilityRole="button"
    accessibilityLabel="Increase value"
  >
            <Text style={styles.adjustButtonText}>+</Text>
          </TouchableOpacity>
        </View>}

      {
    /* Static Info for power outlets */
  }
      {device.type === "outlet" && <View style={styles.outletRow}>
          <Text style={styles.outletLabel}>Load Power</Text>
          <Text style={[styles.outletValue, isEnabled && styles.outletValueActive]}>
            {isEnabled ? `${device.value} W` : "0 W"}
          </Text>
        </View>}
    </View>;
}
const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  cardActive: {
    borderColor: TOKENS.accent
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  infoBlock: {
    flex: 1,
    marginRight: 8
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: TOKENS.textPrimary
  },
  deviceType: {
    fontSize: 9,
    fontWeight: "700",
    color: TOKENS.textSecondary,
    marginTop: 4,
    letterSpacing: 1
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#262626",
    padding: 2,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  switchTrackActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: TOKENS.accent
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TOKENS.textSecondary
  },
  switchThumbActive: {
    backgroundColor: TOKENS.accent,
    transform: [{ translateX: 20 }]
  },
  adjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  adjustButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: TOKENS.cardBg,
    alignItems: "center",
    justifyContent: "center"
  },
  adjustButtonText: {
    color: TOKENS.textPrimary,
    fontSize: 16,
    fontWeight: "bold"
  },
  valueContainer: {
    alignItems: "center"
  },
  valueText: {
    color: TOKENS.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  outletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  outletLabel: {
    fontSize: 11,
    color: TOKENS.textSecondary
  },
  outletValue: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.textSecondary
  },
  outletValueActive: {
    color: TOKENS.accent
  }
});
