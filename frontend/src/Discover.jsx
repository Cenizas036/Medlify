import { useEffect, useRef, useState } from 'react'
import { Zap, Droplets, Flower2, Salad, Sun, Bandage, Bookmark, ArrowLeft, X } from 'lucide-react'

import MedThumb from './MedThumb.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const inr = n => '₹' + Number(n).toFixed(2).replace(/\.00$/, '')
const dist = m => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)
const get = async p => {
  const r = await fetch(API + p)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Request failed')
  return d
}
const CATS = [
  { slug: 'pain-relief', label: 'Pain Relief', Icon: Zap, bg: '#FFEDD5', fg: '#C2410C' },
  { slug: 'diabetes-care', label: 'Diabetes Care', Icon: Droplets, bg: '#E0ECFF', fg: '#1D4ED8' },
  { slug: 'allergy-care', label: 'Allergy Care', Icon: Flower2, bg: '#F3E8FF', fg: '#7E22CE' },
  { slug: 'digestive-health', label: 'Digestive Health', Icon: Salad, bg: '#DCFCE7', fg: '#15803D' },
  { slug: 'vitamins-supplements', label: 'Vitamins & Supplements', Icon: Sun, bg: '#FEF3C7', fg: '#A16207' },
  { slug: 'first-aid', label: 'First Aid', Icon: Bandage, bg: '#FEE2E2', fg: '#B91C1C' },
]
const INTRO = {
  'pain-relief': 'Medicines that ease pain and bring down fever. The common types are paracetamol (pain and fever) and NSAIDs such as ibuprofen (pain, fever and inflammation). Low-dose aspirin has a different use: preventing blood clots on medical advice.',
  'diabetes-care': 'Medicines that help manage blood sugar in diabetes. Tablets such as metformin and glimepiride are used in type 2 diabetes, while insulin is injected. All are prescribed and monitored by a doctor.',
  'allergy-care': 'Medicines for allergy symptoms such as sneezing, itching and a runny nose. Antihistamines like cetirizine ease symptoms, and montelukast helps prevent asthma and allergic rhinitis. Some cause drowsiness.',
  'digestive-health': 'Medicines for acidity, nausea and stomach upsets. Acid reducers (omeprazole, pantoprazole) lower stomach acid, anti-nausea medicines settle vomiting, and ORS replaces fluids lost to diarrhoea.',
  'vitamins-supplements': 'Vitamins and minerals that top up what your diet may lack. They support health but do not treat illness by themselves, and high-strength products such as vitamin D 60K should follow medical advice.',
  'first-aid': 'Everyday care for small skin problems. Antifungal creams treat fungal skin infections and antibiotic ointments treat small bacterial skin infections. See a doctor for deep, spreading or persistent problems.',
}
const loadCab = () => { try { return JSON.parse(localStorage.getItem('medlify_cabinet')) || [] } catch { return [] } }

export default function Discover({ user, radiusKm, onAdd, token }) {
  const [counts, setCounts] = useState({})
  const [active, setActive] = useState(null)
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [cab, setCab] = useState(loadCab)
  const [cabErr, setCabErr] = useState('')
  const q = `lat=${user.lat}&lng=${user.lng}&radius=${radiusKm * 1000}`
  const call = (path, method = 'GET') => fetch(API + path, { method, headers: { Authorization: 'Bearer ' + token } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
  const wasIn = useRef(false)
  useEffect(() => {
    if (token) {
      wasIn.current = true
      Promise.all(loadCab().map(m => call('/api/me/cabinet/' + m.id, 'PUT').catch(() => {})))
        .then(() => call('/api/me/cabinet')).then(setCab).catch(() => {})
    } else if (wasIn.current) { wasIn.current = false; setCab([]) }
  }, [token])

  useEffect(() => {
    get('/api/catalog/categories').then(rows => {
      const c = {}; rows.forEach(r => { c[r.category] = r.medicine_count }); setCounts(c)
    }).catch(() => {})
  }, [])
  useEffect(() => { try { localStorage.setItem('medlify_cabinet', JSON.stringify(cab)) } catch {} }, [cab])
  useEffect(() => {
    if (!active) return
    let stop = false
    setLoading(true); setError('')
    get(`/api/catalog/categories/${active.slug}?${q}`)
      .then(d => { if (!stop) { setMeds(d.medicines); setLoading(false) } })
      .catch(e => { if (!stop) { setError(e.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : e.message); setLoading(false) } })
    return () => { stop = true }
  }, [active, q])

  const saved = id => cab.some(m => m.id === id)
  const toggle = m => {
    const had = saved(m.id)
    setCab(c => had ? c.filter(x => x.id !== m.id) : [{ id: m.id, name: m.name, generic_name: m.generic_name, rx: m.requires_prescription }, ...c])
    if (token) call('/api/me/cabinet/' + m.id, had ? 'DELETE' : 'PUT').catch(() => {})
  }
  const add = (m, p) => onAdd({ id: p.pharmacy_id, name: p.pharmacy_name },
    { mid: m.id, name: m.name, price: Number(p.price), max: p.quantity, rx: m.requires_prescription })
  const openCab = id => { setCabErr(''); get(`/api/catalog/medicines/${id}?${q}`).then(setDetail).catch(e => setCabErr(e.message)) }
  const cheapest = m => Math.min(...m.pharmacies.map(p => Number(p.price)))

  return (
    <section className="dx">
      <h2>Explore healthcare categories</h2>
      <p className="sub">Discover medicines and healthcare essentials by category.</p>

      {!active ? (
        <div className="dx-grid">
          {CATS.map(c => (
            <button key={c.slug} className="dx-cat" style={{ '--bg': c.bg, '--fg': c.fg }} onClick={() => setActive(c)}>
              <span className="dx-ico"><c.Icon size={20} /></span>
              <b>{c.label}</b>
              <small>{counts[c.slug] != null ? `${counts[c.slug]} medicines` : '\u00A0'}</small>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button className="btn sm" onClick={() => { setActive(null); setMeds([]) }}><ArrowLeft size={14} />All categories</button>
          <h3 className="dx-title" style={{ color: active.fg }}><active.Icon size={20} />{active.label}</h3>
          <p className="sub">{INTRO[active.slug]}</p>
          {error && <div className="err">{error}</div>}
          {loading && <div className="skel" />}
          {!loading && !error && (
            <div className="dx-list">
              {meds.map(m => {
                const near = m.pharmacies[0]
                return (
                  <div className="dx-med" key={m.id}><MedThumb name={m.name} form={m.form} tint={active} />
                    <div className="dx-info">
                      <b>{m.name}</b>
                      <small>{m.generic_name}</small>
                      <div className="meta" style={{ marginTop: 6 }}>
                        {m.requires_prescription && <span className="badge rx">Rx</span>}{m.drug_class && <span className="badge ok">{m.drug_class}</span>}
                        {near
                          ? <span>From {inr(cheapest(m))} · {m.pharmacies.length} {m.pharmacies.length === 1 ? 'pharmacy' : 'pharmacies'} within {radiusKm} km · nearest {dist(near.distance_m)}</span>
                          : <span>Not in stock within {radiusKm} km</span>}
                      </div>
                    </div>
                    <div className="dx-actions">
                      <button className={'dx-save' + (saved(m.id) ? ' on' : '')} aria-label="Save to cabinet" title={saved(m.id) ? 'Remove from cabinet' : 'Save to cabinet'} onClick={() => toggle(m)}><Bookmark size={16} /></button>
                      <button className="btn sm" onClick={() => setDetail(m)}>Details</button>
                      <button className="btn pri sm" disabled={!near} onClick={() => add(m, near)}>Add</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="dx-cab">
        <h3>Your medicine cabinet</h3>
        <p className="sub" style={{ fontSize: 13 }}>Medicines you saved on this device.</p>
        {cabErr && <div className="err" style={{ padding: 14, marginBottom: 10 }}>{cabErr}</div>}
        {cab.length === 0
          ? <div className="empty" style={{ padding: 22 }}>Nothing saved yet. Tap the bookmark on any medicine to keep it here.</div>
          : <div className="dx-chips">{cab.map(m => (
              <div className="dx-chip" key={m.id}>
                <button className="dx-chipmain" onClick={() => openCab(m.id)}>{m.name}{m.rx && <span className="badge rx">Rx</span>}</button>
                <button aria-label={'Remove ' + m.name} onClick={() => toggle(m)}><X size={14} /></button>
              </div>))}</div>}
      </div>

      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><MedThumb name={detail.name} form={detail.form} size={56} /><h2 style={{ margin: 0 }}>{detail.name}</h2></div>
              <button className="btn sm" onClick={() => setDetail(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="sub">Generic: {detail.generic_name || '—'}</p>
            {detail.drug_class && <span className="badge ok">{detail.drug_class}</span>}
            {detail.summary && <p style={{ margin: '10px 0' }}>{detail.summary}</p>}
            {detail.summary && <p className="sub" style={{ fontSize: 12 }}>General information only, not medical advice. Ask a doctor or pharmacist about your situation.</p>}
            {detail.requires_prescription && <div className="note">Prescription required. A valid prescription is needed at delivery.</div>}
            <div className="note">Demo data: stock and prices are simulated.</div>
            <button className={'btn sm' + (saved(detail.id) ? ' pri' : '')} onClick={() => toggle(detail)}><Bookmark size={14} />{saved(detail.id) ? 'Saved to cabinet' : 'Save to cabinet'}</button>
            <h3 style={{ margin: '18px 0 4px' }}>Available nearby</h3>
            {detail.pharmacies.length === 0 && <div className="empty">Not in stock within {radiusKm} km.</div>}
            {detail.pharmacies.map(p => (
              <div className="line" key={p.pharmacy_id}>
                <b>{p.pharmacy_name}<br /><small style={{ color: '#5B6675', fontWeight: 400 }}>{dist(p.distance_m)} · {p.quantity <= 10 ? `Only ${p.quantity} left` : 'In stock'}</small></b>
                <span>{inr(p.price)}</span>
                <button className="btn pri sm" onClick={() => add(detail, p)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
