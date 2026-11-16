import { useState, useEffect } from 'react'

const BBSR = { lat: 20.2961, lng: 85.8245 }

export function useGeolocation() {
  const [state, setState] = useState({
    lat: null, lng: null, error: null, loading: true, usingFallback: false,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: BBSR.lat, lng: BBSR.lng, error: 'Geolocation not supported.', loading: false, usingFallback: true })
      return
    }

    const id = navigator.geolocation.watchPosition(
      pos => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, loading: false, usingFallback: false }),
      err => setState({ lat: BBSR.lat, lng: BBSR.lng, error: err.message, loading: false, usingFallback: true }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const retry = () => {
    setState(s => ({ ...s, loading: true }))
    navigator.geolocation?.getCurrentPosition(
      pos => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, loading: false, usingFallback: false }),
      err => setState({ lat: BBSR.lat, lng: BBSR.lng, error: err.message, loading: false, usingFallback: true }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return { ...state, retry }
}
