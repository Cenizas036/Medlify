import { useState } from 'react'
import { ArrowUpDown, AlertCircle, RefreshCw } from 'lucide-react'
import PharmacyCard from './PharmacyCard'
import { SUGGESTIONS } from '../search/SearchBar'

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ height: 20, width: '70%' }} />
      <div className="skeleton" style={{ height: 14, width: '90%' }} />
      <div className="skeleton" style={{ height: 14, width: '50%' }} />
      <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
    </div>
  )
}

export default function PharmacyList({
  pharmacies, selectedId, onSelect,
  loading, error, searched, query,
  radius, onRadius, onSearch,
  onAddToCart, cart,
}) {
  const [sort, setSort] = useState('nearest')

  const sorted = [...pharmacies].sort((a, b) => {
    if (sort === 'price') {
      const pa = Math.min(...a.medicines.map(m => Number(m.price)))
      const pb = Math.min(...b.medicines.map(m => Number(m.price)))
      return pa - pb
    }
    return a.distance_m - b.distance_m
  })

  if (loading) {
    return (
      <div className="panel-body">
        <div className="results-header">
          <span className="results-title">Searching…</span>
        </div>
        <div className="results-list">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="state-icon-wrap"><AlertCircle size={28} /></div>
          <p className="state-title">Search failed</p>
          <p className="state-desc">{error}</p>
          <button className="btn btn-md btn-primary" onClick={() => onSearch(query)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (!searched || !query) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="state-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <p className="state-title">Find medicines nearby</p>
          <p className="state-desc">Search a medicine to find pharmacies with stock and pricing.</p>
          <div className="suggestion-chips">
            {SUGGESTIONS.map(s => (
              <button key={s} className="chip" onClick={() => onSearch(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (pharmacies.length === 0) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="state-icon-wrap">
            <AlertCircle size={28} />
          </div>
          <p className="state-title">No pharmacies found</p>
          <p className="state-desc">
            No pharmacies within {radius / 1000} km stock "{query}".
            {radius < 25000 && ' Try a wider radius.'}
          </p>
          {radius < 25000 && (
            <button
              className="btn btn-md btn-primary"
              onClick={() => { onRadius(Math.min(radius + 5000, 25000)) }}
            >
              Increase radius
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="panel-body">
      <div className="results-header">
        <span className="results-title">Nearby pharmacies</span>
        <span className="results-count">{pharmacies.length} found</span>
        <button
          className="sort-btn"
          onClick={() => setSort(s => s === 'nearest' ? 'price' : 'nearest')}
          aria-label={`Sort by ${sort === 'nearest' ? 'lowest price' : 'nearest'}`}
        >
          <ArrowUpDown size={12} style={{ display: 'inline', marginRight: 4 }} />
          {sort === 'nearest' ? 'Nearest' : 'Lowest price'}
        </button>
      </div>

      <div className="results-list" role="listbox" aria-label="Pharmacy results">
        {sorted.map((p, i) => {
          const cartGroup = cart[p.pharmacy_id]
          const cartItems = cartGroup?.items || []
          return (
            <PharmacyCard
              key={p.pharmacy_id}
              pharmacy={p}
              isSelected={p.pharmacy_id === selectedId}
              onSelect={onSelect}
              onAddToCart={onAddToCart}
              cartItems={cartItems}
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          )
        })}
      </div>
    </div>
  )
}
