import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import Discover from './Discover.jsx'
import AuthPage from './AuthPage.jsx'
import Profile from './Profile.jsx'
import Owner from './Owner.jsx'
import PharmacyAuth from './PharmacyAuth.jsx'
import { AddressForm, DeliverTo } from './Addresses.jsx'
import { Search, MapPin, Clock, Truck, X, ShoppingCart, Plus, Minus, List, LayoutGrid, Pill, Cross, Package, User } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const BBSR = { lat: 20.2961, lng: 85.8245 }
const PER_PAGE = 6
const inr = n => '₹' + Number(n).toFixed(2).replace(/\.00$/, '')
const dist = m => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)
const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f } catch { return f } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

let TOKEN = load('medlify_auth', null)?.token || null
const setToken = t => { TOKEN = t }
async function api(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { ...opts.headers, ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) } })
  const d = await r.json().catch(() => ({}))
  if (r.status === 401 && TOKEN) window.dispatchEvent(new Event('medlify-logout'))
  if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')')
  return d
}
const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })

const pinIcon = sel => L.divIcon({
  className: '', iconSize: [34, 34], iconAnchor: [17, 17],
  html: `<div class="pin ${sel ? 'is-selected' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>${sel ? '<span class="pin-label">Picked</span>' : ''}</div>`,
})
const userIcon = L.divIcon({ className: '', iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="user-dot"></div>' })

function Fit({ items, center }) {
  const map = useMap()
  useEffect(() => {
    if (items.length) {
      const b = L.latLngBounds(items.map(p => [p.lat, p.lng]))
      b.extend([center.lat, center.lng])
      map.fitBounds(b, { padding: [40, 40], maxZoom: 15 })
    } else map.setView([center.lat, center.lng], 13)
  }, [items, center, map])
  return null
}
function Fly({ p }) {
  const map = useMap()
  useEffect(() => { if (p) map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 14), { duration: 0.6 }) }, [p, map])
  return null
}

function StockBadge({ q }) {
  return q <= 10 ? <span className="badge low">Only {q} left</span> : <span className="badge ok">In stock</span>
}

/* ---------- Pharmacy drawer ---------- */
function PharmacyDrawer({ ph, user, onClose, onAdd }) {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [f, setF] = useState('')
  useEffect(() => { api('/api/pharmacies/' + ph.id).then(setD).catch(e => setErr(e.message)) }, [ph.id])
  const inv = (d?.inventory || []).filter(m => (m.name + m.generic_name).toLowerCase().includes(f.toLowerCase()))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>{ph.name}</h2><button className="btn sm" onClick={onClose}><X size={16} /></button></div>
        <p className="sub">{ph.address}</p>
        <div className="meta" style={{ marginBottom: 12 }}>
          <span><Clock size={14} />{ph.hours}</span><span><MapPin size={14} />{dist(ph.dist)} away</span>
          {ph.phone && <a href={'tel:' + ph.phone}>{ph.phone}</a>}
        </div>
        <a className="btn pri sm" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?from=${user.lat},${user.lng}&to=${ph.lat},${ph.lng}`}>Directions</a>
        <input className="form" placeholder="Filter medicines…" value={f} onChange={e => setF(e.target.value)} style={{ width: '100%', margin: '14px 0 6px', border: 0, background: '#F1F4F6', borderRadius: 12, padding: 12, font: 'inherit' }} />
        {err && <div className="err">{err}</div>}
        {!d && !err && <div className="skel" />}
        {inv.map(m => (
          <div className="line" key={m.medicine_id}>
            <b>{m.name}<br /><small style={{ color: '#5B6675', fontWeight: 400 }}>{m.generic_name}</small></b>
            {m.requires_prescription && <span className="badge rx">Rx</span>}
            <StockBadge q={m.quantity} /><span>{inr(m.price)}</span>
            <button className="btn pri sm" onClick={() => onAdd(ph, { mid: m.medicine_id, name: m.name, price: Number(m.price), max: m.quantity, rx: m.requires_prescription })}>Add</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Cart drawer ---------- */
function CartDrawer({ cart, setCart, onClose, onOrdered, user, goLogin, addrs, addrId, setAddrId, onSaveAddr }) {
  const [rx, setRx] = useState(false), [busy, setBusy] = useState(false), [msgs, setMsgs] = useState([]), [problem, setProblem] = useState(null)
  const [form, setForm] = useState(null)
  const groups = useMemo(() => {
    const g = {}
    cart.forEach(i => { (g[i.pid] = g[i.pid] || { pid: i.pid, pname: i.pname, items: [] }).items.push(i) })
    return Object.values(g)
  }, [cart])
  const addr = addrs.find(a => a.id === addrId)
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const hasRx = cart.some(i => i.rx)
  const change = (i, d) => setCart(c => c.map(x => x.pid === i.pid && x.mid === i.mid ? { ...x, qty: Math.max(1, Math.min(x.max, x.qty + d)) } : x))
  const remove = i => setCart(c => c.filter(x => !(x.pid === i.pid && x.mid === i.mid)))

  async function place() {
    setMsgs([])
    if (!user) return setProblem({ t: 'Log in to place an order.', label: 'Log in', go: goLogin })
    if (!addr) { setForm(f => f || 'self'); return setProblem({ t: 'Delivery address must be specified. Add one below.' }) }
    if (hasRx && !rx) return setProblem({ t: 'Tick the prescription box to continue.' })
    setProblem(null); setBusy(true)
    const out = [], doneIds = [], donePids = []
    for (const g of groups) {
      try {
        const o = await post('/api/orders', {
          pharmacy_id: g.pid, delivery_address: addr.address, customer_name: addr.recipient_name, customer_phone: addr.recipient_phone,
          items: g.items.map(i => ({ medicine_id: i.mid, quantity: i.qty })),
        })
        doneIds.push(o.id); donePids.push(g.pid)
        out.push({ ok: true, t: `Order #${o.id} placed with ${g.pname} (${inr(o.total)})` })
      } catch (e) { out.push({ ok: false, t: `${g.pname}: ${e.message}` }) }
    }
    if (doneIds.length) {
      setCart(c => c.filter(i => !donePids.includes(i.pid)))
      onOrdered(doneIds, out.every(o => o.ok))
    }
    setMsgs(out); setBusy(false)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Your cart</h2><button className="btn sm" onClick={onClose}><X size={16} /></button></div>
        {msgs.map((m, i) => <div key={i} className={m.ok ? 'good' : 'note'}>{m.t}</div>)}
        {cart.length === 0 && <div className="empty">Your cart is empty.</div>}
        {groups.map(g => (
          <div key={g.pid} style={{ marginTop: 14 }}>
            <b>{g.pname}</b>
            {g.items.map(i => (
              <div className="line" key={i.mid}>
                <b>{i.name}<br /><small style={{ color: '#5B6675', fontWeight: 400 }}>{inr(i.price)} each</small></b>
                <div className="step"><button onClick={() => change(i, -1)}><Minus size={14} /></button>{i.qty}<button onClick={() => change(i, 1)}><Plus size={14} /></button></div>
                <span>{inr(i.price * i.qty)}</span>
                <button className="btn sm" onClick={() => remove(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        ))}
        {cart.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 18 }}>Total: {inr(total)}</p>
            {groups.length > 1 && <div className="note">Items from {groups.length} pharmacies will be placed as {groups.length} separate orders.</div>}
            {user ? (
              <div style={{ marginTop: 10 }}>
                <b>Deliver to</b>
                {addrs.map(a => (
                  <button type="button" key={a.id} className={'addr' + (a.id === addrId ? ' on' : '')} style={{ marginTop: 8 }} onClick={() => { setAddrId(a.id); setProblem(null) }}>
                    <span><b>{a.label}{!a.is_self && ' · for ' + a.recipient_name}</b><br /><small>{a.recipient_name} · {a.recipient_phone}</small><br /><small>{a.address}</small></span>
                    {a.id === addrId && <span className="badge ok">Selected</span>}
                  </button>))}
                {form
                  ? <AddressForm user={user} defaultForOther={form === 'other'} onCancel={() => setForm(null)} onSubmit={async p => { const a = await onSaveAddr(p); setAddrId(a.id); setForm(null); setProblem(null) }} />
                  : <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="btn sm" onClick={() => setForm('other')}>Order for someone else</button>
                      <button type="button" className="btn sm" onClick={() => setForm('self')}>+ Add address</button>
                    </div>}
              </div>
            ) : <p className="sub" style={{ fontSize: 13 }}>Log in to choose a delivery address.</p>}
            {hasRx && <label style={{ fontSize: 13, display: 'flex', gap: 8, marginTop: 12 }}><input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={rx} onChange={e => { setRx(e.target.checked); setProblem(null) }} />Prescription required. I will show a valid prescription at delivery.</label>}
            {problem && <div className="err" style={{ padding: 12, margin: '10px 0' }}>{problem.t}{problem.go && <><br /><button className="btn sm" style={{ marginTop: 8 }} onClick={() => { onClose(); problem.go() }}>{problem.label}</button></>}</div>}
            <button className="btn pri" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} disabled={busy} onClick={place}>{busy ? 'Placing…' : 'Place order'}</button>
            <p className="sub" style={{ fontSize: 12, marginTop: 8 }}>Demo only: stock is simulated and there is no payment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Orders view ---------- */
const STEPS = [['placed', 'Placed'], ['accepted', 'Accepted'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']]
function Orders({ loggedIn, onLogin }) {
  const [list, setList] = useState([]), [o, setO] = useState(null), [err, setErr] = useState('')
  const refresh = () => (loggedIn ? api('/api/me/orders') : Promise.resolve([])).then(setList).catch(e => setErr(e.message))
  useEffect(() => { setErr(''); refresh() }, [loggedIn])
  const open = id => api('/api/orders/' + id).then(setO).catch(e => setErr(e.message))
  const act = async a => { try { await post(`/api/orders/${o.id}/${a}`); await open(o.id); refresh() } catch (e) { setErr(e.message) } }
  const idx = o ? STEPS.findIndex(s => s[0] === o.status) : -1
  return (
    <div style={{ marginTop: 32 }}>
      <h1 style={{ marginTop: 0 }}>My orders</h1>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      {list.length === 0 && <div className="empty"><Package /><p>{loggedIn ? 'No orders yet. Orders you place appear here.' : 'Log in to see your orders.'}</p>{!loggedIn && <button className="btn pri sm" onClick={onLogin}>Log in</button>}</div>}
      <div className="list">
        {list.map(x => (
          <div className="card" key={x.id} style={{ cursor: 'pointer' }} onClick={() => open(x.id)}>
            <div><h3>Order #{x.id} · {x.pharmacy_name}</h3><p className="desc">{new Date(x.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {x.item_count} item(s)</p></div>
            <div className="right"><span className={'badge ' + (x.status === 'cancelled' ? 'rx' : 'ok')}>{x.status.replace(/_/g, ' ')}</span><span className="price">{inr(x.total)}</span></div>
          </div>
        ))}
      </div>
      {o && (
        <div className="overlay" onClick={() => setO(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Order #{o.id}</h2><button className="btn sm" onClick={() => setO(null)}><X size={16} /></button></div>
            <p className="sub">{o.pharmacy_name}{o.pharmacy_phone ? ' · ' + o.pharmacy_phone : ''}</p>
            {o.status === 'cancelled' ? <div className="note">This order was cancelled.</div> : (
              <div className="stepper">{STEPS.map((s, i) => <div key={s[0]} className={i <= idx ? 'done' : ''}><i />{s[1]}</div>)}</div>
            )}
            {o.items.map(i => <div className="line" key={i.medicine_id}><b>{i.medicine_name}</b><span>× {i.quantity}</span><span>{inr(i.price * i.quantity)}</span></div>)}
            <p style={{ fontWeight: 700 }}>Total: {inr(o.total)}</p>
            {o.customer_name && <p className="sub">Recipient: {o.customer_name}{o.customer_phone ? ' · ' + o.customer_phone : ''}</p>}
            <p className="sub">Deliver to: {o.delivery_address}</p>
            <div className="actions">
              {o.status === 'placed' && <button className="btn sm" onClick={() => confirm('Cancel this order?') && act('cancel')}>Cancel order</button>}
              <button className="btn sm" onClick={() => open(o.id)}>Refresh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Main app ---------- */
export default function App() {
  const [view, setView] = useState('explore')
  const [locMode, setLocMode] = useState('bbsr'), [user, setUser] = useState(BBSR), [locNote, setLocNote] = useState('')
  const [radiusKm, setRadiusKm] = useState(10), [priceF, setPriceF] = useState('all')
  const [text, setText] = useState(''), [query, setQuery] = useState(''), [sugs, setSugs] = useState([])
  const [raw, setRaw] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [tick, setTick] = useState(0)
  const [sort, setSort] = useState('near'), [mode, setMode] = useState('list'), [page, setPage] = useState(1), [selId, setSelId] = useState(null)
  const [cart, setCart] = useState(load('medlify_cart', [])), [cartOpen, setCartOpen] = useState(false)
  const [orderIds, setOrderIds] = useState(load('medlify_orders', [])), [detail, setDetail] = useState(null)
  const [auth, setAuth] = useState(load('medlify_auth', null))

  useEffect(() => save('medlify_cart', cart), [cart])
  useEffect(() => save('medlify_orders', orderIds), [orderIds])
  // Pharmacists only ever see their dashboard; customers never see pharmacy tools
  const isPharm = auth?.user?.role === 'pharmacy'
  const login = async (a, addr) => {
    setToken(a.token); setAuth(a); save('medlify_auth', a); setCartOpen(false)
    if (a.user.role === 'pharmacy') return setView('owner')
    if (addr && addr.length >= 10) {
      try { await api('/api/me/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Home', is_self: true, recipient_name: a.user.name, recipient_phone: a.user.phone, address: addr, is_default: true }) }); await loadAddrs() } catch {}
    }
    setView(addr === null || addr.length >= 10 ? 'explore' : 'profile')
  }
  const updateUser = u => setAuth(a => { const n = { ...a, user: u }; save('medlify_auth', n); return n })
  const logout = () => { setToken(null); setAuth(null); localStorage.removeItem('medlify_auth'); setView('explore') }
  const [addrs, setAddrs] = useState([]), [addrId, setAddrId] = useState(null), [pickOpen, setPickOpen] = useState(false)
  const [landing, setLanding] = useState('explore')
  const curAddr = addrs.find(x => x.id === addrId)
  const loadAddrs = () => TOKEN
    ? api('/api/me/addresses').then(a => { setAddrs(a); setAddrId(id => a.some(x => x.id === id) ? id : (a.find(x => x.is_default) || a[0])?.id ?? null) }).catch(() => {})
    : Promise.resolve(setAddrs([]), setAddrId(null))
  useEffect(() => { loadAddrs() }, [auth?.token])
  const saveAddr = async (p, id) => {
    const a = await api(id ? '/api/me/addresses/' + id : '/api/me/addresses', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
    await loadAddrs(); return a
  }
  const delAddr = async id => { await api('/api/me/addresses/' + id, { method: 'DELETE' }); await loadAddrs() }
  const pickAddr = a => {
    if (!a) return
    setAddrId(a.id)
    if (a.lat != null && a.lng != null) { setUser({ lat: Number(a.lat), lng: Number(a.lng) }); setLocMode('addr'); setLocNote('') }
  }
  useEffect(() => { window.addEventListener('medlify-logout', logout); return () => window.removeEventListener('medlify-logout', logout) }, [])

  // location
  useEffect(() => {
    if (locMode === 'addr') return
    if (locMode === 'bbsr') { setUser(BBSR); setLocNote(''); return }
    if (!navigator.geolocation) { setLocNote('Location unavailable. Using Bhubaneswar.'); setLocMode('bbsr'); return }
    navigator.geolocation.getCurrentPosition(
      p => { setUser({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocNote('Demo pharmacies are only in Bhubaneswar.') },
      () => { setLocNote('Location denied. Using Bhubaneswar.'); setLocMode('bbsr') }
    )
  }, [locMode])

  // autocomplete
  useEffect(() => {
    if (text.trim().length < 2 || text === query) { setSugs([]); return }
    const t = setTimeout(() => api('/api/search/medicines?q=' + encodeURIComponent(text.trim())).then(setSugs).catch(() => setSugs([])), 250)
    return () => clearTimeout(t)
  }, [text, query])

  // data
  useEffect(() => {
    const ac = new AbortController()
    setLoading(true); setError('')
    const url = query
      ? `/api/search?q=${encodeURIComponent(query)}&lat=${user.lat}&lng=${user.lng}&radius=${radiusKm * 1000}`
      : `/api/pharmacies?lat=${user.lat}&lng=${user.lng}&radius=${radiusKm * 1000}`
    api(url, { signal: ac.signal }).then(d => {
      const rows = query ? d.pharmacies : d
      setRaw(rows.map(p => ({
        id: p.pharmacy_id ?? p.id, name: p.pharmacy_name ?? p.name, address: p.address, phone: p.phone, hours: p.open_hours,
        lat: Number(p.latitude), lng: Number(p.longitude), dist: Number(p.distance_m), count: p.medicine_count, meds: p.medicines || [],
      })))
      setLoading(false)
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : e.message); setLoading(false) } })
    return () => ac.abort()
  }, [query, user, radiusKm, tick])

  const minPrice = p => Math.min(...p.meds.map(m => Number(m.price)))
  const results = useMemo(() => {
    let r = raw
    if (query && priceF !== 'all') {
      const [lo, hi] = { u50: [0, 50], '50': [50, 100], '100': [100, 200], '200': [200, 1e9] }[priceF]
      r = r.filter(p => p.meds.some(m => Number(m.price) >= lo && Number(m.price) < hi))
    }
    return r
  }, [raw, priceF, query])
  const sorted = useMemo(() => {
    const r = [...results]
    if (sort === 'low') r.sort((a, b) => minPrice(a) - minPrice(b))
    else if (sort === 'high') r.sort((a, b) => minPrice(b) - minPrice(a))
    else r.sort((a, b) => a.dist - b.dist)
    return r
  }, [results, sort])
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const shown = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => setPage(1), [query, radiusKm, priceF, sort, user])
  const selected = raw.find(p => p.id === selId)

  const addToCart = (ph, m) => {
    setCart(c => {
      const ex = c.find(x => x.pid === ph.id && x.mid === m.mid)
      if (ex) return c.map(x => (x === ex ? { ...x, qty: Math.min(x.max, x.qty + 1) } : x))
      return [...c, { pid: ph.id, pname: ph.name, mid: m.mid, name: m.name, price: m.price, max: m.max, rx: m.rx, qty: 1 }]
    })
    setCartOpen(true)
  }
  const runSearch = v => { setQuery(v.trim()); setText(v.trim()); setSugs([]); setView('explore'); setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 50) }
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const area = p => (p.address || '').split(',')[1]?.trim() || (p.address || '').split(',')[0] || 'Bhubaneswar'

  return (
    <div className="sheet">
      <div className="nav">
        <div className="logo"><i><Cross size={18} /></i>Medlify</div>
        {isPharm ? (
          <>
            <div className="links"><button className="on">Pharmacy dashboard</button></div>
            <div className="acts">
              <span className="btn" style={{ cursor: 'default' }}><User size={16} />{auth.user.name.split(' ')[0]}</span>
              <button className="btn" onClick={logout}>Log out</button>
            </div>
          </>
        ) : (
          <>
            <div className="links">
              <button className={view === 'explore' ? 'on' : ''} onClick={() => setView('explore')}>Explore</button>
              <button className={view === 'orders' ? 'on' : ''} onClick={() => setView('orders')}>Orders</button>
              <button onClick={() => setCartOpen(true)}>Cart</button>
            </div>
            <div className="acts">
              {auth ? <button className="btn" onClick={() => setView('profile')}><User size={16} />{auth.user.name.split(' ')[0]}</button> : <button className="btn" onClick={() => setView('auth')}><User size={16} />Log in</button>}
              <button className="btn" onClick={() => setView('orders')}>My orders</button>
              {!auth && <button className="btn" onClick={() => setView('pharmacy-auth')}>Pharmacy login</button>}
              {auth && <button className="btn" onClick={logout}>Log out</button>}
              <button className="btn pri" onClick={() => setCartOpen(true)}><ShoppingCart size={16} />Cart ({cartCount})</button>
            </div>
          </>
        )}
      </div>

      {isPharm ? <Owner auth={auth} /> : view === 'pharmacy-auth' && !auth ? <PharmacyAuth onAuth={d => login(d, null)} onBack={() => setView('explore')} /> : view === 'auth' ? <AuthPage onAuth={login} onBack={() => { setLanding('explore'); setView('explore') }} pharmacy={false} setPharmacy={() => setView('pharmacy-auth')} /> : view === 'profile' && auth ? <Profile auth={auth} addrs={addrs} onSaveAddr={saveAddr} onDelAddr={delAddr} onSearch={runSearch} onOrders={() => setView('orders')} onLogout={logout} /> : view === 'orders' ? <Orders loggedIn={!!auth} onLogin={() => setView('auth')} /> : (
        <>
          <h1>{query ? `${results.length} pharmacies stock “${query}”` : `${results.length} Pharmacies in Bhubaneswar`}</h1>
          <p className="sub">Find medicines from pharmacies near you.</p>
          <span className="demo">Demo data: stock and prices are simulated</span>
          <div>{auth
            ? <button className="btn" style={{ marginTop: 12, maxWidth: '100%' }} onClick={() => setPickOpen(true)}><MapPin size={16} />{curAddr ? `Deliver to ${curAddr.label} · ${curAddr.address.length > 44 ? curAddr.address.slice(0, 44) + '…' : curAddr.address}` : 'Add a delivery address'}</button>
            : <button className="btn" style={{ marginTop: 12 }} onClick={() => setView('auth')}><MapPin size={16} />Log in to set a delivery address</button>}</div>

          <div className="filters">
            <div><label className="f">Location</label><div className="field"><MapPin size={16} />
              <select value={locMode} onChange={e => setLocMode(e.target.value)}><option value="bbsr">Bhubaneswar</option><option value="me">My current location</option>{locMode === 'addr' && <option value="addr">Delivery address</option>}</select></div></div>
            <div><label className="f">Distance</label><div className="field"><Truck size={16} />
              <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}>{[2, 5, 10, 25].map(k => <option key={k} value={k}>Within {k} km</option>)}</select></div></div>
            <div><label className="f">Price</label><div className="field"><span style={{ fontWeight: 700 }}>₹</span>
              <select value={priceF} disabled={!query} title={query ? '' : 'Search a medicine to filter by price'} onChange={e => setPriceF(e.target.value)}>
                <option value="all">All prices</option><option value="u50">Under ₹50</option><option value="50">₹50 – 100</option><option value="100">₹100 – 200</option><option value="200">₹200+</option></select></div></div>
          </div>
          {locNote && <div className="note">{locNote}</div>}

          <label className="f">Search</label>
          <form className="searchbox" onSubmit={e => { e.preventDefault(); runSearch(text) }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Search a medicine, e.g. Paracetamol, Metformin…" />
            {text && <button type="button" aria-label="Clear" onClick={() => { setText(''); setQuery(''); setPriceF('all') }}><X size={18} /></button>}
            <Search size={18} />
            {sugs.length > 0 && <div className="sugs">{sugs.map(s => <button type="button" key={s.id} onClick={() => runSearch(s.name)}>{s.name}<small>{s.generic_name}</small>{s.requires_prescription && <small style={{ color: '#D64545' }}> Rx</small>}</button>)}</div>}
          </form>

          <div className="mapwrap">
            <MapContainer center={[user.lat, user.lng]} zoom={13} scrollWheelZoom>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
              <Fit items={results} center={user} />
              <Fly p={selected} />
              <Marker position={[user.lat, user.lng]} icon={userIcon} />
              {results.map(p => <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.id === selId)} zIndexOffset={p.id === selId ? 1000 : 0} eventHandlers={{ click: () => { setSelId(p.id); setTimeout(() => document.getElementById('card-' + p.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) } }} />)}
            </MapContainer>
          </div>

          <div className="toolbar" id="results">
            <div className="toggle">
              <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} aria-label="List view"><List size={16} /></button>
              <button className={mode === 'grid' ? 'on' : ''} onClick={() => setMode('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button>
            </div>
            <div className="tabs">
              <button className={sort === 'near' ? 'on' : ''} onClick={() => setSort('near')}>Nearest</button>
              <button className={sort === 'low' ? 'on' : ''} disabled={!query} onClick={() => setSort('low')}>Lowest price</button>
              <button className={sort === 'high' ? 'on' : ''} disabled={!query} onClick={() => setSort('high')}>Highest price</button>
            </div>
          </div>

          {error && <div className="err">{error}<br /><button className="btn sm" style={{ marginTop: 10 }} onClick={() => setTick(t => t + 1)}>Retry</button></div>}
          {loading && !error && <div className="list">{[1, 2, 3].map(i => <div className="skel" key={i} />)}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="empty">No pharmacies{query ? ` within ${radiusKm} km stock this medicine` : ' found in this area'}.
              {radiusKm < 25 && <><br /><button className="btn sm" style={{ marginTop: 10 }} onClick={() => setRadiusKm(25)}>Increase distance to 25 km</button></>}
              <p style={{ fontSize: 12 }}>Demo pharmacies are only in Bhubaneswar.</p></div>
          )}

          {!loading && !error && <div className={'list ' + (mode === 'grid' ? 'grid' : '')}>
            {shown.map(p => (
              <div key={p.id} id={'card-' + p.id} className={'card ' + (p.id === selId ? 'is-selected' : '')} onClick={() => setSelId(p.id)}>
                <div style={{ flex: 1 }}>
                  <div className="area">{area(p).toUpperCase()}</div>
                  <h3>{p.name}{p.id === selId && <span className="badge ok" style={{ marginLeft: 8, verticalAlign: 'middle' }}>Picked</span>}</h3>
                  <p className="desc">{query ? `Open: ${p.hours}` : `${p.count} medicines in stock`}{p.phone ? ' · ' + p.phone : ''}</p>
                  {query && <div className="meds">{p.meds.map(m => (
                    <div className="med" key={m.medicine_id}>
                      <b>{m.name}<br /><small style={{ color: '#5B6675', fontWeight: 400 }}>{m.generic_name}</small></b>
                      {m.prescription && <span className="badge rx">Rx</span>}<StockBadge q={m.quantity} /><span>{inr(m.price)}</span>
                      <button className="btn pri sm" onClick={e => { e.stopPropagation(); addToCart(p, { mid: m.medicine_id, name: m.name, price: Number(m.price), max: m.quantity, rx: m.prescription }) }}>Add</button>
                    </div>))}</div>}
                  <div className="meta"><span><MapPin size={14} />{dist(p.dist)}</span><span><Clock size={14} />{p.hours}</span><span><Truck size={14} />Delivery</span></div>
                </div>
                <div className="right">
                  <div className="thumb" style={{ background: `linear-gradient(135deg,hsl(${160 + (p.id * 17) % 40},60%,55%),hsl(${170 + (p.id * 11) % 30},70%,38%))` }}>{(p.name[0] || 'P').toUpperCase()}<Pill size={18} style={{ position: 'absolute', right: 10, top: 10, opacity: .7 }} /></div>
                  <div className="price">{query ? inr(minPrice(p)) : `${p.count} medicines`}</div>
                  <div className="actions"><button className="btn sm" onClick={e => { e.stopPropagation(); setDetail(p) }}>View</button></div>
                </div>
              </div>
            ))}
          </div>}

          {pages > 1 && <div className="pager">{Array.from({ length: pages }, (_, i) => <button key={i} className={page === i + 1 ? 'on' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}</div>}

          <Discover user={user} radiusKm={radiusKm} onAdd={addToCart} token={auth?.token} />
        </>
      )}

      <p className="foot">Medlify is a prototype. Pharmacy locations © OpenStreetMap contributors; stock and prices are simulated.</p>
      {pickOpen && auth && <DeliverTo user={auth.user} addrs={addrs} addrId={addrId} onPick={id => { pickAddr(addrs.find(x => x.id === id)); setPickOpen(false) }} onSave={async p => { const a = await saveAddr(p); pickAddr(a); setPickOpen(false) }} onClose={() => setPickOpen(false)} />}
      {detail && <PharmacyDrawer ph={detail} user={user} onClose={() => setDetail(null)} onAdd={addToCart} />}
      {cartOpen && <CartDrawer user={auth?.user} addrs={addrs} addrId={addrId} setAddrId={setAddrId} onSaveAddr={saveAddr} goLogin={() => setView('auth')} cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} onOrdered={(ids, allOk) => { setOrderIds(o => [...ids, ...o]); if (allOk) { setCartOpen(false); setView('orders') } }} />}
    </div>
  )
}
