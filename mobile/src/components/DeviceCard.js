import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Switch, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeviceCard({ device, onToggle, onDelete }) {
  const theme = useTheme();
  
  // Choose icon based on device type and status
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return device.status ? 'lightbulb' : 'lightbulb-outline';
      case 'fan':
        return 'fan';
      case 'AC':
        return 'air-conditioner';
      default:
        return 'cellphone-link';
    }
  };

  // Determine icon color based on active state
  const getIconColor = () => {
    if (!device.status) return theme.colors.onSurfaceDisabled;
    switch (device.type) {
      case 'light':
        return '#EAB308'; // Warm Yellow
      case 'fan':
        return '#06B6D4'; // Cool Cyan
      case 'AC':
        return '#3B82F6'; // Indigo Blue
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        {/* Left Side: Device Icon and Info */}
        <View style={styles.leftSection}>
          <View style={[styles.iconWrapper, { backgroundColor: device.status ? theme.colors.elevation.level2 : theme.colors.elevation.level1 }]}>
            <MaterialCommunityIcons 
              name={getDeviceIcon()} 
              size={32} 
              color={getIconColor()} 
            />
          </View>
          <View style={styles.infoWrapper}>
            <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
            <Text style={styles.deviceType}>{device.type.toUpperCase()}</Text>
          </View>
        </View>

        {/* Right Side: Toggle Switch and Delete Action */}
        <View style={styles.rightSection}>
          <Switch
            value={device.status}
            onValueChange={(val) => onToggle(device.id, val)}
            color={theme.colors.primary}
          />
          <IconButton
            icon="trash-can-outline"
            iconColor={theme.colors.error}
            size={22}
            onPress={() => onDelete(device.id)}
            style={styles.deleteButton}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  deviceType: {
    fontSize: 12,
    color: '#8492A6',
    marginTop: 2,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 4,
    marginRight: -8,
  },
});
