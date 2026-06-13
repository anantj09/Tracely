import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite missing Leaflet icons issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

const getMarkerColor = (type) => {
  if (!type) return '#E8621A';
  const normType = type.toUpperCase().replace(/_/g, ' ');
  if (normType.includes('CLEANLINESS')) return '#F5A623'; // Amber
  if (normType.includes('SAFETY')) return '#CC0000'; // Red
  if (normType.includes('STAFF')) return '#1A3557'; // Navy
  return '#E8621A'; // Orange
};

const getPolylineColor = (count) => {
  if (count <= 3) return '#27AE60'; // Green
  if (count <= 9) return '#F5A623'; // Amber
  return '#CC0000'; // Red
};

// Generate smooth curved coordinates between station nodes using quadratic Bezier curves
// This restricts the path to stay within a tight 2.5% offset from the direct line,
// preventing overshoot loops into the ocean.
function getSmoothPath(stations, segments = 10) {
  if (stations.length < 2) return stations.map(s => [Number(s.lat), Number(s.lng)]);
  
  const path = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const p1 = stations[i];
    const p2 = stations[i + 1];
    
    const lat1 = Number(p1.lat);
    const lng1 = Number(p1.lng);
    const lat2 = Number(p2.lat);
    const lng2 = Number(p2.lng);
    
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;
    
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    
    let controlLat = midLat;
    let controlLng = midLng;
    
    if (dist > 0.1) {
      const offsetFactor = 0.025; // Tight 2.5% curve bend to avoid ocean overshoots
      const nx = -dLng / dist;
      const ny = dLat / dist;
      const offset = dist * offsetFactor;
      
      // Alternate curve direction to create an organic winding shape
      const sign = (i % 2 === 0) ? 1 : -1;
      
      controlLat = midLat + ny * offset * sign;
      controlLng = midLng + nx * offset * sign;
    }
    
    const startStep = (i === 0) ? 0 : 1;
    for (let step = startStep; step <= segments; step++) {
      const t = step / segments;
      const mt = 1 - t;
      const lat = mt * mt * lat1 + 2 * mt * t * controlLat + t * t * lat2;
      const lng = mt * mt * lng1 + 2 * mt * t * controlLng + t * t * lng2;
      path.push([lat, lng]);
    }
  }
  return path;
}


export default function ComplaintMap({
  stations = [],
  trains = [],
  mapMode = 'station',
  onSelectStation,
  onSelectTrain,
  selectedTrain = null
}) {
  const center = [20.5937, 78.9629]; // India centroid
  const zoom = 5;

  return (
    <div style={styles.mapWrapper}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={styles.mapContainer}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapMode === 'station' ? (
          stations.map((st) => {
            const markerColor = getMarkerColor(st.topType);
            return (
              <CircleMarker
                key={st.code}
                center={[st.lat, st.lng]}
                radius={Math.min(5 + st.count * 0.5, 30)}
                pathOptions={{
                  color: markerColor,
                  fillColor: markerColor,
                  fillOpacity: 0.7,
                  weight: 1.5
                }}
                eventHandlers={{
                  click: () => onSelectStation(st)
                }}
              >
                <Popup>
                  <div style={styles.popup}>
                    <h3 style={styles.popupTitle}>{st.name} ({st.code})</h3>
                    <p style={styles.popupSubtitle}>
                      <strong>{st.count}</strong> complaints this period
                    </p>
                    <hr style={styles.divider} />
                    <div style={styles.breakdownHeader}>Top Complaint Types:</div>
                    <ul style={styles.breakdownList}>
                      {st.top3Breakdown.map(([type, count]) => (
                        <li key={type} style={styles.breakdownItem}>
                          <span>{formatCategory(type)}</span>
                          <span style={styles.breakdownCount}>{count}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      style={styles.popupBtn}
                      onClick={() => onSelectStation(st)}
                    >
                      View complaints
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        ) : (
          <>
            {trains.map((t) => {
              const isSelected = selectedTrain?.train_number === t.train_number;
              const pathColor = getPolylineColor(t.total_complaints);
              return (
                <Polyline
                  key={t.train_number}
                  positions={getSmoothPath(t.route)}
                  pathOptions={{
                    color: pathColor,
                    weight: selectedTrain ? (isSelected ? 7 : 1) : 2,
                    opacity: selectedTrain ? (isSelected ? 1.0 : 0.03) : 0.5
                  }}
                  eventHandlers={{
                    click: () => onSelectTrain(t)
                  }}
                >
                  <Popup>
                    <div style={styles.popup}>
                      <h3 style={styles.popupTitle}>Train {t.train_number}</h3>
                      <h4 style={{ fontSize: '12px', color: '#555555', margin: '0 0 6px 0' }}>{t.train_name}</h4>
                      <p style={styles.popupSubtitle}>
                        <strong>{t.total_complaints}</strong> complaints registered
                      </p>
                      <hr style={styles.divider} />
                      <div style={styles.breakdownHeader}>Top Categories:</div>
                      <ul style={styles.breakdownList}>
                        {t.sortedBreakdown.map(([type, count]) => (
                          <li key={type} style={styles.breakdownItem}>
                            <span>{formatCategory(type)}</span>
                            <span style={styles.breakdownCount}>{count}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        style={styles.popupBtn}
                        onClick={() => onSelectTrain(t)}
                      >
                        Select train route
                      </button>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Render intermediate stations along the selected train route */}
            {selectedTrain && selectedTrain.route && (
              selectedTrain.route.map((st) => (
                <CircleMarker
                  key={`route-st-${st.code}`}
                  center={[st.lat, st.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#1A3557',
                    fillColor: '#FFFFFF',
                    fillOpacity: 1.0,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={styles.popup}>
                      <h3 style={{ ...styles.popupTitle, fontSize: '13px' }}>{st.name} ({st.code})</h3>
                      <p style={{ fontSize: '11px', color: '#555555', margin: 0 }}>Station along Route of Train {selectedTrain.train_number}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}

const styles = {
  mapWrapper: {
    flex: '1',
    height: '500px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    zIndex: 1
  },
  popup: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#111111',
    padding: '4px',
    minWidth: '180px'
  },
  popupTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    color: '#1A3557'
  },
  popupSubtitle: {
    fontSize: '12px',
    margin: '0 0 8px 0',
    color: '#555555'
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #E0E0E0',
    margin: '8px 0'
  },
  breakdownHeader: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#AAAAAA',
    marginBottom: '6px'
  },
  breakdownList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 12px 0'
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#111111',
    marginBottom: '4px'
  },
  breakdownCount: {
    fontWeight: '600'
  },
  popupBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#E8621A',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    display: 'block',
    textAlign: 'left',
    marginTop: '4px'
  }
};
