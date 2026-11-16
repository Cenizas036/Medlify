import { useEffect, useState } from 'react'
import { Crosshair, Plus, Trash2, X } from 'lucide-react'

export async function detectLocation() {
  const pos = await new Promise((ok, no) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(ok, () => no(new Error('Location permission denied. Type your address instead.')), { enableHighAccuracy: true, timeout: 12000 })
    : no(new Error('Location is not supported in this browser.')))
  const { latitude: lat, longitude: lng } = pos.coords
  let address = ''
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } })
    const d = await r.json(), a = d.address || {}
    address = [a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village || a.county, a.state, a.postcode].filter(Boolean).join(', ') || d.display_name || ''
  } catch {}
  return { lat, lng, address }
}

export function AddressForm({ user, initial, defaultForOther, autoDetect, onSubmit, onCancel }) {
  const [f, setF] = useState(() => initial || {
    label: defaultForOther ? 'Other' : 'Home', is_self: !defaultForOther,
    recipient_name: defaultForOther ? '' : user.name, recipient_phone: defaultForOther ? '' : user.phone,
    address: '', lat: null, lng: null, is_default: false })
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [loc, setLoc] = useState(false)
  const set = p => { setF(x => ({ ...x, ...p })); setErr('') }
  const why = f.recipient_name.trim().length < 2 ? 'Enter the recipient name.'
    : !/^[6-9]\d{9}$/.test(f.recipient_phone) ? 'Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9).'
    : f.address.trim().length < 10 ? 'Enter the full address (at least 10 characters).' : ''

  async function detect() {
    setLoc(true); setErr('')
    try { const d = await detectLocation(); set({ lat: d.lat, lng: d.lng, ...(d.address ? { address: d.address } : {}) }) }
    catch (e) { setErr(e.message) }
    setLoc(false)
  }
  useEffect(() => { if (autoDetect) detect() }, [])

  async function submit(e) {
    e.preventDefault()
    if (why) return setErr(why)
    setBusy(true)
    try { await onSubmit({ ...f, address: f.address.trim() }) } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="tabs" style={{ margin: '0 0 10px' }}>
        <button type="button" style={{ flex: 1 }} className={f.is_self ? 'on' : ''} onClick={() => set({ is_self: true, recipient_name: user.name, recipient_phone: user.phone })}>For myself</button>
        <button type="button" style={{ flex: 1 }} className={!f.is_self ? 'on' : ''} onClick={() => set({ is_self: false, recipient_name: '', recipient_phone: '' })}>For someone else</button>
      </div>
      <div className="tabs" style={{ margin: '0 0 10px' }}>
        {['Home', 'Work', 'Other'].map(l => <button type="button" key={l} style={{ flex: 1 }} className={f.label === l ? 'on' : ''} onClick={() => set({ label: l })}>{l}</button>)}
      </div>
      <input placeholder={f.is_self ? 'Your name' : "Recipient's name"} value={f.recipient_name} onChange={e => set({ recipient_name: e.target.value })} />
      <input placeholder={f.is_self ? 'Your mobile number' : "Recipient's 10-digit mobile number"} inputMode="numeric" value={f.recipient_phone} onChange={e => set({ recipient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
      <button type="button" className="btn sm" style={{ margin: '4px 0 8px' }} disabled={loc} onClick={detect}><Crosshair size={14} />{loc ? 'Detecting…' : 'Use my current location'}</button>
      <textarea rows={3} placeholder="Flat / house no., street, area, pincode (min 10 characters)" value={f.address} onChange={e => set({ address: e.target.value })} />
      {f.lat != null && <p className="sub" style={{ fontSize: 12, margin: '4px 0' }}>Location detected. It can be approximate on desktops, so add your flat or house number.</p>}
      <label style={{ fontSize: 13, display: 'flex', gap: 8, margin: '8px 0' }}><input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={!!f.is_default} onChange={e => set({ is_default: e.target.checked })} />Make this my default address</label>
      {(err || why) && <p className="sub" style={{ fontSize: 12, color: '#D64545', margin: '4px 0' }}>{err || why}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn pri sm" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export function AddressManager({ addrs, user, onSave, onDelete }) {
  const [mode, setMode] = useState(null), [err, setErr] = useState('')
  const run = async fn => { setErr(''); try { await fn() } catch (e) { setErr(e.message) } }
  return (
    <div>
      {err && <div className="err" style={{ padding: 12, margin: '8px 0' }}>{err}</div>}
      {addrs.length === 0 && mode !== 'new' && <div className="empty" style={{ padding: 22 }}>No saved addresses yet.</div>}
      {addrs.map(a => mode === a.id
        ? <AddressForm key={a.id} user={user} initial={a} onCancel={() => setMode(null)} onSubmit={async p => { await onSave(p, a.id); setMode(null) }} />
        : (
          <div className="addr" key={a.id} style={{ marginTop: 10 }}>
            <span><b>{a.label}</b>{a.is_default && <span className="badge ok" style={{ marginLeft: 8 }}>Default</span>}{!a.is_self && <span className="badge low" style={{ marginLeft: 8 }}>For someone else</span>}
              <br /><small>{a.recipient_name} · {a.recipient_phone}</small><br /><small>{a.address}</small></span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {!a.is_default && <button className="btn sm" onClick={() => run(() => onSave({ ...a, is_default: true }, a.id))}>Set default</button>}
              <button className="btn sm" onClick={() => setMode(a.id)}>Edit</button>
              <button className="btn sm" aria-label="Delete address" onClick={() => confirm('Delete this address?') && run(() => onDelete(a.id))}><Trash2 size={14} /></button>
            </span>
          </div>))}
      {mode === 'new'
        ? <AddressForm user={user} onCancel={() => setMode(null)} onSubmit={async p => { await onSave(p); setMode(null) }} />
        : <button className="btn pri sm" style={{ marginTop: 12 }} onClick={() => setMode('new')}><Plus size={14} />Add address</button>}
    </div>
  )
}

export function DeliverTo({ user, addrs, addrId, onPick, onSave, onClose }) {
  const [form, setForm] = useState(addrs.length === 0 ? 'detect' : null)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Choose delivery address</h2><button className="btn sm" onClick={onClose}><X size={16} /></button></div>
        {form
          ? <AddressForm user={user} autoDetect={form === 'detect'} onCancel={() => setForm(null)} onSubmit={onSave} />
          : <>
              <button className="btn pri sm" style={{ margin: '12px 0 4px' }} onClick={() => setForm('detect')}><Crosshair size={14} />Use my current location</button>
              {addrs.length === 0 && <div className="empty" style={{ padding: 22 }}>No saved addresses yet.</div>}
              {addrs.map(a => (
                <button type="button" key={a.id} className={'addr' + (a.id === addrId ? ' on' : '')} style={{ marginTop: 10 }} onClick={() => onPick(a.id)}>
                  <span><b>{a.label}{!a.is_self && ' · for ' + a.recipient_name}</b><br /><small>{a.address}</small></span>
                  {a.id === addrId && <span className="badge ok">Selected</span>}
                </button>))}
              <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setForm('new')}><Plus size={14} />Add new address</button>
            </>}
      </div>
    </div>
  )
}
