import React from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Activity, 
  Settings, 
  LogOut 
} from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function Sidebar({ activeMenu = 'dashboard', onMenuChange, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms', icon: Cpu },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand logo container */}
      <div style={styles.brandContainer}>
        <div style={styles.logoWrapper}>
          <img src={logoImg} alt="4Layers Logo" style={styles.logo} />
        </div>
        <span style={styles.brandName}>4Layers</span>
      </div>

      {/* Navigation menu list */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange && onMenuChange(item.id)}
              style={{
                ...styles.navItem,
                backgroundColor: isActive ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                color: isActive ? '#22C55E' : '#9CA3AF',
                borderColor: isActive ? '#22C55E' : 'transparent',
              }}
            >
              <Icon size={18} style={styles.navIcon} />
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout option at the bottom */}
      {onLogout && (
        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={18} style={styles.logoutIcon} />
          <span>Exit Session</span>
        </button>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: '#1A1A1A',
    borderRight: '1.5px solid #262626',
    padding: '24px 16px',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  brandContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '36px',
    width: '100%',
  },
  logoWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #22C55E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  brandName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.5px',
    textAlign: 'center',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    borderLeft: '3px solid transparent',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  navIcon: {
    flexShrink: 0,
  },
  navLabel: {
    fontFamily: 'inherit',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1.5px solid #262626',
    color: '#EF4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease',
    marginTop: 'auto',
  },
  logoutIcon: {
    flexShrink: 0,
  },
};
