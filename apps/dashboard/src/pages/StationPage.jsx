import { useState, useMemo } from 'react';
import { Search, ShieldAlert, CheckCircle, Info } from 'lucide-react';

const STATIONS = [
  'NDLS', 'MMCT', 'HWH', 'SBC', 'MAS', 'PUNE', 'AMD', 'BPL', 'LKO', 'JP',
  'VSKP', 'BZA', 'SC', 'ADI', 'GKP', 'PNBE', 'DBRG', 'UBL', 'MYS', 'CBE'
];

const AMENITY_TYPES = ['Water', 'Toilets', 'Wi-Fi', 'Platform LED', 'Waiting Hall', 'Parking'];
const STATUSES = ['Working', 'Broken', 'Under Maintenance'];
const REPORTERS = ['Station Master', 'Zone Inspector', 'Passenger Feedback', 'Maintenance Crew'];

// Generate 60 static mock rows (3 amenities per station across 20 stations)
const MOCK_DATA = (() => {
  const list = [];
  let id = 1;
  STATIONS.forEach((station, sIdx) => {
    for (let i = 0; i < 3; i++) {
      const typeIdx = (sIdx * 3 + i) % AMENITY_TYPES.length;
      const type = AMENITY_TYPES[typeIdx];

      // Distribute statuses: mostly Working, some Broken / Under Maintenance
      let status = 'Working';
      const rand = (sIdx * 3 + i) % 8;
      if (rand === 1 || rand === 5) {
        status = 'Broken';
      } else if (rand === 3) {
        status = 'Under Maintenance';
      }

      // Date range in last 5 days
      const date = new Date();
      date.setDate(date.getDate() - ((sIdx * 3 + i) % 5));
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const reporter = REPORTERS[(sIdx * 3 + i) % REPORTERS.length];

      list.push({
        id: id++,
        station,
        type,
        status,
        lastReported: dateStr,
        reportedBy: reporter
      });
    }
  });
  return list;
})();

const STATUS_WEIGHTS = {
  'Broken': 0,
  'Under Maintenance': 1,
  'Working': 2
};

export default function StationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState('status'); // Defaults to sorting by status
  const [sortDirection, setSortDirection] = useState('asc'); // Defaults to broken first (weight 0)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Process filters and sorting
  const filteredAmenities = useMemo(() => {
    let result = [...MOCK_DATA];

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.station.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Sort: default status ascending (broken = 0 first)
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'status') {
        aVal = STATUS_WEIGHTS[a.status];
        bVal = STATUS_WEIGHTS[b.status];
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, statusFilter, sortField, sortDirection]);

  // Compute stats chips based on current filtered list
  const stats = useMemo(() => {
    const counts = { Working: 0, Broken: 0, 'Under Maintenance': 0 };
    filteredAmenities.forEach((item) => {
      if (counts[item.status] !== undefined) {
        counts[item.status] += 1;
      }
    });
    return counts;
  }, [filteredAmenities]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={styles.container}>
      <div>
        <h1 style={styles.heading}>Station Amenities Status</h1>
      </div>

      {/* Stats Chips */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statChip, borderLeft: '4px solid #27AE60' }}>
          <CheckCircle size={16} color="#27AE60" />
          <span style={styles.statLabel}>Working</span>
          <span style={{ ...styles.statVal, color: '#27AE60' }}>{stats.Working}</span>
        </div>
        <div style={{ ...styles.statChip, borderLeft: '4px solid #CC0000' }}>
          <ShieldAlert size={16} color="#CC0000" />
          <span style={styles.statLabel}>Broken</span>
          <span style={{ ...styles.statVal, color: '#CC0000' }}>{stats.Broken}</span>
        </div>
        <div style={{ ...styles.statChip, borderLeft: '4px solid #F5A623' }}>
          <Info size={16} color="#F5A623" />
          <span style={styles.statLabel}>Maintenance</span>
          <span style={{ ...styles.statVal, color: '#F5A623' }}>{stats['Under Maintenance']}</span>
        </div>
      </div>

      {/* Toolbar Search & Filter */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by station name or amenity type..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={styles.filterGroup}>
          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Amenity Report Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th} onClick={() => handleSort('station')}>
                Station {renderSortIndicator('station')}
              </th>
              <th style={styles.th} onClick={() => handleSort('type')}>
                Amenity Type {renderSortIndicator('type')}
              </th>
              <th style={styles.th} onClick={() => handleSort('status')}>
                Status {renderSortIndicator('status')}
              </th>
              <th style={styles.th}>Last Reported</th>
              <th style={styles.th}>Reported By</th>
            </tr>
          </thead>
          <tbody>
            {filteredAmenities.length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.emptyTd}>
                  No amenities found matching the filters.
                </td>
              </tr>
            ) : (
              filteredAmenities.map((item) => {
                const isBroken = item.status === 'Broken';
                const rowStyle = {
                  ...styles.row,
                  backgroundColor: isBroken ? '#FFF5F5' : '#FFFFFF'
                };

                return (
                  <tr key={item.id} style={rowStyle}>
                    <td style={styles.td}><strong>{item.station}</strong></td>
                    <td style={styles.td}>{item.type}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(item.status === 'Working'
                            ? styles.badgeWorking
                            : item.status === 'Broken'
                            ? styles.badgeBroken
                            : styles.badgeMaintenance)
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={styles.td}>{item.lastReported}</td>
                    <td style={styles.td}>{item.reportedBy}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    margin: 0
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  statChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '12px 18px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1',
    minWidth: '160px'
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#555555'
  },
  statVal: {
    marginLeft: 'auto',
    fontSize: '18px',
    fontWeight: '700'
  },
  toolbar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchBox: {
    position: 'relative',
    flex: '1',
    minWidth: '280px'
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '13px',
    color: '#AAAAAA'
  },
  searchInput: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px 10px 38px',
    fontSize: '14px',
    color: '#111111',
    background: '#FFFFFF',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'border-color 150ms ease',
    ':focus': {
      borderColor: '#E8621A'
    }
  },
  filterGroup: {
    width: '180px'
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
    width: '100%',
    fontFamily: 'inherit'
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
    color: '#111111'
  },
  headerRow: {
    borderBottom: '2px solid #E0E0E0',
    backgroundColor: '#F9F9F9'
  },
  th: {
    padding: '16px 20px',
    fontWeight: '600',
    color: '#555555',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 150ms ease'
  },
  row: {
    borderBottom: '1px solid #F0F0F0',
    transition: 'background-color 100ms ease'
  },
  td: {
    padding: '14px 20px',
    verticalAlign: 'middle'
  },
  emptyTd: {
    padding: '30px',
    textAlign: 'center',
    color: '#777777',
    fontSize: '14px'
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    textAlign: 'center'
  },
  badgeWorking: {
    backgroundColor: '#E8F5E9',
    color: '#27AE60'
  },
  badgeBroken: {
    backgroundColor: '#FFEBEE',
    color: '#CC0000'
  },
  badgeMaintenance: {
    backgroundColor: '#FFF8E1',
    color: '#F5A623'
  }
};
