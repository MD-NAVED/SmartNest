import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function HistoryScreen() {
  const theme = useTheme();
  
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user devices list
  const fetchDevices = async () => {
    try {
      const response = await apiClient.get('/api/devices');
      const data = response.data;
      setDevices(data);
      
      // Auto-select the first device if none is selected
      if (data.length > 0) {
        if (!selectedDevice || !data.some(d => d.id === selectedDevice.id)) {
          setSelectedDevice(data[0]);
          fetchDeviceHistory(data[0].id);
        } else {
          // Refresh history of currently selected device
          fetchDeviceHistory(selectedDevice.id);
        }
      } else {
        setSelectedDevice(null);
        setHistory([]);
      }
    } catch (error) {
      console.error('[History] Error fetching devices:', error);
    } finally {
      setLoadingDevices(false);
      setRefreshing(false);
    }
  };

  // Fetch history for a specific device
  const fetchDeviceHistory = async (deviceId) => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get(`/api/devices/${deviceId}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('[History] Error fetching device history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };

  // Device selection change handler
  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    fetchDeviceHistory(device.id);
  };

  // Trigger loading when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [selectedDevice])
  );

  // Helper to get styled attributes based on log event type
  const getLogStyle = (changeType) => {
    switch (changeType) {
      case 'device_created':
        return {
          label: 'Device Created',
          icon: 'plus-circle',
          color: '#10B981', // green
        };
      case 'command_sent':
        return {
          label: 'Command Sent',
          icon: 'arrow-right-bold-circle',
          color: '#3B82F6', // blue
        };
      case 'status_confirmed':
        return {
          label: 'State Confirmed',
          icon: 'check-circle',
          color: '#14B8A6', // teal
        };
      default:
        return {
          label: 'Event Log',
          icon: 'information-slab-circle',
          color: theme.colors.primary,
        };
    }
  };

  // Helper to format timestamps nicely
  const formatTimestamp = (dateStr) => {
    try {
      const d = new Date(dateStr);
      // Format: YYYY-MM-DD HH:MM:SS
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loadingDevices && devices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {devices.length === 0 ? (
        // Empty State
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="timeline-text-outline" size={80} color="#334155" />
          <Text style={styles.emptyTitle}>No Device Logs</Text>
          <Text style={styles.emptySubtitle}>
            Add and control devices to start logging operational events.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Horizontal scroll selection for devices */}
          <View style={styles.headerSelection}>
            <Text style={styles.selectionLabel}>Select Device:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.deviceSlider}
            >
              {devices.map((device) => {
                const isSelected = selectedDevice && selectedDevice.id === device.id;
                return (
                  <Chip
                    key={device.id}
                    selected={isSelected}
                    onPress={() => handleSelectDevice(device)}
                    style={[
                      styles.deviceChip, 
                      isSelected && { backgroundColor: theme.colors.primary }
                    ]}
                    selectedColor="#F8FAFC"
                    textStyle={[styles.chipText, isSelected && { fontWeight: 'bold' }]}
                    showSelectedOverlay
                  >
                    {device.name}
                  </Chip>
                );
              })}
            </ScrollView>
          </View>

          {/* Timeline History List */}
          {loadingHistory ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="playlist-remove" size={64} color="#334155" />
              <Text style={styles.emptyTitle}>No Events Logged</Text>
              <Text style={styles.emptySubtitle}>
                No operations recorded for {selectedDevice?.name || 'this device'} yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.timelineList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                />
              }
              renderItem={({ item, index }) => {
                const logStyle = getLogStyle(item.change_type);
                return (
                  <View style={styles.timelineItem}>
                    {/* Left Timeline Indicator */}
                    <View style={styles.timelineLeft}>
                      <MaterialCommunityIcons name={logStyle.icon} size={28} color={logStyle.color} />
                      {index < history.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    
                    {/* Right Timeline Card Details */}
                    <Card style={styles.timelineCard}>
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Text style={[styles.eventLabel, { color: logStyle.color }]}>
                            {logStyle.label}
                          </Text>
                          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                        </View>
                        
                        {item.change_type === 'device_created' && (
                          <Text style={styles.eventDesc}>Device registered. Initial state is OFF.</Text>
                        )}

                        {item.change_type === 'command_sent' && (
                          <Text style={styles.eventDesc}>
                            Requested state change from{' '}
                            <Text style={styles.boldText}>{item.previous_state}</Text> to{' '}
                            <Text style={[styles.boldText, { color: theme.colors.primary }]}>{item.new_state}</Text>.
                          </Text>
                        )}

                        {item.change_type === 'status_confirmed' && (
                          <Text style={styles.eventDesc}>
                            Device reported state change. Confirmed to be{' '}
                            <Text style={[styles.boldText, { color: '#14B8A6' }]}>{item.new_state}</Text>.
                          </Text>
                        )}
                      </Card.Content>
                    </Card>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  headerSelection: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginLeft: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  deviceSlider: {
    paddingHorizontal: 12,
  },
  deviceChip: {
    marginHorizontal: 4,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  chipText: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  timelineList: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 28,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  eventDesc: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
