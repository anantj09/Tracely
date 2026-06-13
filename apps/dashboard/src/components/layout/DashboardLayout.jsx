import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout({ role, onLogout }) {
  return (
    <div style={styles.container}>
      {/* Fixed Sidebar */}
      <Sidebar role={role} />

      {/* Main Content Area */}
      <div style={styles.mainArea}>
        {/* Top Header Bar */}
        <header style={styles.header}>
          <div style={styles.headerSpacer}></div>
          <div style={styles.adminProfile}>
            <span style={styles.adminLabel}>
              {role === 'admin' ? 'Ministry of Railways (Admin Panel)' : 'Passenger Grievance Portal'}
            </span>
            <button style={styles.logoutBtn} onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* View Content Outlet */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-surface)',
  },
  mainArea: {
    flex: 1,
    marginLeft: 'var(--sidebar-width)', // Prevent fixed sidebar overlay
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    height: '56px',
    backgroundColor: 'var(--color-white)',
    borderBottom: '1px solid var(--color-divider)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  adminProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  adminLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-navy)',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1.5px solid var(--color-orange)',
    borderRadius: '6px',
    padding: '6px 12px',
    color: 'var(--color-orange)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, color 150ms ease',
    outline: 'none',
  },
  content: {
    flex: 1,
    padding: '32px',
  },
};
