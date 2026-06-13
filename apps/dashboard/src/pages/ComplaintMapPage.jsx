import { useState, useEffect, useCallback, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { X, AlertTriangle } from 'lucide-react';
import supabase from '../services/supabase-client';
import FilterBar from '../components/FilterBar';
import ComplaintMap from '../components/ComplaintMap';

const STATION_MAP = {
  NDLS: { name: 'New Delhi', lat: 28.6415, lng: 77.2193 },
  MMCT: { name: 'Mumbai Central', lat: 18.9696, lng: 72.8193 },
  HWH: { name: 'Howrah', lat: 22.5834, lng: 88.3385 },
  SBC: { name: 'KSR Bengaluru', lat: 12.9784, lng: 77.5694 },
  MAS: { name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  PUNE: { name: 'Pune Jn', lat: 18.5289, lng: 73.8744 },
  AMD: { name: 'Ahmedabad', lat: 23.0276, lng: 72.5996 },
  BPL: { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  LKO: { name: 'Lucknow', lat: 26.8322, lng: 80.9220 },
  JP: { name: 'Jaipur', lat: 26.9196, lng: 75.7878 },
  VSKP: { name: 'Visakhapatnam', lat: 17.7262, lng: 83.2986 },
  BZA: { name: 'Vijayawada', lat: 16.5183, lng: 80.6202 },
  SC: { name: 'Secunderabad', lat: 17.4344, lng: 78.5011 },
  ADI: { name: 'Ahmedabad Jn', lat: 23.0289, lng: 72.6011 },
  GKP: { name: 'Gorakhpur', lat: 26.7606, lng: 83.3731 },
  PNBE: { name: 'Patna Jn', lat: 25.6022, lng: 85.1376 },
  DBRG: { name: 'Dibrugarh', lat: 27.4728, lng: 94.9120 },
  UBL: { name: 'Hubballi', lat: 15.3444, lng: 75.1478 },
  MYS: { name: 'Mysuru', lat: 12.3164, lng: 76.6465 },
  CBE: { name: 'Coimbatore', lat: 11.0003, lng: 76.9672 }
};

// Helper function to resolve/generate train route stations (matches backend)
function getRouteForTrain(trainNumber, stationCoordsMap) {
  const hardcodedRoutes = {
    '12951': ['MMCT', 'ST', 'BRC', 'RTM', 'SWM', 'MTJ', 'NZM', 'NDLS'],
    '12002': ['NDLS', 'MTJ', 'AGC', 'BPL'],
    '12301': ['HWH', 'DHN', 'GAYA', 'ALD', 'CNB', 'NDLS'],
    '12009': ['MMCT', 'ST', 'BRC', 'ADI'],
    '12259': ['HWH', 'DHN', 'GAYA', 'ALD', 'CNB', 'NDLS'],
    '12627': ['SBC', 'UBL', 'PUNE', 'BRC', 'RTM', 'BPL', 'AGC', 'MTJ', 'NDLS'],
    '12618': ['TVC', 'CBE', 'SBC', 'UBL', 'PUNE', 'BPL', 'AGC', 'MTJ', 'NZM'],
    '12649': ['SBC', 'UBL', 'PUNE', 'BRC', 'RTM', 'SWM', 'MTJ', 'NZM'],
    '12721': ['HYB', 'SC', 'BPL', 'AGC', 'MTJ', 'NZM'],
    '22691': ['SBC', 'SC', 'BPL', 'AGC', 'MTJ', 'NDLS']
  };

  let routeCodes = hardcodedRoutes[trainNumber];
  if (!routeCodes) {
    const seed = parseInt(trainNumber) || 12000;
    const allStationCodes = Object.keys(stationCoordsMap);
    if (allStationCodes.length > 0) {
      const routeSize = 3 + (seed % 3);
      routeCodes = [];
      for (let i = 0; i < routeSize; i++) {
        const stationIdx = (seed * (i + 1)) % allStationCodes.length;
        const code = allStationCodes[stationIdx];
        if (!routeCodes.includes(code)) {
          routeCodes.push(code);
        }
      }
      routeCodes.sort((a, b) => {
        const lonA = stationCoordsMap[a]?.lng || 0;
        const lonB = stationCoordsMap[b]?.lng || 0;
        return lonA - lonB;
      });
    } else {
      routeCodes = [];
    }
  }

  return routeCodes
    .map(code => {
      const coords = stationCoordsMap[code];
      return {
        code,
        name: coords?.name || code,
        lat: coords ? Number(coords.lat) : 20.5937,
        lng: coords ? Number(coords.lng) : 78.9629
      };
    })
    .filter(st => st.lat && st.lng);
}

const mapUiFilterToDb = (uiType) => {
  const mapping = {
    'Cleanliness': 'CLEANLINESS',
    'Staff Behaviour': 'STAFF',
    'Food Quality': 'FOOD',
    'Safety': 'SAFETY',
    'Technical Issue': 'AMENITY',
    'Catering': 'FOOD',
    'AC Failure': 'AC_HEATING',
    'Delay': 'OTHER',
  };
  return mapping[uiType] || uiType;
};

const formatCategory = (category) => {
  if (!category) return 'N/A';
  const mapping = {
    'CLEANLINESS': 'Cleanliness',
    'AC_HEATING': 'AC Failure',
    'STAFF': 'Staff Behaviour',
    'FOOD': 'Food Quality',
    'SAFETY': 'Safety',
    'AMENITY': 'Technical Issue',
    'OVERCROWDING': 'Overcrowding',
    'OTHER': 'Other'
  };
  if (mapping[category]) return mapping[category];
  
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function ComplaintMapPage() {
  const [filters, setFilters] = useState({ type: 'All', range: 'Last 30 days' });
  const [mapMode, setMapMode] = useState('station'); // 'station' or 'train'
  const [stations, setStations] = useState([]);
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [hoveredTrain, setHoveredTrain] = useState(null);
  const [error, setError] = useState(false);

  const selectedStationRef = useRef(selectedStation);
  useEffect(() => {
    selectedStationRef.current = selectedStation;
  }, [selectedStation]);

  const selectedTrainRef = useRef(selectedTrain);
  useEffect(() => {
    selectedTrainRef.current = selectedTrain;
  }, [selectedTrain]);

  const isMock = !import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_SUPABASE_URL.includes('mockproject');

  const generateMockComplaints = () => {
    const categories = ['CLEANLINESS', 'STAFF', 'FOOD', 'SAFETY', 'AMENITY', 'FOOD', 'AC_HEATING', 'OTHER'];
    const stationList = ['NDLS', 'MMCT', 'HWH', 'SBC', 'MAS', 'PUNE', 'AMD', 'BPL', 'LKO', 'JP', 'VSKP', 'BZA', 'SC', 'ADI', 'GKP', 'PNBE', 'DBRG', 'UBL', 'MYS', 'CBE'];
    const mockData = [];
    for (let i = 0; i < 300; i++) {
      const station = stationList[i % stationList.length];
      const complaint_type = categories[(i * 3) % categories.length];
      const date = new Date();
      date.setDate(date.getDate() - (i % 90));
      mockData.push({
        id: `mock-complaint-${i}`,
        station,
        complaint_type,
        description: `Mock complaint #${i + 1} regarding ${formatCategory(complaint_type).toLowerCase()} at ${station} station.`,
        created_at: date.toISOString(),
        status: i % 3 === 0 ? 'Resolved' : i % 3 === 1 ? 'In Progress' : 'Pending',
        train_number: i % 2 === 0 ? (12000 + (i % 20)).toString() : null,
      });
    }
    return mockData;
  };

  const generateMockTrainRoutes = () => {
    const mockData = generateMockComplaints();
    const trainMap = {};
    mockData.forEach((c) => {
      const trainNum = c.train_number;
      if (!trainNum) return;
      if (!trainMap[trainNum]) {
        trainMap[trainNum] = {
          train_number: trainNum,
          train_name: `Express Train ${trainNum}`,
          total_complaints: 0,
          breakdown: {},
          coaches: {},
          list: []
        };
      }
      const t = trainMap[trainNum];
      t.total_complaints += 1;
      const cType = c.complaint_type || 'Other';
      t.breakdown[cType] = (t.breakdown[cType] || 0) + 1;
      const coach = `B${1 + (t.total_complaints % 4)}`;
      t.coaches[coach] = (t.coaches[coach] || 0) + 1;
      t.list.push(c);
    });

    const mockStationsMap = {};
    Object.entries(STATION_MAP).forEach(([code, st]) => {
      mockStationsMap[code] = { name: st.name, lat: st.lat, lng: st.lng };
    });

    return Object.values(trainMap).map((t) => {
      t.route = getRouteForTrain(t.train_number, mockStationsMap);
      t.list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      t.sortedBreakdown = Object.entries(t.breakdown).sort((a, b) => b[1] - a[1]).slice(0, 3);
      t.topType = t.sortedBreakdown.length > 0 ? t.sortedBreakdown[0][0] : 'Other';
      return t;
    }).filter(t => t.route && t.route.length > 0);
  };

  const getDateLimit = (range) => {
    const limit = new Date();
    if (range === 'Last 7 days') {
      limit.setDate(limit.getDate() - 7);
    } else if (range === 'Last 90 days') {
      limit.setDate(limit.getDate() - 90);
    } else {
      limit.setDate(limit.getDate() - 30);
    }
    return limit.toISOString();
  };

  const fetchAndProcessComplaints = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const dbType = mapUiFilterToDb(filters.type);
      if (mapMode === 'station') {
        let data;
        if (isMock) {
          const limitDate = new Date(getDateLimit(filters.range));
          data = generateMockComplaints().filter((c) => {
            const matchDate = new Date(c.created_at) >= limitDate;
            const matchType = filters.type === 'All' || c.complaint_type === dbType;
            return matchDate && matchType;
          });
        } else {
          try {
            let query = supabase
              .from('complaints')
              .select('*')
              .gte('created_at', getDateLimit(filters.range));

            if (filters.type !== 'All') {
              query = query.eq('complaint_type', dbType);
            }

            const { data: dbData, error } = await query;
            if (error) throw error;
            data = dbData;
          } catch (dbErr) {
            console.warn('Direct Supabase query failed, falling back to mock complaints:', dbErr.message);
            const limitDate = new Date(getDateLimit(filters.range));
            data = generateMockComplaints().filter((c) => {
              const matchDate = new Date(c.created_at) >= limitDate;
              const matchType = filters.type === 'All' || c.complaint_type === dbType;
              return matchDate && matchType;
            });
          }
        }

        // Group by station in memory
        const grouped = {};
        (data || []).forEach((c) => {
          if (c.train_number && String(c.train_number).trim() !== '') return;
          const stationCode = (c.station || c.station_code || 'UNKNOWN').toUpperCase();
          if (!grouped[stationCode]) {
            const info = STATION_MAP[stationCode] || {
              name: c.station_name || stationCode,
              lat: Number(c.station_lat || c.lat || 20.5937),
              lng: Number(c.station_lng || c.lng || 78.9629)
            };
            grouped[stationCode] = {
              code: stationCode,
              name: info.name,
              lat: info.lat,
              lng: info.lng,
              count: 0,
              breakdown: {},
              list: []
            };
          }

          const st = grouped[stationCode];
          st.count += 1;
          st.breakdown[c.complaint_type] = (st.breakdown[c.complaint_type] || 0) + 1;
          st.list.push(c);
        });

        // Format station stats
        const stationsArray = Object.values(grouped).map((st) => {
          st.list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const sortedBreakdown = Object.entries(st.breakdown).sort((a, b) => b[1] - a[1]);
          st.top3Breakdown = sortedBreakdown.slice(0, 3);
          st.topType = sortedBreakdown.length > 0 ? sortedBreakdown[0][0] : 'Other';
          return st;
        });

        setStations(stationsArray);

        // Keep sidebar updated if a station was previously selected
        const currentSelected = selectedStationRef.current;
        if (currentSelected) {
          const updatedSelected = stationsArray.find((s) => s.code === currentSelected.code);
          setSelectedStation(updatedSelected || null);
        }
      } else {
        // Train Mode Route Aggregation
        let trainList;
        if (isMock) {
          const limitDate = new Date(getDateLimit(filters.range));
          trainList = generateMockTrainRoutes().filter((t) => {
            const hasMatch = t.list.some(c => {
              const matchDate = new Date(c.created_at) >= limitDate;
              const matchType = filters.type === 'All' || c.complaint_type === dbType;
              return matchDate && matchType;
            });
            return hasMatch;
          }).sort((a, b) => b.total_complaints - a.total_complaints);
        } else {
          try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
            const res = await fetch(`${API_BASE_URL}/complaints/public/train-routes?type=${dbType}&range=${filters.range}`);
            if (!res.ok) throw new Error('Failed to fetch train routes');
            const result = await res.json();
            trainList = result.data || [];
          } catch (fetchErr) {
            console.warn('Failed to fetch train routes from API, falling back to mock train routes:', fetchErr.message);
            const limitDate = new Date(getDateLimit(filters.range));
            trainList = generateMockTrainRoutes().filter((t) => {
              const hasMatch = t.list.some(c => {
                const matchDate = new Date(c.created_at) >= limitDate;
                const matchType = filters.type === 'All' || c.complaint_type === dbType;
                return matchDate && matchType;
              });
              return hasMatch;
            }).sort((a, b) => b.total_complaints - a.total_complaints);
          }
        }
        setTrains(trainList);

        // Keep sidebar updated if a train was previously selected
        const currentSelected = selectedTrainRef.current;
        if (currentSelected) {
          const updatedSelected = trainList.find((t) => t.train_number === currentSelected.train_number);
          setSelectedTrain(updatedSelected || null);
        }
      }
    } catch (err) {
      console.error('Error fetching complaints map data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, isMock, mapMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAndProcessComplaints();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAndProcessComplaints]);

  const handleSelectStation = (station) => {
    setSelectedStation(station);
  };

  const handleSelectTrain = (train) => {
    setSelectedTrain(train);
  };

  const getChartData = (breakdown) => {
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Helper for Polyline color coding (matches map colors)
  const getPolylineColor = (count) => {
    if (count <= 3) return '#27AE60'; // Green
    if (count <= 9) return '#F5A623'; // Amber
    return '#CC0000'; // Red
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.heading}>Complaint Map</h1>
          <p style={styles.subheading}>
            {mapMode === 'station' ? 'Complaint density by station' : 'Complaint density by train route'} — {filters.range.toLowerCase()}
          </p>
        </div>

        {/* Tabbed Toggle Selector */}
        <div style={styles.toggleContainer}>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(mapMode === 'station' ? styles.activeToggleBtn : {})
            }}
            onClick={() => {
              setMapMode('station');
              setSelectedStation(null);
              setSelectedTrain(null);
            }}
          >
            🏢 Station Mode
          </button>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(mapMode === 'train' ? styles.activeToggleBtn : {})
            }}
            onClick={() => {
              setMapMode('train');
              setSelectedStation(null);
              setSelectedTrain(null);
            }}
          >
            🚆 Train Mode
          </button>
        </div>
      </div>

      <FilterBar
        initialType={filters.type}
        initialRange={filters.range}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setSelectedStation(null);
          setSelectedTrain(null);
        }}
      />

      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Something went wrong. Please refresh the page.</span>
          <button style={styles.retryBtn} onClick={fetchAndProcessComplaints}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner}></div>
          <span style={styles.loadingText}>Fetching database records...</span>
        </div>
      ) : (mapMode === 'station' && stations.length === 0) || (mapMode === 'train' && trains.length === 0) ? (
        <div style={styles.emptyWrapper}>
          <AlertTriangle size={48} color="#CCCCCC" style={{ marginBottom: '12px' }} />
          <p style={styles.emptyText}>No complaints found for the selected filters.</p>
        </div>
      ) : (
        <div style={styles.contentGrid}>
          <ComplaintMap
            stations={stations}
            trains={trains}
            mapMode={mapMode}
            onSelectStation={handleSelectStation}
            onSelectTrain={handleSelectTrain}
            selectedTrain={selectedTrain}
          />

          {(selectedStation || mapMode === 'train') && (
            <div style={styles.sidebar}>
              {mapMode === 'station' ? (
                // Selected Station Sidebar details
                <>
                  <div style={styles.sidebarHeader}>
                    <h2 style={styles.sidebarTitle}>{selectedStation.name}</h2>
                    <button
                      type="button"
                      style={styles.closeBtn}
                      onClick={() => setSelectedStation(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Total Complaints</span>
                    <span style={styles.statVal}>{selectedStation.count}</span>
                  </div>

                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Breakdown by Type</h3>
                    <div style={{ height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getChartData(selectedStation.breakdown)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: -5, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            axisLine={false}
                            tickLine={false}
                            style={{ fontSize: '11px', fill: '#555555', fontWeight: '500' }}
                          />
                          <Bar dataKey="value" fill="#E8621A" radius={[0, 4, 4, 0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Recent Complaints</h3>
                    <div style={styles.recentList}>
                      {selectedStation.list.map((comp) => (
                        <div key={comp.id} style={styles.recentItem}>
                          <div style={styles.recentMeta}>
                            <span style={styles.typeBadge}>{formatCategory(comp.complaint_type)}</span>
                            <span style={styles.timeLabel}>
                              {new Date(comp.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={styles.recentDesc}>
                            {comp.description.length > 70
                              ? `${comp.description.slice(0, 70)}...`
                              : comp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : selectedTrain ? (
                // Selected Train Sidebar details
                <>
                  <div style={styles.sidebarHeader}>
                    <div>
                      <h2 style={styles.sidebarTitle}>Train {selectedTrain.train_number}</h2>
                      <span style={{ fontSize: '12px', color: '#555555' }}>{selectedTrain.train_name}</span>
                    </div>
                    <button
                      type="button"
                      style={styles.closeBtn}
                      onClick={() => setSelectedTrain(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Total Complaints</span>
                    <span style={styles.statVal}>{selectedTrain.total_complaints}</span>
                  </div>

                  {/* Types breakdown chart */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Breakdown by Type</h3>
                    <div style={{ height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getChartData(selectedTrain.breakdown)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: -5, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            axisLine={false}
                            tickLine={false}
                            style={{ fontSize: '11px', fill: '#555555', fontWeight: '500' }}
                          />
                          <Bar dataKey="value" fill="#E8621A" radius={[0, 4, 4, 0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Coaches List */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Affected Coaches</h3>
                    <div style={styles.coachGrid}>
                      {Object.entries(selectedTrain.coaches)
                        .sort((a, b) => b[1] - a[1])
                        .map(([coach, count]) => (
                          <div key={coach} style={styles.coachCard}>
                            <span style={styles.coachName}>{coach}</span>
                            <span style={styles.coachCount}>{count} {count === 1 ? 'complaint' : 'complaints'}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recent List */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Recent Complaints</h3>
                    <div style={styles.recentList}>
                      {selectedTrain.list.map((comp) => (
                        <div key={comp.id} style={styles.recentItem}>
                          <div style={styles.recentMeta}>
                            <span style={styles.typeBadge}>{formatCategory(comp.complaint_type)}</span>
                            <span style={styles.timeLabel}>
                              {new Date(comp.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={styles.recentDesc}>
                            {comp.description.length > 70
                              ? `${comp.description.slice(0, 70)}...`
                              : comp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                // Train Leaderboard Sidebar details
                <>
                  <div style={styles.sidebarHeader}>
                    <div>
                      <h2 style={styles.sidebarTitle}>Route Leaderboard</h2>
                      <span style={{ fontSize: '11px', color: '#888888', display: 'block', marginTop: '2px' }}>
                        Trains ranked by active complaint volume
                      </span>
                    </div>
                  </div>

                  <div style={styles.leaderboardList}>
                    {trains.map((t, idx) => {
                      const color = getPolylineColor(t.total_complaints);
                      const isHovered = hoveredTrain === t.train_number;
                      return (
                        <div
                          key={t.train_number}
                          style={{
                            ...styles.leaderboardItem,
                            ...(isHovered ? styles.leaderboardItemHover : {})
                          }}
                          onMouseEnter={() => setHoveredTrain(t.train_number)}
                          onMouseLeave={() => setHoveredTrain(null)}
                          onClick={() => handleSelectTrain(t)}
                        >
                          <div style={styles.leaderboardRank}>#{idx + 1}</div>
                          <div style={styles.leaderboardInfo}>
                            <span style={styles.leaderboardTrainNum}>Train {t.train_number}</span>
                            <span style={styles.leaderboardTrainName}>{t.train_name}</span>
                          </div>
                          <div
                            style={{
                              ...styles.leaderboardBadge,
                              backgroundColor: `${color}1A`,
                              color: color,
                              border: `1px solid ${color}`
                            }}
                          >
                            {t.total_complaints}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    marginBottom: '4px'
  },
  subheading: {
    fontSize: '14px',
    color: '#555555'
  },
  toggleContainer: {
    display: 'flex',
    backgroundColor: '#EAEAEA',
    padding: '4px',
    borderRadius: '8px',
    width: 'fit-content',
    gap: '4px',
    border: '1px solid #DDDDDD'
  },
  toggleBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    color: '#555555',
    transition: 'all 0.15s ease',
  },
  activeToggleBtn: {
    backgroundColor: '#FFFFFF',
    color: '#1A3557',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #F3F3F3',
    borderTop: '4px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#555555',
    fontSize: '14px'
  },
  emptyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  emptyText: {
    color: '#555555',
    fontSize: '15px',
    fontWeight: '500'
  },
  contentGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap'
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '500px',
    overflowY: 'auto'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1A3557',
    margin: 0,
    lineHeight: '1.2'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#AAAAAA',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#555555'
  },
  statVal: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#E8621A'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111111',
    margin: 0,
    borderBottom: '1px solid #E0E0E0',
    paddingBottom: '6px'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '340px',
    overflowY: 'auto',
    paddingRight: '6px'
  },
  recentItem: {
    borderBottom: '1px solid #F5F5F5',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  recentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  typeBadge: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#FFF3EC',
    color: '#E8621A',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  timeLabel: {
    fontSize: '10px',
    color: '#AAAAAA'
  },
  recentDesc: {
    fontSize: '12px',
    color: '#555555',
    margin: 0,
    lineHeight: '1.4'
  },
  errorCard: {
    border: '1px solid var(--color-orange)',
    backgroundColor: '#FFF5F0',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
  },
  errorText: {
    color: 'var(--color-orange)',
    fontWeight: '600',
    fontSize: '15px',
  },
  retryBtn: {
    backgroundColor: 'var(--color-orange)',
    color: 'var(--color-white)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
  coachGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  coachCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #EEEEEE'
  },
  coachName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1A3557'
  },
  coachCount: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#E8621A',
    backgroundColor: '#FFF3EC',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  leaderboardItemHover: {
    borderColor: '#1A3557',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    backgroundColor: '#F8FAFC'
  },
  leaderboardRank: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#888888',
    width: '28px',
    flexShrink: 0
  },
  leaderboardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0
  },
  leaderboardTrainNum: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1A3557'
  },
  leaderboardTrainName: {
    fontSize: '11px',
    color: '#555555',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  leaderboardBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '6px',
    textAlign: 'center',
    minWidth: '32px'
  }
};
