import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
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
  error: '#EF4444',
  info: '#3B82F6'
};

export default function AlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts(true);
  }, []);

  // Add focus listener to auto-refresh notifications when users tap the bell badge
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAlerts(false);
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAlerts = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await apiClient.get('/api/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts list:', error);
      Alert.alert('Error', 'Could not retrieve notifications log');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts(false);
  };

  const handleMarkAsRead = async (alertId) => {
    // Optimistic state update
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, is_read: true } : a)
    );

    try {
      await apiClient.patch(`/api/alerts/${alertId}/read`);
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
      // Re-fetch to sync
      fetchAlerts(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (alerts.filter(a => !a.is_read).length === 0) return;

    try {
      setIsLoading(true);
      await apiClient.patch('/api/alerts/read-all');
      await fetchAlerts(false);
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
      Alert.alert('Error', 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (alerts.length === 0) return;

    Alert.alert(
      'Clear Logs',
      'Are you sure you want to permanently delete all notifications history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiClient.delete('/api/alerts');
              setAlerts([]);
              Alert.alert('Cleared', 'Notifications log has been emptied.');
            } catch (error) {
              console.error('Failed to clear alerts:', error);
              Alert.alert('Error', 'Failed to clear log.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getAlertConfig = (type) => {
    switch (type) {
      case 'device_online':
        return { icon: 'check-circle-outline', color: TOKENS.accent };
      case 'device_offline':
        return { icon: 'alert-circle-outline', color: TOKENS.error };
      case 'schedule_run':
        return { icon: 'alarm-check', color: TOKENS.info };
      default:
        return { icon: 'bell-outline', color: TOKENS.textSecondary };
    }
  };

  const formatTimeAgo = (timestampStr) => {
    if (!timestampStr) return '';
    try {
      const date = new Date(timestampStr);
      const seconds = Math.floor((new Date() - date) / 1000);
      
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) return interval + 'y ago';
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) return interval + 'mo ago';
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) return interval + 'd ago';
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) return interval + 'h ago';
      interval = Math.floor(seconds / 60);
      if (interval >= 1) return interval + 'm ago';
      return 'just now';
    } catch (e) {
      return '';
    }
  };

  if (isLoading && alerts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TOKENS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>System Alerts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerBtn, alerts.filter(a => !a.is_read).length === 0 && styles.disabledBtn]} 
            onPress={handleMarkAllRead}
            disabled={alerts.filter(a => !a.is_read).length === 0}
          >
            <MaterialCommunityIcons name="email-open-outline" size={16} color={TOKENS.accent} />
            <Text style={styles.headerBtnText}>Mark Read</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerBtn, alerts.length === 0 && styles.disabledBtn]} 
            onPress={handleClearAll}
            disabled={alerts.length === 0}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={TOKENS.error} />
            <Text style={[styles.headerBtnText, { color: TOKENS.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={64} color={TOKENS.textSecondary} />
          <Text style={styles.emptyText}>All systems secure.</Text>
          <Text style={styles.emptySubtext}>No warning alerts or automation logs reported.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={TOKENS.accent}
              colors={[TOKENS.accent]}
            />
          }
          renderItem={({ item }) => {
            const config = getAlertConfig(item.type);
            const isUnread = !item.is_read;
            return (
              <TouchableOpacity
                activeOpacity={isUnread ? 0.8 : 1}
                style={[
                  styles.alertCard,
                  isUnread && styles.alertCardUnread
                ]}
                onPress={() => isUnread && handleMarkAsRead(item.id)}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.iconTitleRow}>
                    <MaterialCommunityIcons 
                      name={config.icon} 
                      size={20} 
                      color={config.color} 
                    />
                    <Text style={styles.alertTime}>{formatTimeAgo(item.created_at)}</Text>
                  </View>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>
                <Text style={[
                  styles.alertMessage,
                  isUnread && styles.alertMessageUnread
                ]}>
                  {item.message}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    fontSize: 22,
    fontWeight: '800',
    color: TOKENS.textPrimary
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4
  },
  disabledBtn: {
    opacity: 0.4
  },
  headerBtnText: {
    color: TOKENS.accent,
    fontWeight: '700',
    fontSize: 11
  },
  listContainer: {
    paddingBottom: 40
  },
  alertCard: {
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  alertCardUnread: {
    borderColor: TOKENS.accent,
    backgroundColor: 'rgba(34, 197, 94, 0.04)'
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  alertTime: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    fontWeight: '500'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.accent
  },
  alertMessage: {
    fontSize: 13,
    color: TOKENS.textSecondary,
    lineHeight: 18
  },
  alertMessageUnread: {
    color: TOKENS.textPrimary,
    fontWeight: '600'
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
  }
});
