import React from 'react';

const EVENT_COLOURS = {
  SOS: { bg: '#FFEBEE', text: '#CC0000' },
  COMPARTMENT_VIOLATION: { bg: '#FFEBEE', text: '#8B0000' },
  HAZARD_REPORT: { bg: '#FFF3EC', text: '#E8621A' },
  Harassment: { bg: '#FFEBEE', text: '#8B0000' },
  Medical: { bg: '#E3F2FD', text: '#1565C0' },
  Theft: { bg: '#FFF3EC', text: '#E8621A' },
  Overcrowding: { bg: '#F3E5F5', text: '#7B1FA2' },
};

// Friendly display labels for DB event types
const EVENT_LABELS = {
  SOS: 'SOS',
  COMPARTMENT_VIOLATION: 'Compartment',
  HAZARD_REPORT: 'Hazard',
};

const DEFAULT_EVENT_COLOUR = { bg: '#F5F5F5', text: '#555555' };

function timeAgo(isoString) {
  const diff = Math.floor((new Date() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function SafetyTable({ incidents = [], onResolve, resolvingId }) {
  return (
    <div style={styles.tableCard}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>Event Type</th>
            <th style={styles.th}>Train</th>
            <th style={styles.th}>Coach</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((rawInc) => {
            // Normalize safety event properties to match prompt specifications
            const inc = {
              ...rawInc,
              event_type: rawInc.event_type || rawInc.type || 'SOS',
              status: rawInc.status || (rawInc.resolved ? 'RESOLVED' : 'ACTIVE'),
            };

            const isSosActive = inc.event_type === 'SOS' && inc.status === 'ACTIVE';
            const eventColour = EVENT_COLOURS[inc.event_type] || DEFAULT_EVENT_COLOUR;
            const isResolving = resolvingId === inc.id;

            return (
              <tr
                key={inc.id}
                style={{
                  ...styles.row,
                  backgroundColor: isSosActive ? '#FFF5F5' : '#FFFFFF',
                }}
              >
                <td style={styles.td}>{timeAgo(inc.created_at)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, backgroundColor: eventColour.bg, color: eventColour.text }}>
                    {EVENT_LABELS[inc.event_type] || inc.event_type}
                  </span>
                </td>
                <td style={styles.td}><strong>{inc.train_number || '—'}</strong></td>
                <td style={styles.td}>{inc.coach || '—'}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: inc.status === 'ACTIVE' ? '#FFEBEE' : '#E8F5E9',
                    color: inc.status === 'ACTIVE' ? '#CC0000' : '#27AE60',
                  }}>
                    {inc.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {inc.status === 'ACTIVE' ? (
                    <button
                      style={{ ...styles.resolveBtn, opacity: isResolving ? 0.7 : 1 }}
                      disabled={isResolving}
                      onClick={() => onResolve(inc.id)}
                    >
                      {isResolving ? '...' : 'Resolve'}
                    </button>
                  ) : (
                    <span style={styles.resolvedLabel}>✓ Done</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableCard: {
    backgroundColor: 'var(--color-white, #FFFFFF)', borderRadius: 'var(--border-radius-card, 12px)',
    border: '1px solid #F0F0F0', boxShadow: 'var(--shadow-card, 0 2px 12px rgba(0,0,0,0.08))', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  headerRow: { borderBottom: '2px solid var(--color-divider, #E0E0E0)', backgroundColor: '#F9F9F9' },
  th: { padding: '14px 20px', fontWeight: '600', color: 'var(--color-text-secondary, #555555)', textAlign: 'left' },
  row: { borderBottom: '1px solid #F0F0F0', transition: 'background-color 100ms' },
  td: { padding: '12px 20px', verticalAlign: 'middle' },
  badge: { display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px' },
  resolveBtn: {
    backgroundColor: 'var(--color-navy, #1A3557)', color: 'var(--color-white, #FFFFFF)', border: 'none',
    borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  resolvedLabel: { fontSize: '12px', color: 'var(--color-success, #27AE60)', fontWeight: '600' },
};
