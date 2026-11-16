import { useState } from 'react'
import { ShoppingBag, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { formatPrice } from '../../lib/format'
import { api, ApiError } from '../../lib/api'

function validate(form) {
  const e = {}
  if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name is required'
  if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit Indian mobile number'
  if (!form.address.trim() || form.address.trim().length < 10) e.address = 'Address must be at least 10 characters'
  return e
}

function QuantityStepper({ qty, maxQty, onChange }) {
  return (
    <div className="qty-stepper">
      <button className="qty-btn" onClick={() => onChange(qty - 1)} disabled={qty <= 1} aria-label="Decrease">
        −
      </button>
      <span className="qty-val">{qty}</span>
      <button className="qty-btn" onClick={() => onChange(qty + 1)} disabled={qty >= maxQty} aria-label="Increase">
        +
      </button>
    </div>
  )
}

export default function CartView({ cart, updateQty, removeItem, clearPharmacy, grandTotal, onOrderPlaced }) {
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('medlify_form') || '{}')
      return { name: saved.name || '', phone: saved.phone || '', address: saved.address || '' }
    } catch { return { name: '', phone: '', address: '' } }
  })
  const [errors,   setErrors]   = useState({})
  const [rxAck,    setRxAck]    = useState(false)
  const [submitting, setSubmitting] = useState({}) // { pharmacyId: bool }
  const [submitError, setSubmitError] = useState({})
  const [successOrders, setSuccessOrders] = useState([])

  const groups  = Object.entries(cart)
  const hasRx   = groups.some(([, g]) => g.items.some(i => i.prescription))

  if (groups.length === 0) {
    return (
      <div className="panel-body">
        <div className="state-box">
          <div className="state-icon-wrap"><ShoppingBag size={28} /></div>
          <p className="state-title">Your cart is empty</p>
          <p className="state-desc">Search a medicine and add items from nearby pharmacies.</p>
        </div>
      </div>
    )
  }

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const placeOrder = async (pharmacyId, group) => {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (hasRx && !rxAck) { setErrors(e => ({ ...e, rx: 'Please acknowledge the prescription requirement' })); return }

    // Save form for prefill
    localStorage.setItem('medlify_form', JSON.stringify({ name: form.name, phone: form.phone, address: form.address }))

    setSubmitting(s => ({ ...s, [pharmacyId]: true }))
    setSubmitError(e => ({ ...e, [pharmacyId]: null }))

    try {
      const result = await api.createOrder({
        pharmacy_id:      Number(pharmacyId),
        items:            group.items.map(i => ({ medicine_id: i.medicine_id, quantity: i.quantity })),
        delivery_address: form.address.trim(),
        customer_name:    form.name.trim(),
        customer_phone:   form.phone.trim(),
      })

      clearPharmacy(pharmacyId)
      setSuccessOrders(prev => [...prev, result])
      onOrderPlaced(result)
    } catch (err) {
      let msg = err.message
      if (err instanceof ApiError && err.status === 409) {
        msg = `${err.message} Please reduce quantity.`
      }
      setSubmitError(e => ({ ...e, [pharmacyId]: msg }))
    } finally {
      setSubmitting(s => ({ ...s, [pharmacyId]: false }))
    }
  }

  return (
    <div className="panel-body">
      <div className="cart-container">
        <h2 className="cart-title">Your cart</h2>

        {groups.map(([pharmacyId, group]) => {
          const subtotal = group.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
          return (
            <div key={pharmacyId} className="cart-pharmacy-group">
              <div className="cart-ph-header">
                <ShoppingBag size={14} />
                {group.pharmacyName}
              </div>

              <div className="cart-items">
                {group.items.map(item => (
                  <div key={item.medicine_id} className="cart-item">
                    <div className="cart-item-name">
                      {item.name}
                      {item.prescription && <span className="badge badge-rx" style={{ marginLeft: 4 }}>Rx</span>}
                    </div>
                    <QuantityStepper
                      qty={item.quantity}
                      maxQty={item.maxQty || 999}
                      onChange={qty => qty < 1
                        ? removeItem(pharmacyId, item.medicine_id)
                        : updateQty(pharmacyId, item.medicine_id, qty)
                      }
                    />
                    <span className="cart-item-price">{formatPrice(Number(item.price) * item.quantity)}</span>
                    <button
                      className="cart-remove"
                      onClick={() => removeItem(pharmacyId, item.medicine_id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-ph-footer">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              {submitError[pharmacyId] && (
                <div className="inline-alert error" style={{ margin: '0 14px 10px' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  {submitError[pharmacyId]}
                </div>
              )}

              <div style={{ padding: '0 14px 14px' }}>
                <button
                  className="btn btn-md btn-primary btn-full"
                  onClick={() => placeOrder(pharmacyId, group)}
                  disabled={!!submitting[pharmacyId]}
                >
                  {submitting[pharmacyId] ? 'Placing order…' : `Place order — ${formatPrice(subtotal)}`}
                </button>
              </div>
            </div>
          )
        })}

        <div className="grand-total">
          <span className="grand-total-label">Grand total</span>
          <span className="grand-total-val">{formatPrice(grandTotal)}</span>
        </div>

        {/* Checkout form */}
        <div className="cart-pharmacy-group">
          <div className="cart-ph-header">Delivery details</div>
          <div style={{ padding: '12px 14px' }}>
            <div className="checkout-form">
              <div className="form-field">
                <label className="form-label" htmlFor="cf-name">Your name *</label>
                <input
                  id="cf-name"
                  className={`form-input${errors.name ? ' error' : ''}`}
                  value={form.name}
                  onChange={e => handleField('name', e.target.value)}
                  autoComplete="name"
                  placeholder="Full name"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cf-phone">Mobile number *</label>
                <input
                  id="cf-phone"
                  className={`form-input${errors.phone ? ' error' : ''}`}
                  value={form.phone}
                  onChange={e => handleField('phone', e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  maxLength={10}
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cf-addr">Delivery address *</label>
                <textarea
                  id="cf-addr"
                  className={`form-input form-textarea${errors.address ? ' error' : ''}`}
                  value={form.address}
                  onChange={e => handleField('address', e.target.value)}
                  autoComplete="street-address"
                  placeholder="House/flat, street, city, PIN"
                  rows={3}
                />
                {errors.address && <span className="form-error">{errors.address}</span>}
              </div>

              {hasRx && (
                <>
                  <div className="rx-notice">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Prescription required. A valid prescription must be provided at delivery for Rx items.</span>
                  </div>
                  <label className="rx-ack">
                    <input
                      type="checkbox"
                      checked={rxAck}
                      onChange={e => { setRxAck(e.target.checked); setErrors(er => ({ ...er, rx: null })) }}
                    />
                    I understand a prescription will be required on delivery
                  </label>
                  {errors.rx && <span className="form-error">{errors.rx}</span>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
