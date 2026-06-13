/**
 * Sidebar.jsx — Tracely Admin Navigation
 *
 * DESIGN NOTE (intentional deviation from original DESIGN.md):
 * The original plan specified a white sidebar (#FFFFFF) with a right border.
 * This implementation uses the brand navy (#1A3557) background instead, which
 * provides stronger visual hierarchy and matches the government dashboard aesthetic.
 * The active link uses an orange (#E8621A) left border and orange text.
 * Do NOT revert to white — this is the approved design.
 */
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, ShieldAlert, TrendingUp,
  Building2, FileEdit, Thermometer, Users, Clock
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',           label: 'Overview',         icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaint Map',    icon: Map },
  { to: '/safety',     label: 'Safety Incidents', icon: ShieldAlert },
  { to: '/demand',     label: 'Demand Forecast',  icon: TrendingUp },
  { to: '/station',    label: 'Station Status',   icon: Building2 },
  { to: '/grievance',  label: 'Grievance Portal', icon: FileEdit },
  { to: '/heatmap',    label: 'Live Heatmap',     icon: Thermometer },
  { to: '/rpf',        label: 'RPF Dashboard',    icon: Users },
  { to: '/tatkal',     label: 'Tatkal Booking',   icon: Clock },
];

export default function Sidebar({ role }) {
  const visibleItems = NAV_ITEMS.filter(({ to }) => {
    if (role === 'admin') return true;
    // User role can only see grievance and heatmap
    return to === '/grievance' || to === '/heatmap';
  });

  return (
    <nav style={styles.sidebar}>
      {/* Native CSS styling for hover and active state support */}
      <style>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          color: rgba(255, 255, 255, 0.65) !important;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 150ms ease, color 150ms ease;
          border-left: 3px solid transparent;
        }
        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #FFFFFF !important;
        }
        .nav-item:hover .nav-icon {
          color: #FFFFFF !important;
        }
        .nav-item.active {
          background-color: rgba(232, 98, 26, 0.15) !important;
          color: var(--color-orange) !important;
          border-left: 3px solid var(--color-orange) !important;
          font-weight: 600;
        }
        .nav-item.active .nav-icon {
          color: var(--color-orange) !important;
        }
        .nav-icon {
          flex-shrink: 0;
          transition: color 150ms ease;
          color: rgba(255, 255, 255, 0.65);
        }
        .nav-label {
          flex: 1;
        }
      `}</style>

      {/* Brand Logo */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🚆</span>
        <span style={styles.brandText}>
          <span style={styles.brandTrace}>Trace</span>
          <span style={styles.brandLy}>ly</span>
        </span>
        <span style={styles.brandSub}>{role === 'admin' ? 'Admin' : 'Passenger'}</span>
      </div>

      {/* Nav Links */}
      <div style={styles.navList}>
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} className="nav-icon" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>Ministry of Railways</span>
        <span style={styles.footerSub}>{role === 'admin' ? 'Admin Panel v1.0' : 'Passenger Portal v1.0'}</span>
      </div>
    </nav>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: 'var(--sidebar-width)',
    backgroundColor: 'var(--color-navy)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflowY: 'auto',
  },
  brand: {
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  brandIcon: { fontSize: '22px' },
  brandText: { fontSize: '18px', fontWeight: '700', lineHeight: 1 },
  brandTrace: { color: '#FFFFFF' },
  brandLy: { color: 'var(--color-orange)' },
  brandSub: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
    width: '100%',
    marginTop: '2px',
  },
  navList: {
    flex: 1,
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  footerText: { fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  footerSub: { fontSize: '10px', color: 'rgba(255,255,255,0.3)' },
};
