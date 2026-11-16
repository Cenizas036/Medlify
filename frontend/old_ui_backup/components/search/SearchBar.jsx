import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'

const SUGGESTIONS = ['Paracetamol', 'Metformin', 'Cetirizine', 'Omeprazole']

export default function SearchBar({ value, onChange, onSearch, loading }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [focused, setFocused]         = useState(0)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const wrapRef     = useRef(null)

  const fetchSuggestions = useCallback(async (q, signal) => {
    if (!q || q.length < 2) { setSuggestions([]); return }
    try {
      const data = await api.searchMedicines(q, signal)
      setSuggestions(Array.isArray(data) ? data : [])
    } catch { setSuggestions([]) }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    setShowDrop(true)
    setFocused(0)
    clearTimeout(debounceRef.current)
    const ctrl = new AbortController()
    debounceRef.current = setTimeout(() => fetchSuggestions(val, ctrl.signal), 250)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showDrop && suggestions[focused]) {
        select(suggestions[focused].name)
      } else {
        setShowDrop(false)
        onSearch(value)
      }
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Escape')    { setShowDrop(false); inputRef.current?.blur() }
  }

  const select = (name) => {
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

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="panel-topbar">
      <div className="panel-search-wrap" ref={wrapRef}>
        <span className="search-icon-left" aria-hidden="true">
          <Search size={16} />
        </span>

        <input
          id="medicine-search"
          ref={inputRef}
          type="search"
          className="panel-search"
          placeholder="Search medicines — Paracetamol, Metformin…"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          autoComplete="off"
          aria-label="Search medicines"
          aria-autocomplete="list"
          aria-controls="ac-listbox"
          aria-expanded={showDrop}
        />

        {value && (
          <button className="search-clear-btn" onClick={clear} aria-label="Clear search">
            <X size={14} />
          </button>
        )}

        {showDrop && suggestions.length > 0 && (
          <ul
            id="ac-listbox"
            role="listbox"
            className="autocomplete-drop"
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                role="option"
                aria-selected={i === focused}
                className={`ac-item${i === focused ? ' focused' : ''}`}
                onMouseDown={() => select(s.name)}
              >
                <div>
                  <div className="ac-name">{s.name}</div>
                  {s.generic_name && s.generic_name !== s.name && (
                    <div className="ac-generic">Generic: {s.generic_name}</div>
                  )}
                </div>
                {s.requires_prescription && (
                  <span className="badge badge-rx">Rx</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { SUGGESTIONS }
