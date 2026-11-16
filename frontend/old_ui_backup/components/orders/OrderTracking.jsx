import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, MapPin, Phone, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, formatPrice, STATUS_LABELS, STATUS_STEPS } from '../../lib/format'

function StatusStepper({ status }) {
  const cancelled = status === 'cancelled'
  const curIdx    = STATUS_STEPS.indexOf(status)

  if (cancelled) {
    return (
      <div className="cancelled-banner">
        <AlertTriangle size={16} />
        This order was cancelled
      </div>
    )
  }

  return (
    <div className="stepper-steps">
      {STATUS_STEPS.map((step, i) => {
        const done    = i < curIdx
        const current = i === curIdx
        const cls     = done ? 'done' : current ? 'current' : ''
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STATUS_STEPS.length - 1 ? '1' : 'none' }}>
            <div className="step-node" style={{ flex: 'none', width: 48 }}>
              <div className={`step-circle ${cls}`}>
                {done ? '✓' : i + 1}
              </div>
              <div className={`step-label ${cls}`} style={{ fontSize: 10, textAlign: 'center' }}>
                {STATUS_LABELS[step]}
              </div>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`step-line ${done ? 'done' : ''}`} style={{ marginTop: 14 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OrderTracking({ orderId, onBack }) {
  const [order, setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [advancing, setAdv] = useState(false)
  const [cancelling, setCan] = useState(false)

  const fetchOrder = useCallback((signal) => {
    api.getOrder(orderId, signal)
      .then(d => { setOrder(d); setLoading(false); setError(null) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false) } })
  }, [orderId])

  useEffect(() => {
    setLoading(true)
    const ctrl = new AbortController()
    fetchOrder(ctrl.signal)

    // Poll every 10s while not terminal
    const interval = setInterval(() => {
      if (order && (order.status === 'delivered' || order.status === 'cancelled')) {
        clearInterval(interval)
        return
      }
      fetchOrder(ctrl.signal)
    }, 10000)

    return () => { ctrl.abort(); clearInterval(interval) }
  }, [orderId, fetchOrder])

  const advance = async () => {
    setAdv(true)
    try {
      const r = await api.advanceOrder(orderId)
      setOrder(o => ({ ...o, status: r.status }))
    } finally { setAdv(false) }
  }

  const cancel = async () => {
    if (!confirm('Cancel this order? Inventory will be restored.')) return
    setCan(true)
    try {
      await api.cancelOrder(orderId)
      setOrder(o => ({ ...o, status: 'cancelled' }))
    } catch (e) {
      alert(e.message)
    } finally { setCan(false) }
  }

  if (loading && !order) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 20, width: 160 }} />
          <div className="skeleton" style={{ height: 80, width: '100%', borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <p className="state-title">Could not load order</p>
          <p className="state-desc">{error}</p>
          <button className="btn btn-md btn-primary" onClick={() => fetchOrder()}>Retry</button>
        </div>
      </div>
    )
  }

  if (!order) return null

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div className="panel-body">
      <div className="tracking-container">
        <div className="tracking-header">
          <button className="icon-btn" onClick={onBack} aria-label="Back" style={{ width: 36, height: 36 }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="tracking-order-id">Order #{order.id}</div>
            <div className="tracking-ph">{order.pharmacy_name}</div>
          </div>
        </div>

        <div className="status-stepper">
          <StatusStepper status={order.status} />
        </div>

        <div className="tracking-info-card">
          {order.delivery_address && (
            <div className="tracking-info-row">
              <MapPin size={14} />
              <span>{order.delivery_address}</span>
            </div>
          )}
          {order.pharmacy_phone && (
            <div className="tracking-info-row">
              <Phone size={14} />
              <a href={`tel:${order.pharmacy_phone}`} style={{ color: 'var(--brand)' }}>{order.pharmacy_phone}</a>
            </div>
          )}
          <div className="tracking-info-row" style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
            Placed {formatDate(order.created_at)}
          </div>
        </div>

        <div className="tracking-items">
          <div className="tracking-items-title">Items ({order.items?.length || 0})</div>
          {order.items?.map(item => (
            <div key={item.medicine_id} className="tracking-item-row">
              <span>{item.medicine_name} × {item.quantity}</span>
              <span>{formatPrice(Number(item.price) * item.quantity)}</span>
            </div>
          ))}
          <div className="tracking-total">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {!isTerminal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-md btn-secondary btn-full"
              onClick={advance}
              disabled={advancing}
            >
              {advancing ? 'Updating…' : '⚡ Simulate next status (demo only)'}
            </button>
            {order.status === 'placed' && (
              <button
                className="btn btn-md btn-danger btn-full"
                onClick={cancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Simulated data only · No real pharmacy, no real tracking
        </p>
      </div>
    </div>
  )
}
