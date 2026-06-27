import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, SegmentedButtons, Snackbar, useTheme, ActivityIndicator } from 'react-native-paper';
import apiClient from '../api/client';

export default function AddDeviceScreen({ navigation }) {
  const theme = useTheme();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('light');
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);

  // Relational variables
  const [homeId, setHomeId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  
  // Alert Snackbar states
  const [errorMsg, setErrorMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Initialize Home & Room references from backend on mount
  useEffect(() => {
    const initializeRelationalData = async () => {
      try {
        setSetupLoading(true);
        // 1. Fetch homes
        let activeHomeId = null;
        const homesRes = await apiClient.get('/api/homes');
        if (homesRes.data && homesRes.data.length > 0) {
          activeHomeId = homesRes.data[0].id;
        } else {
          // Create default home
          const createHomeRes = await apiClient.post('/api/homes', { name: '4Layers SmartNest' });
          activeHomeId = createHomeRes.data.id;
        }
        setHomeId(activeHomeId);

        // 2. Fetch rooms for the active home
        let activeRoomId = null;
        const roomsRes = await apiClient.get(`/api/rooms/home/${activeHomeId}`);
        if (roomsRes.data && roomsRes.data.length > 0) {
          activeRoomId = roomsRes.data[0].id;
        } else {
          // Create default room (Living Room)
          const createRoomRes = await apiClient.post('/api/rooms', {
            name: 'Living Room',
            room_type: 'living_room',
            home_id: activeHomeId
          });
          activeRoomId = createRoomRes.data.id;
        }
        setRoomId(activeRoomId);

        // Generate a random Node ID by default to simplify setup
        const randId = `4L-NODE-${Math.floor(100 + Math.random() * 900)}`;
        setNodeId(randId);
      } catch (error) {
        console.error('[AddDevice] Init error:', error);
        setErrorMsg('Failed to sync homes/rooms metadata. Please try again.');
        setShowSnackbar(true);
      } finally {
        setSetupLoading(false);
      }
    };

    initializeRelationalData();
  }, []);

  const handleAddDevice = async () => {
    if (!name.trim()) {
      setErrorMsg('Please assign a node identity name.');
      setShowSnackbar(true);
      return;
    }

    if (!nodeId.trim()) {
      setErrorMsg('Please assign a physical Node ID.');
      setShowSnackbar(true);
      return;
    }

    if (!homeId) {
      setErrorMsg('No active home found. Please refresh.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        device_type: type.toLowerCase(),
        node_id: nodeId.trim(),
        home_id: homeId,
        room_id: roomId
      };

      await apiClient.post('/api/devices', payload);
      
      // Navigate back to the home screen
      navigation.goBack();
    } catch (error) {
      console.error('[AddDevice] Link error:', error);
      const detail = error.response?.data?.detail || 'Handshake failed. Check server status.';
      setErrorMsg(detail);
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  if (setupLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Syncing IoT Metadata...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Node Name Identity</Text>
          <TextInput
            label="e.g. Corridor Light, Bed AC"
            value={name}
            onChangeText={setName}
            mode="outlined"
            maxLength={50}
            textColor="#FFFFFF"
            activeOutlineColor="#22C55E"
            outlineColor="#262626"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Physical Node ID (ESP32 Chip ID)</Text>
          <TextInput
            label="e.g. 4L-NODE-001"
            value={nodeId}
            onChangeText={setNodeId}
            mode="outlined"
            maxLength={30}
            textColor="#FFFFFF"
            activeOutlineColor="#22C55E"
            outlineColor="#262626"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Node Category</Text>
          <SegmentedButtons
            value={type || 'light'}
            onValueChange={(val) => setType(val || 'light')}
            theme={{
              colors: {
                secondaryContainer: '#22C55E', // active background
                onSecondaryContainer: '#000000', // active text
              }
            }}
            buttons={[
              {
                value: 'light',
                label: 'Light',
                icon: 'lightbulb-outline',
                labelStyle: styles.segmentLabel,
              },
              {
                value: 'fan',
                label: 'Fan',
                icon: 'fan',
                labelStyle: styles.segmentLabel,
              },
              {
                value: 'ac',
                label: 'AC',
                icon: 'air-conditioner',
                labelStyle: styles.segmentLabel,
              },
            ]}
            style={styles.segmentedButtons}
          />

          {/* Clean Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddDevice}
            disabled={loading}
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
          >
            <Text style={styles.btnText}>Initialize Link</Text>
          </TouchableOpacity>

          {/* Abort button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Abort Link</Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
          style={{ backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#EF4444' }}
          action={{
            label: 'OK',
            textColor: '#FCA5A5',
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: '#FCA5A5', fontWeight: 'bold' }}>{errorMsg}</Text>
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#262626',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0D0D0D',
    marginBottom: 8,
    fontSize: 14,
  },
  segmentedButtons: {
    marginVertical: 12,
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  btnText: {
    color: '#0D0D0D',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#262626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
});
