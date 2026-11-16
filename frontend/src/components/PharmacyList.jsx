import PharmacyCard from './PharmacyCard'

/**
 * PharmacyList — scrollable list panel of pharmacy results.
 * Props:
 *   pharmacies     array
 *   selectedId     number | null
 *   onSelect       (id) => void
 *   loading        boolean
 *   searched       boolean  — has the user searched yet?
 *   query          string
 */
export default function PharmacyList({ pharmacies, selectedId, onSelect, loading, searched, query }) {
  if (loading) {
    return (
      <>
        <div className="list-header">Results</div>
        <div className="state-container">
          <div className="spinner" aria-label="Searching…" />
          <p className="state-title">Finding pharmacies…</p>
        </div>
      </>
    )
  }

  if (!searched || !query) {
    return (
      <>
        <div className="list-header">Nearby Pharmacies</div>
        <div className="state-container">
          <div className="state-icon" aria-hidden="true">💊</div>
          <p className="state-title">Search a medicine</p>
          <p className="state-desc">
            Type a medicine name above and we'll show you nearby pharmacies with stock and pricing.
          </p>
        </div>
      </>
    )
  }

  if (pharmacies.length === 0) {
    return (
      <>
        <div className="list-header">Results for "{query}"</div>
        <div className="state-container">
          <div className="state-icon" aria-hidden="true">🔍</div>
          <p className="state-title">No pharmacies found</p>
          <p className="state-desc">
            Try a wider search radius, a different spelling, or the generic name.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="list-header">
        <span>Results</span>
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          {pharmacies.length} found
        </span>
      </div>
      <div
        className="pharmacy-list"
        role="listbox"
        aria-label="Pharmacy results"
      >
        {pharmacies.map((p, i) => (
          <PharmacyCard
            key={p.pharmacy_id}
            pharmacy={p}
            isActive={p.pharmacy_id === selectedId}
            onClick={() => onSelect(p.pharmacy_id)}
            animDelay={i * 0.05}
          />
        ))}
      </div>
    </>
  )
}
