import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

function Row({ m, call, onSaved, onRemoved }) {
  const [qty, setQty] = useState(String(m.quantity)), [price, setPrice] = useState(String(Number(m.price)))
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
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
    <div className="dx-med">
      <MedThumb name={m.name} form={m.form} />
      <div className="dx-info">
        <b>{m.name}</b><small>{m.generic_name}</small>
        <div className="meta" style={{ marginTop: 6 }}>
          {m.requires_prescription && <span className="badge rx">Rx</span>}
          {m.quantity === 0 ? <span className="badge rx">Hidden from customers</span> : m.quantity <= 10 ? <span className="badge low">Low stock</span> : <span className="badge ok">Live</span>}
        </div>
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

export default function Owner({ auth, onBack }) {
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + auth.token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(d.error || 'Request failed'); e.status = r.status; throw e }
    return d
  }
  const [data, setData] = useState(null), [state, setState] = useState('loading'), [err, setErr] = useState(''), [f, setF] = useState('')
  const load = () => call('/api/owner/pharmacy').then(d => { setData(d); setState('ready') }).catch(e => { if (e.status === 404) setState('claim'); else { setErr(e.message); setState('error') } })
  useEffect(() => { load() }, [])
  const inv = data?.inventory || []
  const shown = inv.filter(m => (m.name + ' ' + (m.generic_name || '')).toLowerCase().includes(f.toLowerCase()))
  const live = inv.filter(m => m.quantity > 0).length, low = inv.filter(m => m.quantity > 0 && m.quantity <= 10).length, hidden = inv.filter(m => m.quantity === 0).length
  const saved = u => setData(d => ({ ...d, inventory: d.inventory.map(x => x.medicine_id === u.medicine_id ? { ...x, quantity: u.quantity, price: u.price } : x) }))
  const removed = id => setData(d => ({ ...d, inventory: d.inventory.filter(x => x.medicine_id !== id) }))
  return (
    <div style={{ marginTop: 28 }}>
      <button className="btn sm" onClick={onBack}><ArrowLeft size={14} />Back to profile</button>
      {state === 'loading' && <div className="skel" style={{ marginTop: 16 }} />}
      {state === 'error' && <div className="err" style={{ marginTop: 16 }}>{err}</div>}
      {state === 'claim' && <Claim call={call} onDone={load} />}
      {state === 'ready' && data && (
        <>
          <h1 style={{ marginTop: 16 }}>{data.pharmacy.name}</h1>
          <p className="sub">{data.pharmacy.address}</p>
          {data.pharmacy.drug_licence_no && <p style={{ margin: '4px 0 10px', fontSize: 14 }}>Drug licence no. <b>{data.pharmacy.drug_licence_no}</b> <span className="badge low">Recorded, not yet verified</span></p>}
          <div className="note">Changes go live instantly. Customers only see medicines with a quantity above 0. Demo data, no real stock.</div>
          <div className="dx-chips" style={{ margin: '12px 0 0' }}>
            <span className="badge ok">{live} live</span><span className="badge low">{low} low stock</span><span className="badge rx">{hidden} hidden (quantity 0)</span>
          </div>
          <AddStock call={call} have={new Set(inv.map(m => m.medicine_id))} onAdded={load} />
          <div className="dx-cab">
            <h3>Your stock ({inv.length})</h3>
            <input style={{ ...box, width: '100%', margin: '10px 0' }} placeholder="Filter your medicines…" value={f} onChange={e => setF(e.target.value)} />
            {inv.length === 0 && <div className="empty" style={{ padding: 22 }}>No medicines yet. Add your first one above.</div>}
            <div className="dx-list">{shown.map(m => <Row key={m.medicine_id} m={m} call={call} onSaved={saved} onRemoved={removed} />)}</div>
          </div>
        </>
      )}
    </div>
  )
}
