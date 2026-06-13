import React from 'react';

/**
 * KPICard — displays a single key performance metric.
 * Props:
 *   title       {string}     Card heading
 *   value       {number}     The metric value
 *   icon        {Component}  Lucide icon component
 *   colour      {string}     CSS colour for icon and value (e.g. var(--color-orange))
 *   description {string}     Small subtext below value
 *   isLoading   {boolean}    Shows skeleton pulse when true
 */
export default function KPICard({ title, value, icon: Icon, colour, description, isLoading }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <div style={{ ...styles.iconWrap, backgroundColor: colour + '18' }}>
          {Icon && <Icon size={20} color={colour} />}
        </div>
      </div>

      {isLoading ? (
        <div style={styles.skeletonValue} />
      ) : (
        <div style={{ ...styles.value, color: colour }}>{value ?? '—'}</div>
      )}

      <p style={styles.description}>{description}</p>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--border-radius-card)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    animation: 'fadeIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    lineHeight: '1.3',
    flex: 1,
    paddingRight: '12px',
  },
  iconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: {
    fontSize: '36px',
    fontWeight: '700',
    lineHeight: '1',
    marginTop: '4px',
  },
  skeletonValue: {
    height: '36px',
    width: '80px',
    backgroundColor: '#EEEEEE',
    borderRadius: '6px',
    animation: 'pulse 1.5s ease infinite',
    marginTop: '4px',
  },
  description: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    margin: 0,
    marginTop: '2px',
  },
};
