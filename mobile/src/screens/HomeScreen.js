import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, FAB, useTheme, ActivityIndicator, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import DeviceCard from '../components/DeviceCard';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { signOut } = useAuth();
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dialog state for device deletion
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  // Fetch device list from backend
  const fetchDevices = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const response = await apiClient.get('/api/devices');
      setDevices(response.data);
    } catch (error) {
      console.error('[Home] Error fetching devices:', error);
    } finally {
      if (showLoadingIndicator) setLoading(false);
      setRefreshing(false);
    }
  };

  // Setup polling (every 5 seconds) and initial fetch using useFocusEffect
  // This automatically starts polling when the home tab is active and stops it when navigated away.
  useFocusEffect(
    useCallback(() => {
      fetchDevices(devices.length === 0); // show loader only on empty load
      
      const intervalId = setInterval(() => {
        fetchDevices(false); // poll silently in background
      }, 5000);

      return () => {
        clearInterval(intervalId);
      };
    }, [])
  );

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices(false);
  };

  // Toggle device state ON/OFF
  const handleToggleDevice = async (id, currentVal) => {
    const targetState = currentVal ? 'ON' : 'OFF';

    // Optimistic UI update: update local state immediately for snappy response
    setDevices((prevDevices) =>
      prevDevices.map((d) => (d.id === id ? { ...d, status: currentVal } : d))
    );

    try {
      await apiClient.post(`/api/devices/${id}/control`, {
        status: targetState,
      });
      // The background poll will sync confirmed states via MQTT,
      // but let's fetch once quickly to update
      fetchDevices(false);
    } catch (error) {
      console.error('[Home] Error controlling device:', error);
      // Revert state on error
      setDevices((prevDevices) =>
        prevDevices.map((d) => (d.id === id ? { ...d, status: !currentVal } : d))
      );
    }
  };

  // Confirm delete dialog handlers
  const showDeleteDialog = (id) => {
    setDeviceToDelete(id);
    setDeleteDialogVisible(true);
  };

  const hideDeleteDialog = () => {
    setDeviceToDelete(null);
    setDeleteDialogVisible(false);
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      await apiClient.delete(`/api/devices/${deviceToDelete}`);
      // Remove deleted device from local state
      setDevices((prevDevices) => prevDevices.filter((d) => d.id !== deviceToDelete));
      hideDeleteDialog();
    } catch (error) {
      console.error('[Home] Error deleting device:', error);
    }
  };

  // Header options: add logout button
  useEffect(() => {
    navigation.getParent()?.setOptions({
      headerRight: () => (
        <IconButton
          icon="logout"
          iconColor={theme.colors.onSurface}
          size={24}
          onPress={signOut}
        />
      ),
    });
  }, [navigation]);

  if (loading) {
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
          <MaterialCommunityIcons name="home-assistant" size={80} color="#334155" />
          <Text style={styles.emptyTitle}>No Devices Added</Text>
          <Text style={styles.emptySubtitle}>
            Add a device to begin managing your home automation.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('AddDevice')}
            style={styles.addFirstBtn}
            icon="plus"
          >
            Add Device
          </Button>
        </View>
      ) : (
        // Device List
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <DeviceCard
              device={item}
              onToggle={handleToggleDevice}
              onDelete={showDeleteDialog}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <FAB
        icon="plus"
        label="Add Device"
        color="#F8FAFC"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddDevice')}
      />

      {/* Deletion Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={hideDeleteDialog} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Delete Device</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>Are you sure you want to remove this device? This will erase all its configuration and logging history.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDeleteDialog} labelStyle={{ color: '#94A3B8' }}>Cancel</Button>
            <Button onPress={handleDeleteDevice} labelStyle={{ color: theme.colors.error }}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  listContainer: {
    padding: 16,
    paddingBottom: 90, // room for FAB
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 8,
    bottom: 8,
    borderRadius: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  addFirstBtn: {
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  dialog: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dialogTitle: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  dialogBody: {
    color: '#94A3B8',
    lineHeight: 20,
  },
});
