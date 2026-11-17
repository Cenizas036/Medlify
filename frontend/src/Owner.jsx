import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Truck, PackageCheck, AlertTriangle, Bell, ClipboardList, Boxes, Phone, MapPin } from 'lucide-react'
import MedThumb from './MedThumb.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CATS = [['pain-relief', 'Pain Relief'], ['diabetes-care', 'Diabetes Care'], ['allergy-care', 'Allergy Care'], ['digestive-health', 'Digestive Health'], ['vitamins-supplements', 'Vitamins & Supplements'], ['first-aid', 'First Aid']]
const FORMS = [['tablet', 'Tablet'], ['capsule', 'Capsule'], ['syrup', 'Syrup / liquid'], ['cream', 'Cream / ointment'], ['injection', 'Injection'], ['sachet', 'Sachet / powder']]
const box = { padding: '9px 10px', borderRadius: 10, border: '1px solid #DCE9E2', font: 'inherit', background: 'rgba(255,255,255,.8)' }

function Claim({ call, onDone }) {
  const [q, setQ] = useState(''), [list, setList] = useState([]), [err, setErr] = useState('')
  const [lic, setLic] = useState(''), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => call('/api/owner/unclaimed?q=' + encodeURIComponent(q.trim())).then(setList).catch(e => setErr(e.message)), 250)
    return () => clearTimeout(t)
  }, [q])
  const licOk = /^[A-Za-z0-9\/\- ]{5,30}$/.test(lic.trim())
  const claim = async p => {
    setBusy(true); setErr('')
    try { await call('/api/owner/claim', 'POST', { pharmacy_id: p.id, licence_no: lic.trim() }); onDone() } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  return (
    <div>
      <h1 style={{ marginTop: 16 }}>Select your pharmacy</h1>
      <p className="sub">Enter your drug licence number, then pick your pharmacy from the list.</p>
      <div className="note">Prototype: licence numbers are recorded but not verified yet. A real launch needs a licence check and admin approval.</div>
      <input style={{ ...box, width: '100%', margin: '12px 0 8px' }} placeholder="Drug licence number" value={lic} onChange={e => setLic(e.target.value)} />
      <label style={{ fontSize: 13, display: 'flex', gap: 8, margin: '4px 0 12px' }}><input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={agree} onChange={e => setAgree(e.target.checked)} />I am authorised to manage this pharmacy.</label>
      <input style={{ ...box, width: '100%', marginBottom: 12 }} placeholder="Search by pharmacy name or area…" value={q} onChange={e => setQ(e.target.value)} />
      {err && <div className="err" style={{ padding: 12, marginBottom: 10 }}>{err}</div>}
      {list.length === 0 && !err && <div className="empty" style={{ padding: 22 }}>No unclaimed pharmacies match.</div>}
      <div className="dx-list">
        {list.map(p => (
          <div className="dx-med" key={p.id}>
            <div className="dx-info"><b>{p.name}</b><small>{p.address}</small></div>
            <button className="btn pri sm" disabled={!licOk || !agree || busy} onClick={() => claim(p)}>This is my pharmacy</button>
          </div>))}
      </div>
      {(!licOk || !agree) && <p className="sub" style={{ fontSize: 12 }}>Enter a licence number and tick the box to enable the buttons.</p>}
    </div>
  )
}

function AddStock({ call, have, onAdded }) {
  const [tab, setTab] = useState('existing')
  const [q, setQ] = useState(''), [sugs, setSugs] = useState([]), [pick, setPick] = useState(null)
  const [qty, setQty] = useState(''), [price, setPrice] = useState('')
  const blank = { name: '', generic_name: '', requires_prescription: true, category: '', form: '' }
  const [nm, setNm] = useState(blank), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    if (tab !== 'existing' || q.trim().length < 2 || pick) { setSugs([]); return }
    const t = setTimeout(() => fetch(API + '/api/search/medicines?q=' + encodeURIComponent(q.trim())).then(r => r.json()).then(d => setSugs(Array.isArray(d) ? d : [])).catch(() => setSugs([])), 250)
    return () => clearTimeout(t)
  }, [q, tab, pick])
  const stockOk = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0 && Number(price) > 0
  const ready = stockOk && (tab === 'existing' ? !!pick : nm.name.trim().length >= 2)
  async function submit() {
    setBusy(true); setErr('')
    try {
      if (tab === 'existing') await call('/api/owner/inventory/' + pick.id, 'PUT', { quantity: Number(qty), price: Number(price) })
      else await call('/api/owner/medicines', 'POST', { ...nm, quantity: Number(qty), price: Number(price) })
      setQ(''); setPick(null); setQty(''); setPrice(''); setNm(blank); onAdded()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const full = { ...box, width: '100%', marginBottom: 8 }
  return (
    <div className="dx-cab">
      <h3>Add a medicine to your stock</h3>
      <div className="tabs" style={{ margin: '12px 0' }}>
        <button style={{ flex: 1 }} className={tab === 'existing' ? 'on' : ''} onClick={() => { setTab('existing'); setErr('') }}>Search catalogue</button>
        <button style={{ flex: 1 }} className={tab === 'new' ? 'on' : ''} onClick={() => { setTab('new'); setErr('') }}>Not listed? Add new</button>
      </div>
      {tab === 'existing' ? (
        <>
          {pick
            ? <div className="addr on" style={{ marginBottom: 8 }}><span><b>{pick.name}</b><br /><small>{pick.generic_name}</small></span><button className="btn sm" onClick={() => { setPick(null); setQ('') }}>Change</button></div>
            : <input style={full} placeholder="Search a medicine, e.g. Paracetamol…" value={q} onChange={e => setQ(e.target.value)} />}
          {sugs.map(s => (
            <button type="button" key={s.id} className="addr" style={{ marginBottom: 6, opacity: have.has(s.id) ? .55 : 1 }} disabled={have.has(s.id)} onClick={() => { setPick(s); setSugs([]) }}>
              <span><b>{s.name}</b><br /><small>{s.generic_name}</small></span>{have.has(s.id) && <span className="badge ok">Already in your list</span>}
            </button>))}
        </>
      ) : (
        <>
          <input style={full} placeholder="Medicine name and strength, e.g. Azithromycin 250mg" value={nm.name} onChange={e => setNm({ ...nm, name: e.target.value })} />
          <input style={full} placeholder="Generic / salt name (optional)" value={nm.generic_name} onChange={e => setNm({ ...nm, generic_name: e.target.value })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select style={{ ...box, flex: 1, minWidth: 160 }} value={nm.category} onChange={e => setNm({ ...nm, category: e.target.value })}><option value="">Category (optional)</option>{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select style={{ ...box, flex: 1, minWidth: 160 }} value={nm.form} onChange={e => setNm({ ...nm, form: e.target.value })}><option value="">Form (optional)</option>{FORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <label style={{ fontSize: 13, display: 'flex', gap: 8, margin: '10px 0' }}><input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={nm.requires_prescription} onChange={e => setNm({ ...nm, requires_prescription: e.target.checked })} />Prescription required (untick only for over-the-counter medicines)</label>
        </>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
        <label style={{ display: 'grid', gap: 3, fontSize: 11, opacity: .8 }}>Quantity in stock<input style={{ ...box, width: 120 }} type="number" min="0" step="1" placeholder="e.g. 50" value={qty} onChange={e => setQty(e.target.value)} /></label>
        <label style={{ display: 'grid', gap: 3, fontSize: 11, opacity: .8 }}>Price per unit (₹)<input style={{ ...box, width: 120 }} type="number" min="0.01" step="0.01" placeholder="e.g. 25" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <button className="btn pri sm" disabled={!ready || busy} onClick={submit}><Plus size={14} />{busy ? 'Adding…' : 'Add to stock'}</button>
      </div>
      {err && <p className="sub" style={{ color: '#D64545', fontSize: 12, marginTop: 8 }}>{err}</p>}
    </div>
  )
}

const inr = n => '₹' + Number(n).toFixed(2).replace(/\.00$/, '')
const ago = t => { const s = Math.max(0, (Date.now() - new Date(t)) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : new Date(t).toLocaleDateString('en-IN') }
const STATUS = { placed: ['New', 'low'], accepted: ['Accepted', 'ok'], out_for_delivery: ['Out for delivery', 'ok'], delivered: ['Delivered', 'ok'], cancelled: ['Cancelled', 'rx'] }
const NEXT = { placed: ['accepted', 'Accept order'], accepted: ['out_for_delivery', 'Send out for delivery'], out_for_delivery: ['delivered', 'Mark delivered'] }

// One-click restock button, or "on its way" once ordered
function Restock({ m, call, onOrdered, delay }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  if (m.pending_restock) {
    const left = Math.max(0, Math.ceil(delay - (Date.now() - new Date(m.pending_restock.created_at)) / 1000))
    return <span className="badge ok" title={m.pending_restock.supplier}><Truck size={11} style={{ verticalAlign: -1 }} /> {m.pending_restock.quantity} arriving {left > 0 ? `in ~${left}s` : 'now'}</span>
  }
  const go = async () => { setBusy(true); setErr(''); try { await call('/api/owner/restock/' + m.medicine_id, 'POST', { quantity: 50 }); onOrdered() } catch (e) { setErr(e.message) } setBusy(false) }
  return <><button className="btn pri sm" disabled={busy} onClick={go}><Truck size={14} />{busy ? 'Ordering…' : 'Order 50 from supplier'}</button>{err && <small style={{ color: '#D64545' }}>{err}</small>}</>
}

function RestockAlert({ inv, low, call, onOrdered, delay }) {
  const need = inv.filter(m => m.quantity <= low).sort((a, b) => a.quantity - b.quantity)
  if (!need.length) return <div className="own-ok"><PackageCheck size={18} />All medicines are well stocked.</div>
  const out = need.filter(m => m.quantity === 0).length
  return (
    <div className="own-alert">
      <h3><AlertTriangle size={18} />{out ? `${out} out of stock` : ''}{out && need.length > out ? ' · ' : ''}{need.length > out ? `${need.length - out} running low` : ''}: reorder from your supplier</h3>
      <div className="dx-list">
        {need.map(m => (
          <div className={'dx-med ' + (m.quantity === 0 ? 'own-out' : 'own-low')} key={m.medicine_id}>
            <div className="dx-info"><b>{m.name}</b><small>{m.quantity === 0 ? `${m.name} isn't available. Customers can't see or order it.` : `Only ${m.quantity} left.`}</small></div>
            <div className="dx-actions"><Restock m={m} call={call} onOrdered={onOrdered} delay={delay} /></div>
          </div>))}
      </div>
    </div>
  )
}

function Row({ m, call, onSaved, onRemoved, low, onOrdered, delay }) {
  const [qty, setQty] = useState(String(m.quantity)), [price, setPrice] = useState(String(Number(m.price)))
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  // Keep the fields in step when stock changes elsewhere (orders, deliveries), unless the pharmacist is mid-edit
  const [base, setBase] = useState(m.quantity)
  useEffect(() => { if (qty === String(base)) setQty(String(m.quantity)); setBase(m.quantity) }, [m.quantity])
  const dirty = qty !== String(m.quantity) || Number(price) !== Number(m.price)
  const ok = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0 && Number(price) > 0
  async function save() {
    setBusy(true); setErr('')
    try {
      const u = await call('/api/owner/inventory/' + m.medicine_id, 'PUT', { quantity: Number(qty), price: Number(price) })
      setQty(String(u.quantity)); setPrice(String(Number(u.price))); onSaved(u)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  async function del() {
    if (!confirm(`Remove ${m.name} from your stock list?`)) return
    try { await call('/api/owner/inventory/' + m.medicine_id, 'DELETE'); onRemoved(m.medicine_id) } catch (e) { setErr(e.message) }
  }
  return (
    <div className={'dx-med ' + (m.quantity === 0 ? 'own-out' : m.quantity <= low ? 'own-low' : '')}>
      <MedThumb name={m.name} form={m.form} />
      <div className="dx-info">
        <b>{m.name}</b><small>{m.generic_name}</small>
        <div className="meta" style={{ marginTop: 6 }}>
          {m.requires_prescription && <span className="badge rx">Rx</span>}
          {m.quantity === 0 ? <span className="badge rx">Out of stock: hidden from customers</span> : m.quantity <= low ? <span className="badge low">Low stock</span> : <span className="badge ok">Live</span>}
        </div>
        {m.quantity <= low && <div style={{ marginTop: 8 }}><Restock m={m} call={call} onOrdered={onOrdered} delay={delay} /></div>}
        {err && <small style={{ color: '#D64545' }}>{err}</small>}
      </div>
      <div className="dx-actions">
        <label style={{ display: 'grid', gap: 3, fontSize: 11, opacity: .8 }}>Quantity in stock<input style={{ ...box, width: 100 }} type="number" min="0" step="1" value={qty} onChange={e => setQty(e.target.value)} /></label>
        <label style={{ display: 'grid', gap: 3, fontSize: 11, opacity: .8 }}>Price per unit (₹)<input style={{ ...box, width: 110 }} type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <button className="btn pri sm" disabled={!dirty || !ok || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn sm" aria-label={'Remove ' + m.name} onClick={del}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

function OrderCard({ o, call, onChanged, fresh }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = async to => { setBusy(true); setErr(''); try { await call(`/api/owner/orders/${o.id}/status`, 'POST', { status: to }); await onChanged() } catch (e) { setErr(e.message) } setBusy(false) }
  const [label, tone] = STATUS[o.status] || [o.status, 'ok']
  return (
    <div className={'own-order' + (o.status === 'placed' ? ' own-new' : '') + (fresh ? ' own-fresh' : '')}>
      <div className="own-order-top">
        <div><b>Order #{o.id}</b> · {o.customer_name || 'Customer'} <small className="sub">· {ago(o.created_at)}</small></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{fresh && <span className="badge low">Just in</span>}<span className={'badge ' + tone}>{label}</span><b>{inr(o.total)}</b></div>
      </div>
      <div className="own-items">{o.items.map((i, k) => <span key={k}>{i.name} × {i.quantity}</span>)}</div>
      <small className="sub"><Phone size={11} style={{ verticalAlign: -1 }} /> {o.customer_phone || '—'} · <MapPin size={11} style={{ verticalAlign: -1 }} /> {o.delivery_address}{o.is_sample ? ' · sample order' : ''}</small>
      {(NEXT[o.status] || ['placed', 'accepted'].includes(o.status)) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {NEXT[o.status] && <button className="btn pri sm" disabled={busy} onClick={() => set(NEXT[o.status][0])}>{NEXT[o.status][1]}</button>}
          {['placed', 'accepted'].includes(o.status) && <button className="btn sm" disabled={busy} onClick={() => confirm(`Cancel order #${o.id}? Its medicines go back into stock.`) && set('cancelled')}>Cancel</button>}
        </div>)}
      {err && <small style={{ color: '#D64545' }}>{err}</small>}
    </div>
  )
}

function OrdersPanel({ orders, call, reload, seen }) {
  const [f, setF] = useState('active')
  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const shown = f === 'active' ? active : f === 'done' ? orders.filter(o => ['delivered', 'cancelled'].includes(o.status)) : orders
  return (
    <div className="dx-cab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3>Customer orders</h3>
        <div className="tabs">
          <button className={f === 'active' ? 'on' : ''} onClick={() => setF('active')}>To handle ({active.length})</button>
          <button className={f === 'done' ? 'on' : ''} onClick={() => setF('done')}>Completed</button>
          <button className={f === 'all' ? 'on' : ''} onClick={() => setF('all')}>All</button>
        </div>
      </div>
      <p className="sub" style={{ fontSize: 13 }}>Updates live. Sample customers place a new order about once a minute, and taking an order reduces your stock.</p>
      {shown.length === 0 && <div className="empty" style={{ padding: 22 }}>{f === 'active' ? 'No orders waiting. New ones appear here automatically.' : 'Nothing here yet.'}</div>}
      <div style={{ display: 'grid', gap: 10 }}>{shown.map(o => <OrderCard key={o.id} o={o} call={call} onChanged={reload} fresh={!!seen.current && !seen.current.has(o.id) && o.status === 'placed'} />)}</div>
    </div>
  )
}

function SupplierPanel({ call, tick }) {
  const [list, setList] = useState(null)
  useEffect(() => { call('/api/owner/supplier-orders').then(setList).catch(() => setList([])) }, [tick])
  return (
    <div className="dx-cab">
      <h3>Supplier orders</h3>
      <p className="sub" style={{ fontSize: 13 }}>Restocks you ordered. In this demo a delivery arrives about 40 seconds after ordering and is added to your stock automatically.</p>
      {list === null && <div className="skel" />}
      {list && list.length === 0 && <div className="empty" style={{ padding: 22 }}>No supplier orders yet. Use "Order 50 from supplier" on any low or out-of-stock medicine.</div>}
      <div className="dx-list">
        {(list || []).map(s => (
          <div className="dx-med" key={s.id}>
            <div className="dx-info"><b>{s.name} × {s.quantity}</b><small>{s.supplier} · {inr(s.unit_cost)}/unit · {inr(s.unit_cost * s.quantity)} total · ordered {ago(s.created_at)}</small></div>
            <div className="dx-actions">{s.status === 'delivered' ? <span className="badge ok"><PackageCheck size={11} style={{ verticalAlign: -1 }} /> Delivered, added to stock</span> : <span className="badge low"><Truck size={11} style={{ verticalAlign: -1 }} /> On its way</span>}</div>
          </div>))}
      </div>
    </div>
  )
}

export default function Owner({ auth }) {
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + auth.token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(d.error || 'Request failed'); e.status = r.status; throw e }
    return d
  }
  const [data, setData] = useState(null), [state, setState] = useState('loading'), [err, setErr] = useState(''), [f, setF] = useState('')
  const [orders, setOrders] = useState([]), [tab, setTab] = useState('orders'), [tick, setTick] = useState(0), [toast, setToast] = useState('')
  const seen = useRef(null)
  const load = () => call('/api/owner/pharmacy').then(d => { setData(d); setState('ready') }).catch(e => { if (e.status === 404) setState('claim'); else { setErr(e.message); setState('error') } })
  const loadOrders = () => call('/api/owner/orders').then(list => {
    setOrders(prev => {
      const known = new Set(prev.map(o => o.id))
      const fresh = prev.length ? list.filter(o => !known.has(o.id) && o.status === 'placed') : []
      if (fresh.length) setToast(fresh.length === 1 ? `New order #${fresh[0].id} from ${fresh[0].customer_name}` : `${fresh.length} new orders`)
      if (!seen.current) seen.current = new Set(list.map(o => o.id))   // first load: nothing is "just in"
      return list
    })
  }).catch(() => {})
  const refresh = () => Promise.all([load(), loadOrders()]).then(() => setTick(t => t + 1))
  useEffect(() => { refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t) }, [toast])
  // A ticking clock so "arriving in ~Ns" counts down between refreshes
  const [, setNow] = useState(0); useEffect(() => { const t = setInterval(() => setNow(n => n + 1), 1000); return () => clearInterval(t) }, [])

  const inv = data?.inventory || [], low = data?.low_stock ?? 10, delay = data?.supplier_delay_s ?? 40
  // Out-of-stock first, then low stock, then the rest alphabetically
  const rank = m => (m.quantity === 0 ? 0 : m.quantity <= low ? 1 : 2)
  const shown = inv.filter(m => (m.name + ' ' + (m.generic_name || '')).toLowerCase().includes(f.toLowerCase())).sort((a, b) => rank(a) - rank(b))
  const live = inv.filter(m => m.quantity > 0).length, lowN = inv.filter(m => m.quantity > 0 && m.quantity <= low).length, outN = inv.filter(m => m.quantity === 0).length
  const saved = u => setData(d => ({ ...d, inventory: d.inventory.map(x => x.medicine_id === u.medicine_id ? { ...x, quantity: u.quantity, price: u.price } : x) }))
  const removed = id => setData(d => ({ ...d, inventory: d.inventory.filter(x => x.medicine_id !== id) }))
  const today = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled')
  const pending = orders.filter(o => o.status === 'placed').length
  return (
    <div style={{ marginTop: 28 }}>
      {toast && <div className="own-toast"><Bell size={16} />{toast}</div>}
      {state === 'loading' && <div className="skel" style={{ marginTop: 16 }} />}
      {state === 'error' && <div className="err" style={{ marginTop: 16 }}>{err}</div>}
      {state === 'claim' && <Claim call={call} onDone={refresh} />}
      {state === 'ready' && data && (
        <>
          <h1 style={{ marginTop: 0 }}>{data.pharmacy.name}</h1>
          <p className="sub">{data.pharmacy.address}</p>
          {data.pharmacy.drug_licence_no && <p style={{ margin: '4px 0 10px', fontSize: 14 }}>Drug licence no. <b>{data.pharmacy.drug_licence_no}</b> <span className="badge low">Recorded, not yet verified</span></p>}
          <div className="own-stats">
            <div><small>New orders</small><b>{pending}</b></div>
            <div><small>Orders today</small><b>{today.length}</b></div>
            <div><small>Sales today</small><b>{inr(today.reduce((s, o) => s + Number(o.total), 0))}</b></div>
            <div className={outN ? 'bad' : ''}><small>Out of stock</small><b>{outN}</b></div>
          </div>
          <RestockAlert inv={inv} low={low} call={call} onOrdered={refresh} delay={delay} />
          <div className="tabs" style={{ margin: '18px 0 0' }}>
            <button style={{ flex: 1 }} className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}><ClipboardList size={14} style={{ marginRight: 6 }} />Orders{pending ? ` (${pending} new)` : ''}</button>
            <button style={{ flex: 1 }} className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}><Boxes size={14} style={{ marginRight: 6 }} />Stock ({inv.length})</button>
            <button style={{ flex: 1 }} className={tab === 'supplier' ? 'on' : ''} onClick={() => setTab('supplier')}><Truck size={14} style={{ marginRight: 6 }} />Supplier orders</button>
          </div>
          {tab === 'orders' && <OrdersPanel orders={orders} call={call} reload={refresh} seen={seen} />}
          {tab === 'supplier' && <SupplierPanel call={call} tick={tick} />}
          {tab === 'stock' && <>
            <div className="dx-chips" style={{ margin: '12px 0 0' }}>
              <span className="badge ok">{live} live</span><span className="badge low">{lowN} low stock</span><span className="badge rx">{outN} out of stock</span>
            </div>
            <AddStock call={call} have={new Set(inv.map(m => m.medicine_id))} onAdded={load} />
            <div className="dx-cab">
              <h3>Your stock ({inv.length})</h3>
              <input style={{ ...box, width: '100%', margin: '10px 0' }} placeholder="Filter your medicines…" value={f} onChange={e => setF(e.target.value)} />
              {inv.length === 0 && <div className="empty" style={{ padding: 22 }}>No medicines yet. Add your first one above.</div>}
              <div className="dx-list">{shown.map(m => <Row key={m.medicine_id} m={m} call={call} onSaved={saved} onRemoved={removed} low={low} onOrdered={refresh} delay={delay} />)}</div>
            </div>
          </>}
          <p className="sub" style={{ fontSize: 12, marginTop: 14 }}>Demo data: sample customers, stock and suppliers are simulated.</p>
        </>
      )}
    </div>
  )
}
