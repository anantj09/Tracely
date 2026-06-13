import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const getIncidentColour = (inc) => {
  if (inc.status === 'RESOLVED') return '#27AE60';
  if (inc.event_type === 'SOS') return '#CC0000';
  return '#E8621A';
};

export default function SafetyMap({ incidents = [], onResolve, resolvingId }) {
  // Normalize and filter incidents that have valid coordinates
  const mapped = incidents
    .map((rawInc) => ({
      ...rawInc,
      event_type: rawInc.event_type || rawInc.type || 'SOS',
      status: rawInc.status || (rawInc.resolved ? 'RESOLVED' : 'ACTIVE'),
      location_lat: rawInc.location_lat || rawInc.lat,
      location_lng: rawInc.location_lng || rawInc.lng,
    }))
    .filter(i => i.location_lat && i.location_lng);

  return (
    <div style={styles.mapWrapper}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={styles.map} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map((inc) => {
          const colour = getIncidentColour(inc);
          return (
            <CircleMarker
              key={inc.id}
              center={[inc.location_lat, inc.location_lng]}
              radius={inc.event_type === 'SOS' && inc.status === 'ACTIVE' ? 14 : 10}
              pathOptions={{ fillColor: colour, fillOpacity: 0.85, color: colour, weight: 2 }}
            >
              <Popup>
                <strong>{inc.event_type}</strong><br />
                Train: {inc.train_number || '—'} | Coach: {inc.coach || '—'}<br />
                Status: {inc.status}<br />
                {inc.status === 'ACTIVE' && (
                  <button
                    onClick={() => onResolve(inc.id)}
                    disabled={resolvingId === inc.id}
                    style={popupBtnStyle}
                  >
                    {resolvingId === inc.id ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                )}
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
    height: '500px', borderRadius: 'var(--border-radius-card, 12px)',
    overflow: 'hidden', boxShadow: 'var(--shadow-card, 0 2px 12px rgba(0,0,0,0.08))', border: '1px solid #F0F0F0',
  },
  map: { height: '100%', width: '100%' },
};

const popupBtnStyle = {
  marginTop: '8px', display: 'block', width: '100%',
  backgroundColor: '#1A3557', color: '#FFFFFF', border: 'none',
  borderRadius: '6px', padding: '6px 0', fontSize: '12px',
  fontWeight: '600', cursor: 'pointer',
};
