import { useState, useCallback, useRef } from 'react'
import { api } from '../lib/api'

export function useSearch() {
  const [query,      setQuery]      = useState('')
  const [pharmacies, setPharmacies] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [searched,   setSearched]   = useState(false)
  const [radius,     setRadius]     = useState(10000)
  const abortRef = useRef(null)

  const search = useCallback(async (q, lat, lng, r = radius) => {
    const term = q.trim()
    if (!term) { setPharmacies([]); setSearched(false); return }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const data = await api.searchPharmacies(term, lat, lng, r, abortRef.current.signal)
      // Convert distance_m string -> number for each pharmacy
      const rows = (data.pharmacies || []).map(p => ({
        ...p,
        distance_m: Number(p.distance_m),
      }))
      setPharmacies(rows)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Search failed. Please try again.')
        setPharmacies([])
      }
    } finally {
      setLoading(false)
    }
  }, [radius])

  return { query, setQuery, pharmacies, setPharmacies, loading, error, searched, radius, setRadius, search }
}
