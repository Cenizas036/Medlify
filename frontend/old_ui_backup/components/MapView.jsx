import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon path broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Pill-shaped custom marker */
function makePillIcon(label, isActive) {
  return L.divIcon({
    className: '',
    iconAnchor: [0, 28],
    popupAnchor: [0, -30],
    html: `
      <div class="custom-marker">
        <div class="marker-bubble" style="${isActive ? 'background:#a78bfa;box-shadow:0 2px 10px rgba(167,139,250,0.7)' : ''}">
          ${label}
        </div>
        <div class="marker-stem" style="${isActive ? 'background:#a78bfa' : ''}"></div>
        <div class="marker-dot"  style="${isActive ? 'background:#a78bfa' : ''}"></div>
      </div>`,
  })
}

/** User location pulsing dot */
const userIcon = L.divIcon({
  className: '',
  iconAnchor: [10, 10],
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:rgba(102,126,234,0.9);
    border:3px solid white;
    box-shadow:0 0 0 6px rgba(102,126,234,0.3);
    animation:pulse 2s infinite;
  "></div>`,
})

/** Recenter map when user location changes */
function RecenterOnLocation({ lat, lng }) {
  const map = useMap()
  const firstMove = useRef(false)

  useEffect(() => {
    if (lat && lng && !firstMove.current) {
      map.flyTo([lat, lng], 13, { animate: true, duration: 1.5 })
      firstMove.current = true
    }
  }, [lat, lng, map])

  return null
}

/** Fly to selected pharmacy */
function FlyToSelected({ pharmacy }) {
  const map = useMap()
  useEffect(() => {
    if (pharmacy) {
      map.flyTo([pharmacy.latitude, pharmacy.longitude], 15, { animate: true, duration: 0.8 })
    }
  }, [pharmacy, map])
  return null
}

function formatDist(m) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
}

/**
 * MapView — Leaflet map with pharmacy markers and user position.
 * Props:
 *   userLat, userLng     number
 *   pharmacies           array
 *   selectedId           number | null
 *   onSelectPharmacy     (pharmacy) => void
 *   radius               number (metres)
 */
export default function MapView({ userLat, userLng, pharmacies, selectedId, onSelectPharmacy, radius }) {
  const hasLocation = userLat != null && userLng != null

  // Default centre: Bhubaneswar (shown before geolocation resolves)
  const centre = hasLocation ? [userLat, userLng] : [20.2961, 85.8245]

  return (
    <div className="map-container">
      <MapContainer
        center={centre}
        zoom={12}
        className="map-wrapper"
        zoomControl={true}
        attributionControl={true}
      >
        {/* Dark OSM tile layer */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={20}
        />

        <RecenterOnLocation lat={userLat} lng={userLng} />
        <FlyToSelected pharmacy={pharmacies.find(p => p.pharmacy_id === selectedId)} />

        {/* User location */}
        {hasLocation && (
          <>
            <Marker position={[userLat, userLng]} icon={userIcon} zIndexOffset={1000}>
              <Popup>
                <div className="popup-content">
                  <div className="popup-name">📍 You are here</div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userLat, userLng]}
              radius={radius}
              pathOptions={{ color: '#667eea', fillColor: '#667eea', fillOpacity: 0.05, weight: 1, dashArray: '6 4' }}
            />
          </>
        )}

        {/* Pharmacy markers */}
        {pharmacies.map((p, idx) => {
          const isActive = p.pharmacy_id === selectedId
          const label    = formatDist(p.distance_m)
          return (
            <Marker
              key={p.pharmacy_id}
              position={[p.latitude, p.longitude]}
              icon={makePillIcon(label, isActive)}
              zIndexOffset={isActive ? 500 : idx}
              eventHandlers={{ click: () => onSelectPharmacy(p.pharmacy_id) }}
            >
              <Popup>
                <div className="popup-content">
                  <div className="popup-name">{p.pharmacy_name}</div>
                  <div className="popup-dist">📍 {label} away</div>
                  <div className="popup-meds">
                    {p.medicines.slice(0, 3).map(m => m.name).join(' · ')}
                    {p.medicines.length > 3 && ` +${p.medicines.length - 3} more`}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
