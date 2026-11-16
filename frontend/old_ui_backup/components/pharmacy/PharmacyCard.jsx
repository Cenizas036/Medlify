import { formatDist, formatPrice, stockStatus, stockLabel } from '../../lib/format'
import { Plus, Minus } from 'lucide-react'

function StockBadge({ qty }) {
  const s = stockStatus(qty)
  return (
    <span className={`badge badge-stock-${s}`}>
      {stockLabel(qty)}
    </span>
  )
}

function QuantityStepper({ qty, maxQty, onMinus, onPlus }) {
  return (
    <div className="qty-stepper">
      <button
        className="qty-btn"
        onClick={onMinus}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={12} />
      </button>
      <span className="qty-val" aria-live="polite">{qty}</span>
      <button
        className="qty-btn"
        onClick={onPlus}
        disabled={qty >= maxQty}
        aria-label="Increase quantity"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

export default function PharmacyCard({ pharmacy: p, isSelected, onSelect, onAddToCart, cartItems }) {
  const dist = formatDist(p.distance_m)

  return (
    <article
      className={`pharmacy-card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(p.pharmacy_id)}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(p.pharmacy_id)}
    >
      <div className="pc-header">
        <h2 className="pc-name">{p.pharmacy_name}</h2>
        <span className="badge badge-dist">{dist}</span>
      </div>

      <p className="pc-address" title={p.address}>{p.address}</p>
      <p className="pc-hours">
        <span className="hours-dot" aria-hidden="true" />
        {p.open_hours}
      </p>

      <ul className="med-rows" aria-label="Available medicines">
        {p.medicines.slice(0, 3).map((m) => {
          const cartItem = cartItems?.find(i => i.medicine_id === m.medicine_id)
          const inCart   = !!cartItem

          return (
            <li key={m.medicine_id} className="med-row">
              <span className="med-row-name" title={m.name}>{m.name}</span>
              <div className="med-row-right">
                {m.prescription && <span className="badge badge-rx">Rx</span>}
                <StockBadge qty={m.quantity} />
                <span className="med-price">{formatPrice(m.price)}</span>
                {inCart ? (
                  <QuantityStepper
                    qty={cartItem.quantity}
                    maxQty={m.quantity}
                    onMinus={(e) => { e.stopPropagation(); onAddToCart(p, m, cartItem.quantity - 1) }}
                    onPlus={(e)  => { e.stopPropagation(); onAddToCart(p, m, cartItem.quantity + 1) }}
                  />
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={(e) => { e.stopPropagation(); onAddToCart(p, m, 1) }}
                    aria-label={`Add ${m.name} to cart`}
                  >
                    Add
                  </button>
                )}
              </div>
            </li>
          )
        })}
        {p.medicines.length > 3 && (
          <li style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 10px' }}>
            +{p.medicines.length - 3} more medicines
          </li>
        )}
      </ul>
    </article>
  )
}
