import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Switch
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

const TOKENS = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  accent: '#22C55E',
  border: '#262626',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  error: '#EF4444'
};

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' }
];

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Schedule Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedAction, setSelectedAction] = useState('ON');
  const [scheduleTime, setScheduleTime] = useState('08:00'); // HH:MM
  const [selectedDays, setSelectedDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [schedsRes, devsRes] = await Promise.all([
        apiClient.get('/api/schedules'),
        apiClient.get('/api/devices')
      ]);
      setSchedules(schedsRes.data);
      setDevices(devsRes.data);
      if (devsRes.data.length > 0) {
        setSelectedDeviceId(devsRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load schedules dataset:', error);
      Alert.alert('Error', 'Could not sync schedules and devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (scheduleId, currentVal) => {
    // Optimistic toggle
    setSchedules(prev =>
      prev.map(s => s.id === scheduleId ? { ...s, enabled: !currentVal } : s)
    );

    try {
      await apiClient.patch(`/api/schedules/${scheduleId}`, {
        enabled: !currentVal
      });
    } catch (error) {
      console.error('Failed to toggle schedule state:', error);
      // Rollback
      setSchedules(prev =>
        prev.map(s => s.id === scheduleId ? { ...s, enabled: currentVal } : s)
      );
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedDeviceId) {
      Alert.alert('Validation Error', 'Please select a device');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduleTime)) {
      Alert.alert('Validation Error', 'Time must be in HH:MM 24h format (e.g. 08:30)');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one day');
      return;
    }

    try {
      setIsSaving(true);
      const daysCSV = selectedDays.join(',');
      await apiClient.post('/api/schedules', {
        device_id: selectedDeviceId,
        action: selectedAction,
        time: scheduleTime,
        days: daysCSV,
        enabled: true
      });

      setModalVisible(false);
      setScheduleTime('08:00');
      setSelectedDays(['mon', 'tue', 'wed', 'thu', 'fri']);
      
      // Refresh list
      const schedsRes = await apiClient.get('/api/schedules');
      setSchedules(schedsRes.data);
      Alert.alert('Success', 'Automation schedule successfully created');
    } catch (error) {
      console.error('Failed to create schedule:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = (scheduleId) => {
    Alert.alert(
      'Remove Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiClient.delete(`/api/schedules/${scheduleId}`);
              const schedsRes = await apiClient.get('/api/schedules');
              setSchedules(schedsRes.data);
              Alert.alert('Deleted', 'Schedule has been removed.');
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRunScheduleNow = async (scheduleId) => {
    try {
      await apiClient.post(`/api/schedules/${scheduleId}/run`);
      Alert.alert('Automation Success', 'MQTT trigger message fired successfully!');
    } catch (error) {
      console.error('Failed to manually run schedule:', error);
      Alert.alert('Execution Failed', 'Failed to dispatch immediate schedule command');
    }
  };

  const getDeviceName = (deviceId) => {
    const dev = devices.find(d => d.id === deviceId);
    return dev ? dev.name : 'Unknown Appliance';
  };

  const toggleDaySelection = (dayKey) => {
    if (selectedDays.includes(dayKey)) {
      setSelectedDays(prev => prev.filter(k => k !== dayKey));
    } else {
      setSelectedDays(prev => [...prev, dayKey]);
    }
  };

  const formatDaysLabel = (csvDays) => {
    if (!csvDays) return '';
    const list = csvDays.split(',');
    if (list.length === 7) return 'Daily';
    if (list.length === 5 && !list.includes('sat') && !list.includes('sun')) return 'Weekdays';
    return list.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TOKENS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Automation Schedules</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <MaterialCommunityIcons name="plus" size={20} color={TOKENS.bg} />
          <Text style={styles.addButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clock-outline" size={64} color={TOKENS.textSecondary} />
          <Text style={styles.emptyText}>No schedules configured.</Text>
          <Text style={styles.emptySubtext}>Create automated rules to toggle smart devices at specific times.</Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleInfo}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.deviceName} numberOfLines={1}>{getDeviceName(item.device_id)}</Text>
                  <Text style={styles.actionText}>
                    Action: <Text style={{ color: item.action === 'ON' ? TOKENS.accent : TOKENS.error }}>{item.action}</Text>
                  </Text>
                  <Text style={styles.daysText}>{formatDaysLabel(item.days)}</Text>
                </View>
              </View>
              <View style={styles.cardControls}>
                <Switch
                  value={item.enabled}
                  onValueChange={() => handleToggleEnabled(item.id, item.enabled)}
                  trackColor={{ false: TOKENS.bg, true: 'rgba(34, 197, 94, 0.4)' }}
                  thumbColor={item.enabled ? TOKENS.accent : TOKENS.textSecondary}
                />
                <View style={styles.cardActionButtons}>
                  <TouchableOpacity onPress={() => handleRunScheduleNow(item.id)} style={styles.testBtn}>
                    <MaterialCommunityIcons name="play-circle-outline" size={20} color={TOKENS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSchedule(item.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={TOKENS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Schedule Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Schedule Rule</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={TOKENS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Select Device</Text>
              {devices.length === 0 ? (
                <Text style={styles.warningText}>Please add a device first before configuring scheduling.</Text>
              ) : (
                <View style={styles.devicePickerList}>
                  {devices.map((dev) => {
                    const isSelected = selectedDeviceId === dev.id;
                    return (
                      <TouchableOpacity
                        key={dev.id}
                        style={[
                          styles.deviceOption,
                          isSelected && styles.deviceOptionSelected
                        ]}
                        onPress={() => setSelectedDeviceId(dev.id)}
                      >
                        <Text style={[
                          styles.deviceOptionText,
                          isSelected && styles.deviceOptionTextSelected
                        ]}>
                          {dev.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>Action</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionOption, selectedAction === 'ON' && styles.actionOptionOn]}
                  onPress={() => setSelectedAction('ON')}
                >
                  <Text style={[styles.actionOptionText, selectedAction === 'ON' && styles.actionOptionTextOn]}>TURN ON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionOption, selectedAction === 'OFF' && styles.actionOptionOff]}
                  onPress={() => setSelectedAction('OFF')}
                >
                  <Text style={[styles.actionOptionText, selectedAction === 'OFF' && styles.actionOptionTextOff]}>TURN OFF</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Time (24h format HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={scheduleTime}
                onChangeText={setScheduleTime}
                placeholder="e.g. 08:30, 22:00"
                placeholderTextColor={TOKENS.textSecondary}
                maxLength={5}
              />

              <Text style={styles.label}>Weekly Schedule</Text>
              <View style={styles.weekdaysContainer}>
                {WEEKDAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipSelected
                      ]}
                      onPress={() => toggleDaySelection(day.key)}
                    >
                      <Text style={[
                        styles.dayChipText,
                        isSelected && styles.dayChipTextSelected
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreateSchedule}
                  disabled={isSaving || devices.length === 0}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={TOKENS.bg} />
                  ) : (
                    <Text style={styles.saveButtonText}>Create Rule</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.bg,
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.bg
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: TOKENS.textPrimary
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4
  },
  addButtonText: {
    color: TOKENS.bg,
    fontWeight: '700',
    fontSize: 14
  },
  listContainer: {
    paddingBottom: 20
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  timeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.accent
  },
  textGroup: {
    flex: 1,
    justifyContent: 'center'
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.textPrimary
  },
  actionText: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginTop: 3,
    fontWeight: '600'
  },
  daysText: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginTop: 2
  },
  cardControls: {
    alignItems: 'center',
    gap: 12,
    marginLeft: 8
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyText: {
    fontSize: 16,
    color: TOKENS.textPrimary,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: TOKENS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: TOKENS.border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.textPrimary
  },
  label: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginBottom: 8,
    marginTop: 14,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  devicePickerList: {
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.border,
    maxHeight: 120,
    padding: 6
  },
  deviceOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4
  },
  deviceOptionSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)'
  },
  deviceOptionText: {
    color: TOKENS.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  deviceOptionTextSelected: {
    color: TOKENS.accent
  },
  warningText: {
    color: TOKENS.error,
    fontSize: 12
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  actionOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.border,
    backgroundColor: TOKENS.bg
  },
  actionOptionOn: {
    borderColor: TOKENS.accent,
    backgroundColor: 'rgba(34, 197, 94, 0.15)'
  },
  actionOptionOff: {
    borderColor: TOKENS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  actionOptionText: {
    color: TOKENS.textPrimary,
    fontWeight: '700',
    fontSize: 12
  },
  actionOptionTextOn: {
    color: TOKENS.accent
  },
  actionOptionTextOff: {
    color: TOKENS.error
  },
  input: {
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 8,
    padding: 12,
    color: TOKENS.textPrimary,
    fontSize: 14
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  dayChipSelected: {
    backgroundColor: TOKENS.accent,
    borderColor: TOKENS.accent
  },
  dayChipText: {
    color: TOKENS.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  dayChipTextSelected: {
    color: TOKENS.bg,
    fontWeight: '800'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 10
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  cancelButtonText: {
    color: TOKENS.textPrimary,
    fontWeight: '700'
  },
  saveButton: {
    backgroundColor: TOKENS.accent
  },
  saveButtonText: {
    color: TOKENS.bg,
    fontWeight: '700'
  },
  cardActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  testBtn: {
    padding: 2
  }
});
