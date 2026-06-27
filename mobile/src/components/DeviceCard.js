import React from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Calculate grid card size (roughly half screen width minus margins)
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

export default function DeviceCard({ device, onToggle, onDelete }) {
  const theme = useTheme();
  
  // Choose icon based on device type and status
  const getDeviceIcon = () => {
    const type = (device?.device_type || device?.type || 'light').toLowerCase();
    const status = device?.current_state?.status === 'ON' || !!device?.status;
    switch (type) {
      case 'light':
        return status ? 'lightbulb-on' : 'lightbulb-outline';
      case 'fan':
        return 'fan';
      case 'ac':
        return 'air-conditioner';
      default:
        return 'developer-board';
    }
  };

  const activeColor = '#22C55E';
  const inactiveColor = '#262626';
  const statusOn = device?.current_state?.status === 'ON' || !!device?.status;
  const textColor = statusOn ? '#FFFFFF' : '#9CA3AF';
  const iconColor = statusOn ? '#22C55E' : '#9CA3AF';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle && onToggle(device?.id, !statusOn)}
      style={[
        styles.cardContainer,
        {
          borderColor: statusOn ? activeColor : inactiveColor,
        }
      ]}
    >
      {/* Top right corner: Small delete button */}
      <IconButton
        icon="close-circle-outline"
        iconColor={statusOn ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF'}
        size={18}
        onPress={() => onDelete && onDelete(device?.id)}
        style={styles.deleteBtn}
      />

      {/* Center Section: Clean Icon Wrapper */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name={getDeviceIcon()} 
          size={36} 
          color={iconColor} 
        />
      </View>

      {/* Bottom Section: Device Label & Category */}
      <View style={styles.textContainer}>
        <Text style={[styles.deviceName, { color: textColor }]} numberOfLines={1}>
          {device?.name || 'Unknown Node'}
        </Text>
        <Text style={styles.deviceType}>
          {(device?.device_type || device?.type || 'UNKNOWN').toUpperCase()}
        </Text>
      </View>

      {/* Active Dot Status */}
      <View style={[
        styles.statusDot,
        { backgroundColor: statusOn ? activeColor : '#374151' }
      ]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
  },
  deleteBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
    margin: 0,
    zIndex: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  deviceType: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 12,
  },
});
