/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sofa, 
  Bed, 
  CookingPot, 
  Wind, 
  LayoutDashboard, 
  Power, 
  Plus, 
  Clock, 
  Cpu, 
  Bluetooth, 
  Activity, 
  Database, 
  Globe, 
  Sliders, 
  Settings, 
  Bell, 
  X, 
  RefreshCw,
  Sparkles,
  Search,
  ArrowRight,
  LogOut
} from 'lucide-react';

import { Device, Room, Node, Schedule, AlertLog } from './types';
import { 
  initialRooms, 
  initialNodes, 
  initialDevices, 
  initialSchedules, 
  initialAlerts 
} from './data';

import DeviceControlCard from './components/DeviceControlCard';
import PowerChart from './components/PowerChart';
import BluetoothScanner from './components/BluetoothScanner';
import ScheduleManager from './components/ScheduleManager';
import NodeMonitor from './components/NodeMonitor';
import Login from './components/Login';
import logoImg from './assets/logo.jpg';

export default function App() {
  // Authentication state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  // Primary State Managers
  const [rooms, setRooms] = useState<Room[]>([]);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Persisted state managers (stored locally in browser since no DB table exists)
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    try {
      const saved = localStorage.getItem('schedules');
      return saved ? JSON.parse(saved) : initialSchedules;
    } catch (e) {
      return initialSchedules;
    }
  });
  const [alerts, setAlerts] = useState<AlertLog[]>(() => {
    try {
      const saved = localStorage.getItem('alerts');
      return saved ? JSON.parse(saved) : initialAlerts;
    } catch (e) {
      return initialAlerts;
    }
  });
  
  // Navigation & Filtering
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-all');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Connection Diagnostics State
  const [backendUrl, setBackendUrl] = useState(() => {
    return window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://smartnest-3jr4.onrender.com';
  });
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'online' | 'offline' | 'sleeping'>('idle');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    'Diagnostics Engine Offline. Click "Test Connection" to sync live APIs.'
  ]);

  // Form states for new appliances
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<'light' | 'fan' | 'ac' | 'plug' | 'tv'>('light');
  const [newDevNode, setNewDevNode] = useState('4L-NODE-001');
  const [newDevRoom, setNewDevRoom] = useState('');

  // Active home & profile references
  const [homeId, setHomeId] = useState<string | null>(null);
  const [username, setUsername] = useState('User');

  // Real-time Clock Uptime
  const [currentTime, setCurrentTime] = useState<string>('');

  // Cache reference for flicker-free check
  const devicesRef = useRef<Device[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save schedules and alerts locally whenever they change
  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Logger helper
  const addAlert = (message: string, type: AlertLog['type'] = 'info', nodeId?: string) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const newAlert: AlertLog = {
      id: `alert-${Date.now()}`,
      timestamp,
      message,
      type,
      nodeId
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // API Call: Fetch User Profile
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const user = await response.json();
        const capitalized = user.username.charAt(0).toUpperCase() + user.username.slice(1);
        setUsername(capitalized);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('[App] Error fetching profile:', err);
    }
  };

  // API Call: Fetch or initialize active Home & Rooms
  const fetchRoomsAndHome = async (authToken: string) => {
    try {
      // 1. Fetch homes
      const homesRes = await fetch(`${backendUrl}/api/homes`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      let activeHomeId = null;

      if (homesRes.ok) {
        const homes = await homesRes.json();
        if (homes.length > 0) {
          activeHomeId = homes[0].id;
        } else {
          // Initialize default home
          const createHomeRes = await fetch(`${backendUrl}/api/homes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: '4Layers SmartNest' })
          });
          if (createHomeRes.ok) {
            const newHome = await createHomeRes.json();
            activeHomeId = newHome.id;
          }
        }
      }
      setHomeId(activeHomeId);
      if (!activeHomeId) return;

      // 2. Fetch rooms
      const roomsRes = await fetch(`${backendUrl}/api/rooms/home/${activeHomeId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (roomsRes.ok) {
        const roomList = await roomsRes.json();
        if (roomList.length > 0) {
          // Format into UI expected format
          const formattedRooms: Room[] = [
            { id: 'room-all', name: 'All Spaces', icon: 'LayoutDashboard' },
            ...roomList.map((r: any) => ({
              id: r.id,
              name: r.name,
              icon: r.room_type === 'living_room' ? 'Sofa' : r.room_type === 'bedroom' ? 'Bed' : r.room_type === 'kitchen' ? 'CookingPot' : 'Wind'
            }))
          ];
          setRooms(formattedRooms);
          setNewDevRoom(roomList[0].id);
        } else {
          // Initialize default rooms
          const defaultRooms = [
            { name: 'Living Room', room_type: 'living_room' },
            { name: 'Master Bedroom', room_type: 'bedroom' },
            { name: 'Kitchen', room_type: 'kitchen' },
            { name: 'Balcony', room_type: 'bathroom' }
          ];
          const createdRooms = [];
          for (const defaultRoom of defaultRooms) {
            const crRes = await fetch(`${backendUrl}/api/rooms`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ...defaultRoom, home_id: activeHomeId })
            });
            if (crRes.ok) {
              const r = await crRes.json();
              createdRooms.push({
                id: r.id,
                name: r.name,
                icon: r.room_type === 'living_room' ? 'Sofa' : r.room_type === 'bedroom' ? 'Bed' : r.room_type === 'kitchen' ? 'CookingPot' : 'Wind'
              });
            }
          }
          const formattedRooms: Room[] = [
            { id: 'room-all', name: 'All Spaces', icon: 'LayoutDashboard' },
            ...createdRooms
          ];
          setRooms(formattedRooms);
          if (createdRooms.length > 0) setNewDevRoom(createdRooms[0].id);
        }
      }
    } catch (err) {
      console.error('[App] Error fetching home/rooms:', err);
    }
  };

  // API Call: Fetch devices list (with Ref string check to prevent flickering)
  const fetchDevices = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/devices`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Format devices to UI properties
        const formattedList: Device[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.device_type,
          status: d.current_state?.status === 'ON',
          nodeId: d.node_id,
          roomId: d.room_id || 'room-all',
          value: d.current_state?.value !== undefined ? d.current_state.value : (d.device_type === 'fan' ? 3 : d.device_type === 'ac' ? 22 : 100),
          mode: d.current_state?.mode || 'cool'
        }));

        // Avoid re-renders/blinking if data payload hasn't changed
        if (JSON.stringify(devicesRef.current) !== JSON.stringify(formattedList)) {
          devicesRef.current = formattedList;
          setDevices(formattedList);
        }

        // Dynamically configure local nodes mapping state
        const uniqueNodes = Array.from(new Set(data.map((d: any) => d.node_id)));
        setNodes(prev => {
          const updatedNodes = uniqueNodes.map(nodeId => {
            const match = prev.find(n => n.id === nodeId);
            const isAnyDeviceOnline = data.some((d: any) => d.node_id === nodeId && d.is_online);
            return {
              id: nodeId as string,
              name: match?.name || `${nodeId.split('-').pop() || nodeId} Node`,
              status: (isAnyDeviceOnline ? 'online' : 'offline') as 'online' | 'offline',
              latency: match?.latency || Math.floor(10 + Math.random() * 20),
              signal: match?.signal || -Math.floor(40 + Math.random() * 30),
              ip: match?.ip || `192.168.1.${Math.floor(100 + Math.random() * 100)}`,
              roomId: match?.roomId || (data.find((d: any) => d.node_id === nodeId)?.room_id || 'room-living')
            };
          });
          return updatedNodes.length > 0 ? updatedNodes : initialNodes;
        });
      }
    } catch (err) {
      console.error('[App] Error fetching devices:', err);
    }
  }, [backendUrl]);

  // Boot up initialization
  useEffect(() => {
    if (!token) return;
    fetchUserProfile(token);
    fetchRoomsAndHome(token).then(() => {
      fetchDevices(token);
    });

    // 10-second polling interval
    const interval = setInterval(() => {
      fetchDevices(token);
    }, 10000);

    return () => clearInterval(interval);
  }, [token, fetchDevices]);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    addAlert('Authenticated successfully: Connected to secure gateway.', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setDevices([]);
    setRooms([]);
    addAlert('Terminated secure session. Logged out.', 'info');
  };

  // Master switch to toggle all devices in the current space (or whole house)
  const handleMasterSwitch = async (targetStatus: boolean) => {
    if (!token) return;
    const targetState = targetStatus ? 'ON' : 'OFF';
    
    // Filter active items in current room context and online nodes
    const itemsToToggle = devices.filter(d => {
      if (selectedRoomId !== 'room-all' && d.roomId !== selectedRoomId) return false;
      const associatedNode = nodes.find(n => n.id === d.nodeId);
      return associatedNode ? associatedNode.status === 'online' : false;
    });

    if (itemsToToggle.length === 0) return;

    // Optimistic UI state update
    const updatedList = devices.map(d => {
      if (itemsToToggle.some(item => item.id === d.id)) {
        return { ...d, status: targetStatus };
      }
      return d;
    });
    setDevices(updatedList);
    devicesRef.current = updatedList;

    try {
      // Loop control triggers
      await Promise.all(itemsToToggle.map(d => {
        const payloadVal = d.type === 'ac' 
          ? { status: targetState, mode: d.mode, value: d.value } 
          : { status: targetState, value: d.value };

        return fetch(`${backendUrl}/api/devices/${d.id}/control`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ state: payloadVal })
        });
      }));

      fetchDevices(token);
      const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'House';
      addAlert(
        `Master Trigger: All appliances in ${roomName} turned ${targetState}.`,
        targetStatus ? 'success' : 'info'
      );
    } catch (err) {
      console.error('[App] Error in master switch control:', err);
      fetchDevices(token);
    }
  };

  // Device CRUD / Value Adjustments
  const handleUpdateDevice = async (updated: Device) => {
    if (!token) return;

    // Optimistically update device locally
    const updatedList = devices.map(d => d.id === updated.id ? updated : d);
    setDevices(updatedList);
    devicesRef.current = updatedList;

    try {
      // Build JSONB state matching schema
      const statePayload: Record<string, any> = {
        status: updated.status ? 'ON' : 'OFF',
        value: updated.value
      };
      if (updated.type === 'ac') {
        statePayload.mode = updated.mode;
      }

      const res = await fetch(`${backendUrl}/api/devices/${updated.id}/control`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: statePayload })
      });

      if (!res.ok) throw new Error('Control failed');

      // Update log
      const prev = devices.find(d => d.id === updated.id);
      if (prev?.status !== updated.status) {
        addAlert(
          `MQTT Command Transmitted: ${updated.name} turned ${updated.status ? 'ON' : 'OFF'}. [Node: ${updated.nodeId}]`,
          'info',
          updated.nodeId
        );
      } else {
        addAlert(
          `MQTT Delta Broadcast: ${updated.name} parameter updated to ${updated.value}.`,
          'success',
          updated.nodeId
        );
      }
    } catch (err) {
      console.error('[App] Device update failed:', err);
      fetchDevices(token);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDevName || !homeId) return;

    try {
      const payload = {
        name: newDevName.trim(),
        device_type: newDevType,
        node_id: newDevNode,
        home_id: homeId,
        room_id: newDevRoom || null
      };

      const response = await fetch(`${backendUrl}/api/devices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Handshake registration failed');
      }

      setShowAddDeviceModal(false);
      setNewDevName('');
      fetchDevices(token);
      addAlert(`Linked Appliance: ${payload.name} added to room successfully.`, 'success');
    } catch (err: any) {
      console.error('[App] Create device error:', err);
      alert(err.message || 'Failed to link hardware device');
    }
  };

  // Node Status Simulation
  const handleToggleNodeStatus = (nodeId: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const nextStatus = node.status === 'online' ? 'offline' : 'online';
        addAlert(
          `Node ${nodeId} physically ${nextStatus === 'online' ? 'reconnected' : 'disconnected'}.`,
          nextStatus === 'online' ? 'success' : 'error',
          nodeId
        );
        return { ...node, status: nextStatus };
      }
      return node;
    }));
  };

  const handleAddCustomNode = (newNode: Node) => {
    setNodes(prev => [...prev, newNode]);
    addAlert(`Registered Unique Node ID ${newNode.id} with secure handshake key.`, 'success', newNode.id);
  };

  // BLE Node Provisioning Integration
  const handleBleNodeAdded = async (newNode: Node, newDevList: Device[]) => {
    if (!token || !homeId) return;
    
    try {
      // Register node's devices to database
      for (const d of newDevList) {
        await fetch(`${backendUrl}/api/devices`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: d.name,
            device_type: d.type,
            node_id: newNode.id,
            home_id: homeId,
            room_id: roomIdToUUID(d.roomId)
          })
        });
      }

      // Add node details locally
      setNodes(prev => [...prev, newNode]);
      fetchDevices(token);
      
      addAlert(`BLE Handshake completed: Provisioned Node ${newNode.id} on network.`, 'success', newNode.id);
      addAlert(`Added ${newDevList.length} appliances automatically mapped to Node ${newNode.id}.`, 'info');
    } catch (err) {
      console.error('[App] BLE Node register failed:', err);
    }
  };

  const roomIdToUUID = (id: string) => {
    if (id.startsWith('room-')) return null;
    return id;
  };

  // Schedule Management
  const handleAddSchedule = (newSched: Schedule) => {
    setSchedules(prev => [...prev, newSched]);
    addAlert(`Cron Timer Rule committed: Trigger ${newSched.deviceName} ${newSched.action.toUpperCase()} at ${newSched.time}.`, 'success');
  };

  const handleDeleteSchedule = (id: string) => {
    const sched = schedules.find(s => s.id === id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (sched) {
      addAlert(`Removed automated schedule rule for ${sched.deviceName}.`, 'info');
    }
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === id) {
        const nextEnabled = !s.enabled;
        addAlert(
          `Timer rule for ${s.deviceName} turned ${nextEnabled ? 'ON' : 'OFF'}.`,
          nextEnabled ? 'success' : 'info'
        );
        return { ...s, enabled: nextEnabled };
      }
      return s;
    }));
  };

  // FastAPI live diagnostic test
  const testBackendConnection = async () => {
    setBackendStatus('checking');
    setDiagnosticLogs(prev => [
      'Triggering live diagnostics trace...',
      `Testing endpoint: ${backendUrl}/docs ...`,
      ...prev
    ]);

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(`${backendUrl}/docs`, { 
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(id);

      setBackendStatus('online');
      setDiagnosticLogs(prev => [
        '✔ Handshake healthy! Live API synced.',
        `Server connected: ${backendUrl}`,
        ...prev
      ]);
      addAlert(`API Connection Diagnostics: 4Layers FastAPI server is ONLINE.`, 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setBackendStatus('sleeping');
        setDiagnosticLogs(prev => [
          '⌛ WARNING: Render instance is currently COLD-STARTING.',
          'Render web services automatically spin down after 15 mins of dormancy.',
          'Please wait up to 45 seconds for Render to wake the Docker container.',
          ...prev
        ]);
        addAlert(`API Connection: Render container cold-starting. Waking container...`, 'warning');
      } else {
        setBackendStatus('offline');
        setDiagnosticLogs(prev => [
          '❌ API unreachable. Gateway returned status: OFFLINE.',
          `Endpoint failed: ${backendUrl}`,
          ...prev
        ]);
        addAlert(`API Connection diagnostics failed. Target unreachable.`, 'error');
      }
    }
  };

  // Unauthenticated screen
  if (!token) {
    return <Login backendUrl={backendUrl} onLoginSuccess={handleLoginSuccess} />;
  }

  // Filtered devices list based on space selection
  const filteredDevices = selectedRoomId === 'room-all' 
    ? devices 
    : devices.filter((device) => device.roomId === selectedRoomId);

  // Helper mapping room icon strings to Lucide components
  const renderRoomIcon = (iconName: string, active: boolean) => {
    const iconClass = `h-4 w-4 ${active ? 'text-brand-green' : 'text-gray-400 group-hover:text-white'}`;
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className={iconClass} />;
      case 'Sofa': return <Sofa className={iconClass} />;
      case 'Bed': return <Bed className={iconClass} />;
      case 'CookingPot': return <CookingPot className={iconClass} />;
      case 'Wind': return <Wind className={iconClass} />;
      default: return <LayoutDashboard className={iconClass} />;
    }
  };

  // Uptime analytics calculations
  const totalWatts = devices
    .filter(d => d.status)
    .reduce((sum, d) => sum + (d.type === 'plug' ? d.value : d.type === 'light' ? Math.round(d.value * 0.15) : d.type === 'fan' ? d.value * 12 : 120), 0);

  const activeNodesCount = nodes.filter(n => n.status === 'online').length;

  return (
    <div id="app-root-workspace" className="min-h-screen bg-brand-dark bg-grid text-gray-100 flex flex-col font-sans selection:bg-brand-green selection:text-brand-dark">
      
      {/* 1. TOP STATUS / HERO METRICS HEADER */}
      <header className="bg-brand-card/90 backdrop-blur-md border-b border-brand-border px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-40">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-dark border border-brand-border flex items-center justify-center shadow-md shadow-brand-green/5 group hover:scale-105 transition-transform overflow-hidden">
            <img src={logoImg} alt="4Layers Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-white text-lg tracking-wider uppercase m-0">
                4Layers
              </h1>
              <span className="text-[9px] bg-brand-green/10 border border-brand-green/30 text-brand-green px-1.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                IoT OS v3.5
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono tracking-tight m-0">
              SMARTNEST INTERACTIVE TELEMETRY STATION
            </p>
          </div>
        </div>

        {/* Global Hub Quick Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">LOAD DRAW</span>
            <span id="load-draw-stats" className="font-bold text-brand-green text-glow flex items-center gap-1 mt-0.5">
              <Activity className="h-3 w-3 animate-pulse" />
              {totalWatts} W
            </span>
          </div>

          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">ACTIVE CLUSTER</span>
            <span id="active-cluster-stats" className="font-bold text-white mt-0.5 block">
              {activeNodesCount} / {nodes.length} Nodes
            </span>
          </div>

          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">ONLINE APPLIANCES</span>
            <span id="online-appliances-stats" className="font-bold text-white mt-0.5 block">
              {devices.filter(d => d.status).length} On Standby
            </span>
          </div>

          {/* Clock */}
          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg hidden sm:block">
            <span className="text-gray-500 text-[9px] block">UTC TIMELINE</span>
            <span className="font-bold text-gray-300 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3 text-brand-green" />
              {currentTime || '03:16 UTC'}
            </span>
          </div>
        </div>

        {/* Header Right Master switches */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            id="global-switch-off-btn"
            onClick={() => handleMasterSwitch(false)}
            className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg border border-brand-border bg-brand-dark text-[11px] font-mono font-bold text-gray-400 hover:text-white hover:border-red-900/60 transition-all uppercase flex items-center justify-center gap-1.5"
          >
            <Power className="h-3 w-3 text-red-500" />
            Kill All
          </button>
          
          <button
            id="global-switch-on-btn"
            onClick={() => handleMasterSwitch(true)}
            className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg bg-brand-green text-brand-dark text-[11px] font-mono font-bold hover:bg-brand-green/90 transition-all uppercase flex items-center justify-center gap-1.5 glow-green"
          >
            <Power className="h-3 w-3" />
            Engage All
          </button>

          {/* Alarm Notifications Toggle */}
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="h-8 w-8 rounded-lg border border-brand-border bg-brand-dark hover:border-brand-green/30 flex items-center justify-center text-gray-400 hover:text-white relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand-green glow-green" />
          </button>
        </div>
      </header>

      {/* 2. CORE WORKSPACE LAYOUT */}
      <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1600px] w-full mx-auto">
        
        {/* SIDE BAR / LEFT NAV (3 Columns) */}
        <section className="lg:col-span-3 space-y-4">
          
          {/* Space filter card */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl">
            <h3 className="font-display font-semibold text-xs uppercase text-gray-400 tracking-wider mb-3">
              Home Areas & Spaces
            </h3>
            
            <nav className="space-y-1.5" id="room-nav-sidebar">
              {rooms.map((room) => {
                const isActive = selectedRoomId === room.id;
                const devInRoom = room.id === 'room-all' ? devices : devices.filter(d => d.roomId === room.id);
                const activeCount = devInRoom.filter(d => d.status).length;
                
                return (
                  <button
                    key={room.id}
                    id={`sidebar-room-btn-${room.id}`}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all group ${
                      isActive 
                        ? 'bg-brand-green text-brand-dark font-bold shadow-sm' 
                        : 'text-gray-400 hover:text-white hover:bg-brand-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {renderRoomIcon(room.icon, isActive)}
                      <span>{room.name}</span>
                    </div>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-brand-dark text-brand-green font-bold' 
                        : 'bg-brand-dark/40 text-gray-500 font-medium'
                    }`}>
                      {activeCount}/{devInRoom.length} Active
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Profile & Logout Section (Integrated) */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-4 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center text-xs font-bold text-brand-green uppercase font-mono">
                {username.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate m-0">{username}</p>
                <p className="text-[9px] text-gray-500 font-medium uppercase m-0">Administrator</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 border border-brand-border text-red-500 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200"
              title="Logout Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Live REST API Diagnostics Control center */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-brand-green" />
                <h3 className="font-display font-semibold text-xs uppercase text-white tracking-wider">
                  REST Diagnostics
                </h3>
              </div>
              <button
                id="ping-api-btn"
                onClick={testBackendConnection}
                disabled={backendStatus === 'checking'}
                className="text-[10px] font-mono text-brand-green flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                Test Sync
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-gray-400 font-mono">
                Instance Host URL:
                <input
                  id="api-host-input"
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded px-2 py-1 mt-1 text-[9px] text-brand-green focus:outline-none focus:border-brand-green/60 font-mono"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono border-t border-brand-border/40 pt-2 mt-2">
                <span className="text-gray-500">Live API Status:</span>
                <span id="api-status-badge" className={`font-bold uppercase ${
                  backendStatus === 'online' ? 'text-brand-green' : 
                  backendStatus === 'sleeping' ? 'text-yellow-500' :
                  backendStatus === 'offline' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {backendStatus}
                </span>
              </div>

              {/* Console log outputs */}
              <div className="bg-brand-dark rounded p-2.5 border border-brand-border/40 font-mono text-[9px] text-gray-500 max-h-28 overflow-y-auto space-y-0.5">
                {diagnosticLogs.map((log, i) => (
                  <div key={i} className={log.startsWith('✔') ? 'text-brand-green' : log.startsWith('❌') ? 'text-red-400' : log.startsWith('⌛') ? 'text-yellow-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HARDWARE OVERVIEW INFO CARD */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl space-y-3 font-mono text-[9px] text-gray-400">
            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest border-b border-brand-border/40 pb-2">Hardware Stack Overview</h4>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-white flex items-center gap-1"><Database className="h-3 w-3 text-brand-green" /> Supabase postgresql pooler</span>
              </div>
              <div className="flex justify-between">
                <span>Broker Protocol:</span>
                <span className="text-white">MQTT v5.1.1 EMQX Client</span>
              </div>
              <div className="flex justify-between">
                <span>Broker Port:</span>
                <span className="text-white">1883 TCP (Local)</span>
              </div>
              <div className="flex justify-between">
                <span>Device Provisioning:</span>
                <span className="text-white">Bluetooth GATT OTA</span>
              </div>
            </div>

            <div className="pt-2 text-center text-gray-600 border-t border-brand-border/40 uppercase tracking-widest text-[8px] font-bold">
              Crafted for 4Layers Integration
            </div>
          </div>

        </section>

        {/* MIDDLE SECTION - REGISTERED DEIVCES (5 Columns) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center bg-brand-card border border-brand-border rounded-3xl px-5 py-4 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-green animate-ping" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                {rooms.find(r => r.id === selectedRoomId)?.name || 'All Spaces'} APPLIANCES
              </h3>
            </div>
            
            <button
              id="register-appliance-btn"
              onClick={() => setShowAddDeviceModal(true)}
              className="px-3 py-1 bg-brand-green/10 hover:bg-brand-green text-brand-green hover:text-brand-dark border border-brand-green/30 hover:border-brand-green rounded-lg text-[10px] font-bold uppercase transition-all duration-200"
            >
              + Register Appliance
            </button>
          </div>

          {/* ADD DEVICE MODAL CARD (Absolute Pop) */}
          {showAddDeviceModal && (
            <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-brand-border/40">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-brand-green" /> Link New Appliance Node
                </h3>
                <button onClick={() => setShowAddDeviceModal(false)} className="text-gray-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDevice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Appliance Name</label>
                    <input 
                      type="text" 
                      value={newDevName}
                      onChange={(e) => setNewDevName(e.target.value)}
                      placeholder="e.g. Living Spotlight"
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Category Type</label>
                    <select 
                      value={newDevType}
                      onChange={(e) => setNewDevType(e.target.value as any)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                    >
                      <option value="light">Lightbulb</option>
                      <option value="fan">Ceiling Fan</option>
                      <option value="ac">Air Conditioner</option>
                      <option value="plug">Power Switch/Plug</option>
                      <option value="tv">Television</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Parent Gateway Node</label>
                    <select 
                      value={newDevNode}
                      onChange={(e) => setNewDevNode(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Target Room Area</label>
                    <select 
                      value={newDevRoom}
                      onChange={(e) => setNewDevRoom(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                    >
                      {rooms.filter(r => r.id !== 'room-all').map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddDeviceModal(false)}
                    className="px-4 py-2 border border-brand-border text-gray-400 font-bold text-xs rounded-lg uppercase hover:bg-brand-card-hover"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-brand-green text-brand-dark font-bold text-xs rounded-lg uppercase hover:bg-brand-green/90"
                  >
                    Deploy Appliance
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SMART DEVICES CARD CONTROLS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200" id="devices-controls-grid">
            {filteredDevices.length === 0 ? (
              <div className="col-span-full bg-brand-card/30 border border-dashed border-brand-border rounded-xl p-8 text-center text-xs text-gray-500 font-mono">
                No active smart appliances registered in this space. Click "Register Appliance" above.
              </div>
            ) : (
              filteredDevices.map((device) => {
                const associatedNode = nodes.find(n => n.id === device.nodeId);
                const nodeStatus = associatedNode ? associatedNode.status : 'offline';

                return (
                  <DeviceControlCard
                    key={device.id}
                    device={device}
                    nodeStatus={nodeStatus}
                    onUpdateDevice={handleUpdateDevice}
                  />
                );
              })
            )}
          </div>

          {/* Quick workspace hints */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl text-[10px] text-gray-500 font-mono flex items-center justify-between gap-2">
            <span>
              💡 Try toggling a Node offline in the <b>MQTT Nodes</b> table on the right. Online states instantly guard device relays!
            </span>
            <ArrowRight className="h-4 w-4 text-brand-green shrink-0" />
          </div>
        </section>

        {/* RIGHT COLUMN - ANALYTICS & SCHEDULERS (4 Columns) */}
        <section className="lg:col-span-4 space-y-4">
          {/* Telemetry Chart Component */}
          <PowerChart />

          {/* BLE Node provisioner scanner */}
          <BluetoothScanner 
            existingRooms={rooms}
            onNodeAdded={handleBleNodeAdded} 
          />

          {/* Automated Cron Scheduler */}
          <ScheduleManager 
            devices={devices}
            schedules={schedules}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onToggleSchedule={handleToggleSchedule}
          />

          {/* MQTT Gateways Monitor */}
          <NodeMonitor 
            nodes={nodes}
            existingRooms={rooms}
            onRebootNode={(id) => addAlert(`Gateway node ${id} triggered remote reboot sequence.`, 'info')}
            onToggleNodeStatus={handleToggleNodeStatus}
            onAddCustomNode={handleAddCustomNode}
          />
        </section>

      </main>

    </div>
  );
}
