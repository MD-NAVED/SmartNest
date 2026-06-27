import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client';
import { Lightbulb, Fan, Power, Radio, Shield, ShieldAlert } from 'lucide-react';

export default function DeviceGrid() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const devicesRef = useRef([]);

  // Fetch devices from backend API
  const fetchDevices = useCallback(async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const response = await apiClient.get('/api/devices');
      const data = response.data;

      // Compare stringified versions of new and old data before updating state
      if (JSON.stringify(devicesRef.current) !== JSON.stringify(data)) {
        devicesRef.current = data;
        setDevices(data);
      }
      setError(false);
    } catch (err) {
      console.error('[DeviceGrid] Error polling devices:', err);
      setError(true);
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  }, []);

  // Set up polling interval (every 10 seconds)
  useEffect(() => {
    fetchDevices(true);

    const interval = setInterval(() => {
      fetchDevices(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Handle toggle status trigger (optimistic state update)
  const handleToggle = async (device) => {
    const isCurrentlyOn = device.current_state?.status === 'ON';
    const targetStatus = isCurrentlyOn ? 'OFF' : 'ON';

    // Optimistically update device state in memory
    const updatedDevices = devices.map((d) => {
      if (d.id === device.id) {
        return {
          ...d,
          current_state: {
            ...d.current_state,
            status: targetStatus,
          },
        };
      }
      return d;
    });
    setDevices(updatedDevices);
    devicesRef.current = updatedDevices;

    try {
      // Send control payload
      await apiClient.post(`/api/devices/${device.id}/control`, {
        state: { status: targetStatus },
      });
      // Silent refresh
      fetchDevices(false);
    } catch (err) {
      console.error('[DeviceGrid] Error toggling status:', err);
      // Revert state if api fails
      fetchDevices(false);
    }
  };

  // Helper to get device icon component
  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'light':
        return Lightbulb;
      case 'fan':
        return Fan;
      case 'ac':
        return Radio;
      default:
        return Power;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Synchronizing Grid...</span>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div style={styles.errorCard}>
        <ShieldAlert size={48} color="#EF4444" />
        <h3 style={styles.errorTitle}>Database Connection Lost</h3>
        <p style={styles.errorDesc}>Could not reach the database. Retrying connection...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div style={styles.emptyCard}>
        <Shield size={48} color="#9CA3AF" />
        <h3 style={styles.emptyTitle}>Grid Offline</h3>
        <p style={styles.emptyDesc}>No hardware nodes are linked to this environment yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.gridContainer}>
      {devices.map((device) => {
        const Icon = getDeviceIcon(device.device_type);
        const isStatusOn = device.current_state?.status === 'ON';
        const isOnline = !!device.is_online;

        return (
          <div key={device.id} style={styles.card}>
            {/* Top section: Icon and Online indicator */}
            <div style={styles.cardHeader}>
              <div style={{
                ...styles.iconWrapper,
                backgroundColor: isStatusOn ? 'rgba(34, 197, 94, 0.1)' : '#0D0D0D',
                borderColor: isStatusOn ? '#22C55E' : '#262626',
              }}>
                <Icon size={24} color={isStatusOn ? '#22C55E' : '#9CA3AF'} />
              </div>
              <div style={styles.onlineBadge}>
                <div style={{
                  ...styles.onlineDot,
                  backgroundColor: isOnline ? '#22C55E' : '#EF4444',
                }} />
                <span style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {/* Bottom section: Info and Toggle */}
            <div style={styles.cardFooter}>
              <div style={styles.infoWrapper}>
                <span style={styles.deviceName}>{device.name}</span>
                <span style={styles.deviceType}>{device.device_type.toUpperCase()}</span>
              </div>

              {/* Sleek Custom Toggle Switch */}
              <div
                onClick={() => handleToggle(device)}
                style={{
                  ...styles.switchTrack,
                  backgroundColor: isStatusOn ? '#22C55E' : '#262626',
                }}
              >
                <div style={{
                  ...styles.switchThumb,
                  left: isStatusOn ? '22px' : '2px',
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    padding: '4px',
    width: '100%',
  },
  card: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '160px',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  iconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: '1.5px solid #262626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  onlineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#0D0D0D',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #262626',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  onlineLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  infoWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '65%',
  },
  deviceName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#FFFFFF',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deviceType: {
    fontSize: '10px',
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  switchTrack: {
    width: '40px',
    height: '20px',
    borderRadius: '10px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    willChange: 'background-color',
  },
  switchThumb: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: '2px',
    transition: 'all 0.2s ease',
    willChange: 'left',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    width: '100%',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #1A1A1A',
    borderTopColor: '#22C55E',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#9CA3AF',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #EF4444',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '16px 0 8px 0',
  },
  errorDesc: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: 0,
  },
  emptyCard: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '16px 0 8px 0',
  },
  emptyDesc: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: 0,
  },
};
