import { useState, useCallback, useEffect } from 'react'
import {
  Search as SearchIcon, ShoppingCart, ClipboardList,
  Crosshair, SlidersHorizontal, Pill
} from 'lucide-react'

import MapView from './components/map/MapView'
import SearchBar from './components/search/SearchBar'
import PharmacyList from './components/pharmacy/PharmacyList'
import PharmacyDetail from './components/pharmacy/PharmacyDetail'
import CartView from './components/cart/CartView'
import OrderHistory from './components/orders/OrderHistory'
import OrderTracking from './components/orders/OrderTracking'

import { useGeolocation } from './hooks/useGeolocation'
import { useSearch } from './hooks/useSearch'
import { useCart } from './hooks/useCart'
import { useOrders } from './hooks/useOrders'
import { formatDist } from './lib/format'

// Panel views
const VIEW_EXPLORE  = 'explore'
const VIEW_DETAIL   = 'detail'
const VIEW_CART     = 'cart'
const VIEW_ORDERS   = 'orders'
const VIEW_TRACKING = 'tracking'

// Radius options in metres
const RADIUS_OPTIONS = [
  { label: '2 km',  value: 2000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '15 km', value: 15000 },
  { label: '25 km', value: 25000 },
]

export default function App() {
  // ── Location ──
  const geo = useGeolocation()

  // ── Search ──
  const {
    query, setQuery, pharmacies, loading, error, searched,
    radius, setRadius, search,
  } = useSearch()

  // ── Cart ──
  const {
    cart, addItem, removeItem, updateQty,
    clearPharmacy, clearCart, totalCount, grandTotal,
  } = useCart()

  // ── Orders ──
  const { orderIds, addOrderId } = useOrders()

  // ── Panel state ──
  const [view, setView]               = useState(VIEW_EXPLORE)
  const [selectedId, setSelectedId]   = useState(null)
  const [trackingOrderId, setTrackId] = useState(null)
  const [panelCollapsed, setCollapsed] = useState(false)
  const [showFilter, setShowFilter]   = useState(false)

  // ── Toast ──
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'default') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  // ── Handlers ──
  const doSearch = useCallback((q) => {
    const term = q || query
    if (!term.trim()) return
    setQuery(term)
    setView(VIEW_EXPLORE)
    setSelectedId(null)
    search(term, geo.lat, geo.lng, radius)
  }, [query, geo.lat, geo.lng, radius, search, setQuery])

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
    setView(VIEW_DETAIL)
  }, [])

  const handleBackToResults = useCallback(() => {
    setView(VIEW_EXPLORE)
  }, [])

  const handleAddToCart = useCallback((pharmacy, medicine, newQty) => {
    const phId   = pharmacy.pharmacy_id
    const phName = pharmacy.pharmacy_name || pharmacy.name
    if (newQty < 1) {
      removeItem(phId, medicine.medicine_id)
      return
    }
    const group = cart[phId]
    const existing = group?.items.find(i => i.medicine_id === medicine.medicine_id)
    if (existing) {
      updateQty(phId, medicine.medicine_id, newQty)
    } else {
      addItem(phId, phName, {
        medicine_id: medicine.medicine_id,
        name: medicine.name,
        price: medicine.price,
        maxQty: medicine.quantity,
        prescription: medicine.requires_prescription || medicine.prescription || false,
      })
      toast(`${medicine.name} added to cart`)
    }
  }, [cart, addItem, removeItem, updateQty, toast])

  const handleOrderPlaced = useCallback((result) => {
    addOrderId(result.id)
    setTrackId(result.id)
    setView(VIEW_TRACKING)
    toast('Order placed successfully!', 'success')
  }, [addOrderId, toast])

  const handleViewOrder = useCallback((id) => {
    setTrackId(id)
    setView(VIEW_TRACKING)
  }, [])

  // Re-search when radius changes
  useEffect(() => {
    if (searched && query.trim()) {
      search(query, geo.lat, geo.lng, radius)
    }
  }, [radius])

  // ── Which nav button is active ──
  const navView = view === VIEW_DETAIL ? VIEW_EXPLORE : view === VIEW_TRACKING ? VIEW_ORDERS : view

  // ── Determine the search-result pharmacy for detail view ──
  const searchPharmacy = pharmacies.find(p => p.pharmacy_id === selectedId)

  return (
    <div className="app-card">
      {/* ════════════ MAP COLUMN ════════════ */}
      <div className="map-col">
        <MapView
          lat={geo.lat}
          lng={geo.lng}
          pharmacies={pharmacies}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* ── Top-left brand ── */}
        <div className="map-overlay map-brand">
          <div className="brand-pill">
            <div className="brand-logo">
              <Pill size={18} color="white" />
            </div>
            <span className="brand-name">Medlify</span>
          </div>

          {searched && pharmacies.length > 0 && (
            <div className="map-subtitle">
              <div className="map-subtitle-title">Results for</div>
              <div className="map-subtitle-text">
                "{query}" · {pharmacies.length} pharmac{pharmacies.length === 1 ? 'y' : 'ies'} within {radius / 1000} km
              </div>
            </div>
          )}
        </div>

        {/* ── Top-center nav pill ── */}
        <div className="map-overlay map-nav">
          <div className="nav-pill">
            <button
              className={`nav-btn${navView === VIEW_EXPLORE ? ' active' : ''}`}
              onClick={() => { setView(VIEW_EXPLORE); setCollapsed(false) }}
              aria-label="Search / Explore"
              title="Search"
            >
              <SearchIcon size={18} />
            </button>
            <button
              className={`nav-btn${navView === VIEW_CART ? ' active' : ''}`}
              onClick={() => { setView(VIEW_CART); setCollapsed(false) }}
              aria-label="Cart"
              title="Cart"
            >
              <ShoppingCart size={18} />
              {totalCount > 0 && <span className="badge">{totalCount}</span>}
            </button>
            <button
              className={`nav-btn${navView === VIEW_ORDERS ? ' active' : ''}`}
              onClick={() => { setView(VIEW_ORDERS); setCollapsed(false) }}
              aria-label="Orders"
              title="Orders"
            >
              <ClipboardList size={18} />
              {orderIds.length > 0 && <span className="badge">{orderIds.length}</span>}
            </button>
          </div>
        </div>

        {/* ── Top-right filter ── */}
        <div className="map-overlay map-filter">
          <button
            className="icon-btn"
            onClick={() => setShowFilter(f => !f)}
            aria-label="Radius filter"
            title="Search radius"
          >
            <SlidersHorizontal size={18} />
          </button>

          {showFilter && (
            <div className="filter-popover">
              <div className="filter-label">Search radius</div>
              <div className="filter-options">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    className={`filter-option${radius === r.value ? ' active' : ''}`}
                    onClick={() => { setRadius(r.value); setShowFilter(false) }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom-right map controls ── */}
        <div className="map-overlay map-controls">
          <button
            className="icon-btn"
            onClick={geo.retry}
            disabled={geo.loading}
            aria-label="Re-centre on my location"
            title="My location"
          >
            <Crosshair size={18} />
          </button>
        </div>

        {/* ── Bottom-left distance indicator ── */}
        {pharmacies.length > 0 && selectedId && searchPharmacy && (
          <div className="map-overlay map-distance">
            <div className="distance-pill">
              📍 {formatDist(searchPharmacy.distance_m)}
            </div>
          </div>
        )}

        {/* ── Fallback location notice ── */}
        {geo.usingFallback && (
          <div className="location-notice">
            📍 Using default: Bhubaneswar. Allow location for accurate results.
          </div>
        )}

        {/* ── Demo banner ── */}
        <div className="demo-banner">
          Simulated data · No real pharmacies
        </div>
      </div>

      {/* ════════════ PANEL COLUMN ════════════ */}
      <div className={`panel-col${panelCollapsed ? ' collapsed' : ''}`}>
        {/* ── Mobile drag handle ── */}
        <div className="panel-drag-handle" onClick={() => setCollapsed(c => !c)} />

        {/* ── Search bar (always visible in explore/detail) ── */}
        {(view === VIEW_EXPLORE || view === VIEW_DETAIL) && (
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={doSearch}
            loading={loading}
          />
        )}

        {/* ── Panel body ── */}
        {view === VIEW_EXPLORE && (
          <PharmacyList
            pharmacies={pharmacies}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={loading}
            error={error}
            searched={searched}
            query={query}
            radius={radius}
            onRadius={setRadius}
            onSearch={doSearch}
            onAddToCart={handleAddToCart}
            cart={cart}
          />
        )}

        {view === VIEW_DETAIL && selectedId && (
          <PharmacyDetail
            pharmacyId={selectedId}
            searchPharmacy={searchPharmacy}
            userLat={geo.lat}
            userLng={geo.lng}
            onBack={handleBackToResults}
            onAddToCart={handleAddToCart}
            cart={cart}
          />
        )}

        {view === VIEW_CART && (
          <CartView
            cart={cart}
            updateQty={updateQty}
            removeItem={removeItem}
            clearPharmacy={clearPharmacy}
            grandTotal={grandTotal}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {view === VIEW_ORDERS && (
          <OrderHistory
            orderIds={orderIds}
            onViewOrder={handleViewOrder}
          />
        )}

        {view === VIEW_TRACKING && trackingOrderId && (
          <OrderTracking
            orderId={trackingOrderId}
            onBack={() => setView(VIEW_ORDERS)}
          />
        )}
      </div>

      {/* ── Toasts ── */}
      {toasts.length > 0 && (
        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
          ))}
        </div>
      )}
    </div>
  )
}
