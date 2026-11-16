/**
 * PharmacyCard — shows a single pharmacy result with medicines and disabled order button.
 * Props:
 *   pharmacy   object (from API)
 *   isActive   boolean
 *   onClick    () => void
 *   animDelay  number (seconds, for staggered entrance)
 */
export default function PharmacyCard({ pharmacy: p, isActive, onClick, animDelay = 0 }) {
  const dist = p.distance_m < 1000
    ? `${p.distance_m} m`
    : `${(p.distance_m / 1000).toFixed(1)} km`

  return (
    <article
      className={`pharmacy-card${isActive ? ' active' : ''}`}
      onClick={onClick}
      style={{ animationDelay: `${animDelay}s` }}
      aria-selected={isActive}
      role="option"
    >
      {/* Header */}
      <div className="card-header">
        <h2 className="card-name">{p.pharmacy_name}</h2>
        <span className="distance-badge">📍 {dist}</span>
      </div>

      {/* Address & hours */}
      <p className="card-address">{p.address}</p>
      <p className="card-hours">
        <span className="dot" aria-hidden="true" />
        {p.open_hours}
      </p>

      {/* Matched medicines (up to 4) */}
      <ul className="medicine-list" aria-label="Available medicines">
        {p.medicines.slice(0, 4).map((m, i) => (
          <li key={i} className="medicine-row">
            <span className="medicine-row-name" title={m.name}>{m.name}</span>
            <span className="medicine-row-info">
              {m.prescription && <span className="rx-tag">Rx</span>}
              <span className="med-qty">{m.quantity} left</span>
              <span className="med-price">₹{Number(m.price).toFixed(0)}</span>
            </span>
          </li>
        ))}
        {p.medicines.length > 4 && (
          <li style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)', padding: '0.2rem 0.6rem' }}>
            +{p.medicines.length - 4} more medicines in stock
          </li>
        )}
      </ul>

      {/* Order button (disabled — Phase 2) */}
      <button
        className="order-btn"
        disabled
        aria-disabled="true"
        aria-label="Order for delivery — coming in Phase 2"
      >
        🛒 Order for Delivery
      </button>
    </article>
  )
}
