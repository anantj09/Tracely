import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
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

const getHeatmapColor = (total) => {
  if (total > 30) return '#CC0000'; // red
  if (total >= 10) return '#E8621A'; // orange
  return '#27AE60'; // green
};

export default function IndiaComplaintMap({ heatmapData = [] }) {
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
        {heatmapData.map((station) => {
          const color = getHeatmapColor(station.total_complaints);
          const radius = Math.min(Math.max(8, station.total_complaints / 3), 30);

          return (
            <CircleMarker
              key={station.station_code}
              center={[station.lat, station.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={styles.popup}>
                  <h3 style={styles.popupTitle}>
                    {station.station_name} ({station.station_code})
                  </h3>
                  <p style={styles.popupSubtitle}>
                    Total Complaints: <strong>{station.total_complaints}</strong>
                  </p>
                  {station.by_type && Object.keys(station.by_type).length > 0 && (
                    <>
                      <hr style={styles.divider} />
                      <div style={styles.breakdownHeader}>Breakdown by Type:</div>
                      <ul style={styles.breakdownList}>
                        {Object.entries(station.by_type)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <li key={type} style={styles.breakdownItem}>
                              <span style={styles.typeName}>{formatCategory(type)}</span>
                              <span style={styles.typeCount}>{count}</span>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

const styles = {
  mapWrapper: {
    width: '100%',
    height: '600px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #E0E0E0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  popup: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#111111',
    padding: '4px',
    minWidth: '200px',
  },
  popupTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    color: '#1A3557',
  },
  popupSubtitle: {
    fontSize: '13px',
    margin: '0 0 8px 0',
    color: '#555555',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #E0E0E0',
    margin: '8px 0',
  },
  breakdownHeader: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#888888',
    marginBottom: '6px',
  },
  breakdownList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#111111',
  },
  typeName: {
    color: '#555555',
  },
  typeCount: {
    fontWeight: '600',
    color: '#111111',
  },
};
