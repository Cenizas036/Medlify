import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * SearchBar — debounced medicine search input with autocomplete dropdown.
 * Props:
 *   value       string
 *   onChange    (val: string) => void
 *   onSearch    (val: string) => void   — fires on Enter or suggestion click
 *   loading     boolean
 *   resultCount number | null
 *   radius      number
 *   onRadius    (r: number) => void
 */
export default function SearchBar({
  value, onChange, onSearch, loading,
  resultCount, radius, onRadius,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return }
    try {
      const res  = await fetch(`/api/search/medicines?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(Array.isArray(data) ? data : [])
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    setShowDrop(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { setShowDrop(false); onSearch(value) }
    if (e.key === 'Escape') { setShowDrop(false) }
  }

  const selectSuggestion = (name) => {
    onChange(name)
    setShowDrop(false)
    onSearch(name)
  }

  const clear = () => {
    onChange('')
    setSuggestions([])
    setShowDrop(false)
    inputRef.current?.focus()
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.search-wrapper')) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="search-section">
      <div className="search-wrapper">
        {/* Search icon */}
        <span className="search-icon" aria-hidden="true">🔍</span>

        <input
          id="medicine-search"
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search a medicine — e.g. Paracetamol, Metformin…"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          autoComplete="off"
          aria-label="Search medicines"
          aria-autocomplete="list"
          aria-controls="autocomplete-listbox"
          aria-expanded={showDrop}
        />

        {value && (
          <button
            className="search-clear"
            onClick={clear}
            aria-label="Clear search"
          >✕</button>
        )}

        {/* Autocomplete dropdown */}
        {showDrop && suggestions.length > 0 && (
          <ul
            id="autocomplete-listbox"
            role="listbox"
            className="autocomplete-dropdown"
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                role="option"
                className="autocomplete-item"
                onMouseDown={() => selectSuggestion(s.name)}
              >
                <span>{s.name}</span>
                {s.requires_prescription && (
                  <span className="rx-badge">Rx</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Meta row */}
      <div className="search-meta">
        {loading && <span>Searching…</span>}
        {!loading && resultCount !== null && value && (
          <span>
            <span className="result-count">{resultCount}</span>{' '}
            {resultCount === 1 ? 'pharmacy' : 'pharmacies'} found
          </span>
        )}
        {!loading && resultCount === 0 && value && (
          <span style={{ color: 'var(--clr-danger)' }}>
            No results — try a wider radius or different name
          </span>
        )}

        <select
          className="radius-select"
          value={radius}
          onChange={e => onRadius(Number(e.target.value))}
          aria-label="Search radius"
        >
          <option value={2000}>Within 2 km</option>
          <option value={5000}>Within 5 km</option>
          <option value={10000}>Within 10 km</option>
          <option value={20000}>Within 20 km</option>
        </select>
      </div>
    </div>
  )
}
