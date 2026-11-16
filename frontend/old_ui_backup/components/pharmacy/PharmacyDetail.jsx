import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Phone, Clock, ExternalLink, Plus, Minus, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDist, formatPrice, stockStatus, stockLabel } from '../../lib/format'

function StockBadge({ qty }) {
  const s = stockStatus(qty)
  return <span className={`badge badge-stock-${s}`}>{stockLabel(qty)}</span>
}

export default function PharmacyDetail({ pharmacyId, searchPharmacy, userLat, userLng, onBack, onAddToCart, cart }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!pharmacyId) return
    setLoading(true)
    setError(null)
    api.getPharmacy(pharmacyId)
      .then(d => { setDetail(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [pharmacyId])

  const ph = detail || searchPharmacy

  const dirUrl = ph && userLat != null
    ? `https://www.openstreetmap.org/directions?from=${userLat},${userLng}&to=${ph.latitude ?? ''},${ph.longitude ?? ''}`
    : null

  if (loading && !ph) {
    return (
      <div className="panel-body" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '50%' }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 12 }} />
      </div>
    )
  }

  if (error && !ph) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <AlertCircle size={28} />
          <p className="state-title">Could not load pharmacy</p>
          <p className="state-desc">{error}</p>
          <button className="btn btn-md btn-primary" onClick={onBack}>Go back</button>
        </div>
      </div>
    )
  }

  const medicines = detail?.inventory || searchPharmacy?.medicines || []
  const dist = searchPharmacy?.distance_m != null ? formatDist(searchPharmacy.distance_m) : null

  return (
    <div className="panel-body">
      <div className="detail-header">
        <button className="icon-btn detail-back" onClick={onBack} aria-label="Back to results" style={{ width: 36, height: 36 }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="detail-name">{ph?.name || ph?.pharmacy_name}</h2>
          <div className="detail-store-id">Store #{pharmacyId}</div>
        </div>
      </div>

      <div className="detail-hero">
        <div className="detail-hero-inner">
          <div className="detail-ph-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8M12 21v-4"/><rect x="3" y="3" width="18" height="14" rx="3"/>
              <path d="M12 7v4M10 9h4"/>
            </svg>
          </div>
          <div className="detail-info-block">
            {ph?.address && (
              <div className="detail-info-row">
                <MapPin size={13} />
                <span>{ph.address}</span>
              </div>
            )}
            {ph?.phone && (
              <div className="detail-info-row">
                <Phone size={13} />
                <a href={`tel:${ph.phone}`} style={{ color: 'var(--brand)' }}>{ph.phone}</a>
              </div>
            )}
            {ph?.open_hours && (
              <div className="detail-info-row">
                <Clock size={13} />
                <span>{ph.open_hours}</span>
              </div>
            )}
            {dist && (
              <div className="detail-info-row">
                <MapPin size={13} />
                <span>{dist} away</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="detail-actions">
        {dirUrl && (
          <a
            href={dirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary"
            style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
          >
            <ExternalLink size={13} /> Directions
          </a>
        )}
        {ph?.phone && (
          <a
            href={`tel:${ph.phone}`}
            className="btn btn-sm btn-secondary"
            style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
          >
            <Phone size={13} /> Call
          </a>
        )}
      </div>

      <div className="detail-meds-header">
        Available medicines ({medicines.length})
      </div>

      <div className="results-list" style={{ paddingTop: 8 }}>
        {medicines.map(m => {
          const cartGroup = cart[pharmacyId]
          const cartItem  = cartGroup?.items.find(i => i.medicine_id === m.medicine_id)
          const inCart    = !!cartItem

          return (
            <div key={m.medicine_id} className="med-row" style={{ background: 'var(--surface)', borderRadius: 'var(--r-sm)', margin: '4px 12px', padding: '10px 12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="med-row-name">{m.name}</div>
                {m.generic_name && m.generic_name !== m.name && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Generic: {m.generic_name}
                  </div>
                )}
              </div>
              <div className="med-row-right">
                {m.requires_prescription && <span className="badge badge-rx">Rx</span>}
                <StockBadge qty={m.quantity} />
                <span className="med-price">{formatPrice(m.price)}</span>
                {inCart ? (
                  <div className="qty-stepper">
                    <button className="qty-btn" onClick={() => onAddToCart({pharmacy_id: pharmacyId, pharmacy_name: ph?.name || ph?.pharmacy_name}, m, cartItem.quantity - 1)} disabled={cartItem.quantity <= 1}>
                      <Minus size={12} />
                    </button>
                    <span className="qty-val">{cartItem.quantity}</span>
                    <button className="qty-btn" onClick={() => onAddToCart({pharmacy_id: pharmacyId, pharmacy_name: ph?.name || ph?.pharmacy_name}, m, cartItem.quantity + 1)} disabled={cartItem.quantity >= m.quantity}>
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onAddToCart({pharmacy_id: pharmacyId, pharmacy_name: ph?.name || ph?.pharmacy_name}, m, 1)}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
