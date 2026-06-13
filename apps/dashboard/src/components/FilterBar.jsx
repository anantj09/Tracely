import { useState } from 'react';

const COMPLAINT_TYPES = [
  'All',
  'Cleanliness',
  'Staff Behaviour',
  'Food Quality',
  'Safety',
  'Technical Issue',
  'Catering',
  'AC Failure',
  'Delay'
];

const DATE_RANGES = [
  'Last 7 days',
  'Last 30 days',
  'Last 90 days'
];

export default function FilterBar({ initialType = 'All', initialRange = 'Last 30 days', onApply }) {
  const [type, setType] = useState(initialType);
  const [range, setRange] = useState(initialRange);
  const [hovered, setHovered] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onApply) {
      onApply({ type, range });
    }
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.filterGroup}>
        <label style={styles.label} htmlFor="complaint-type-select">Complaint Type</label>
        <select
          id="complaint-type-select"
          style={styles.select}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {COMPLAINT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label} htmlFor="date-range-select">Date Range</label>
        <select
          id="date-range-select"
          style={styles.select}
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          {DATE_RANGES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        style={{
          ...styles.button,
          backgroundColor: hovered ? '#C9551A' : '#E8621A'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        Apply Filters
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1',
    minWidth: '200px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#555555'
  },
  select: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    background: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
    width: '100%',
    fontFamily: 'inherit'
  },
  button: {
    borderRadius: '8px',
    padding: '11px 24px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    fontFamily: 'inherit',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
