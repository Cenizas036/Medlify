import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { formatPrice, formatDateShort, STATUS_LABELS, STATUS_STEPS } from '../../lib/format'

function MiniTimeline({ status }) {
  const cancelled = status === 'cancelled'
  const curIdx    = cancelled ? -1 : STATUS_STEPS.indexOf(status)

  return (
    <div className="mini-timeline">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? '1' : 'none' }}>
          <div className={`mini-step ${cancelled ? '' : i <= curIdx ? 'done' : ''} ${!cancelled && i === curIdx ? 'current' : ''}`} />
          {i < STATUS_STEPS.length - 1 && (
            <div className={`mini-line ${!cancelled && i < curIdx ? 'done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OrderHistory({ orderIds, onViewOrder }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const fetchOrders = () => {
    if (orderIds.length === 0) return
    setLoading(true)
    api.getOrders(orderIds)
      .then(rows => { setOrders(rows); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { fetchOrders() }, [orderIds.join(',')])

  if (orderIds.length === 0) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="state-icon-wrap"><ClipboardList size={28} /></div>
          <p className="state-title">No orders yet</p>
          <p className="state-desc">Add items to your cart and place an order to see it here.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="panel-body">
        <div className="orders-container">
          {[1,2].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <p className="state-title">Could not load orders</p>
          <p className="state-desc">{error}</p>
          <button className="btn btn-md btn-primary" onClick={fetchOrders}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="panel-body">
      <div className="orders-container">
        <h2 className="orders-title">Your orders</h2>
        {orders.map(o => (
          <div
            key={o.id}
            className="order-dark-card"
            onClick={() => onViewOrder(o.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onViewOrder(o.id)}
            aria-label={`View order #${o.id} from ${o.pharmacy_name}`}
          >
            <div className="odc-top">
              <div className="odc-pharmacy">{o.pharmacy_name}</div>
              <span className={`badge badge-status-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
            </div>
            <div className="odc-meta">
              {o.item_count} item{o.item_count !== 1 ? 's' : ''} · {formatDateShort(o.created_at)}
            </div>
            <div className="odc-total">{formatPrice(o.total)}</div>
            <MiniTimeline status={o.status} />
          </div>
        ))}
        <button
          className="btn btn-sm btn-ghost btn-full"
          style={{ marginTop: 4 }}
          onClick={fetchOrders}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    </div>
  )
}
