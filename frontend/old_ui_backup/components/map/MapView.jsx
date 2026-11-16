import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

/* ── Custom marker icons ── */
function makeMarkerIcon(active = false) {
  const bg = active ? '#0E9F85' : '#FFFFFF'
  const border = active ? '#0E9F85' : 'rgba(0,0,0,0.22)'
  const fill = active ? '#fff' : '#6B6B66'
  const shadow = active
    ? '0 4px 20px rgba(14,159,133,0.5)'
    : '0 3px 12px rgba(0,0,0,0.15)'

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <g transform="rotate(45 21 21)">
        <rect x="4" y="4" width="34" height="34" rx="17" ry="17"
              fill="${bg}" stroke="${border}" stroke-width="2.5"
              style="filter:drop-shadow(${shadow.replace(/rgba/g,'rgba')})"/>
      </g>
      <g transform="translate(13,11)">
        <rect x="3" y="0" width="10" height="8" rx="2" fill="none" stroke="${fill}" stroke-width="1.8"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke="${fill}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="6" y1="4" x2="10" y2="4" stroke="${fill}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5" y1="8" x2="5" y2="12" stroke="${fill}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="8" x2="11" y2="12" stroke="${fill}" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>`

  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [42, 42],
    iconAnchor: [21, 38],
    popupAnchor: [0, -40],
  })
}

function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="user-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

const defaultIcon  = makeMarkerIcon(false)
const activeIcon   = makeMarkerIcon(true)
const userIcon     = makeUserIcon()

/* ── Map controller sub-component ── */
function MapController({ center, flyToId, pharmacies }) {
  const map = useMap()
  const prevFly = useRef(null)

  useEffect(() => {
    if (flyToId && flyToId !== prevFly.current) {
      const ph = pharmacies.find(p => p.pharmacy_id === flyToId)
      if (ph) {
        map.flyTo([Number(ph.latitude), Number(ph.longitude)], 16, { duration: 0.8 })
        prevFly.current = flyToId
      }
    }
  }, [flyToId, pharmacies, map])

  // Fit bounds when pharmacies change
  useEffect(() => {
    if (pharmacies.length > 0) {
      const bounds = L.latLngBounds(
        pharmacies.map(p => [Number(p.latitude), Number(p.longitude)])
      )
      // Include user location
      if (center) bounds.extend(center)
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.6 })
    }
  }, [pharmacies.length]) // Only when result set changes

  return null
}

export default function MapView({ lat, lng, pharmacies, selectedId, onSelect }) {
  const center = useMemo(
    () => lat != null && lng != null ? [lat, lng] : [20.2961, 85.8245],
    [lat, lng]
  )

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={true}
      className="leaflet-container"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      <MapController
        center={center}
        flyToId={selectedId}
        pharmacies={pharmacies}
      />

      {/* User location */}
      {lat != null && lng != null && (
        <Marker position={center} icon={userIcon} zIndexOffset={1000}>
          <Popup>
            <strong>Your location</strong>
          </Popup>
        </Marker>
      )}

      {/* Pharmacy markers */}
      {pharmacies.map(p => {
        const pos = [Number(p.latitude), Number(p.longitude)]
        const isActive = p.pharmacy_id === selectedId
        return (
          <Marker
            key={p.pharmacy_id}
            position={pos}
            icon={isActive ? activeIcon : defaultIcon}
            zIndexOffset={isActive ? 500 : 0}
            eventHandlers={{
              click: () => onSelect(p.pharmacy_id),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font)', minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{p.pharmacy_name}</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{p.address}</div>
                {p.medicines && (
                  <div style={{ fontSize: 12, marginTop: 6, color: '#0E9F85', fontWeight: 600 }}>
                    {p.medicines.length} medicine{p.medicines.length !== 1 ? 's' : ''} in stock
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
