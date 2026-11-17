import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { AddressManager } from './Addresses.jsx'
import MedThumb from './MedThumb.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Profile({ auth, addrs, onSaveAddr, onDelAddr, onSearch, onOrders, onLogout }) {
  const { token, user } = auth
  const [cab, setCab] = useState(null), [cabErr, setCabErr] = useState('')
  const call = (path, method = 'GET') => fetch(API + path, { method, headers: { Authorization: 'Bearer ' + token } })
    .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d })
  useEffect(() => { call('/api/me/cabinet').then(setCab).catch(e => { setCab([]); setCabErr(e.message) }) }, [])
  async function remove(id) {
    try {
      await call('/api/me/cabinet/' + id, 'DELETE')
      setCab(c => c.filter(m => m.id !== id))
      try { localStorage.setItem('medlify_cabinet', JSON.stringify(JSON.parse(localStorage.getItem('medlify_cabinet') || '[]').filter(m => m.id !== id))) } catch {}
    } catch (e) { setCabErr(e.message) }
  }
  return (
    <div style={{ marginTop: 32 }}>
      <h1 style={{ marginTop: 0 }}>Your profile</h1>
      <p className="sub">{user.name} · {user.phone}</p>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 4px' }}>
        <button className="btn sm" onClick={onOrders}>View my orders</button>
        <button className="btn sm" onClick={onLogout}>Log out</button>
      </div>
      <div className="dx-cab">
        <h3>Saved addresses</h3>
        <p className="sub" style={{ fontSize: 13 }}>Your own addresses, or addresses for family and friends you order for.</p>
        <AddressManager addrs={addrs} user={user} onSave={onSaveAddr} onDelete={onDelAddr} />
      </div>
      <div className="dx-cab">
        <h3>Saved medicines</h3>
        <p className="sub" style={{ fontSize: 13 }}>Your medicine cabinet. Save more with the bookmark on Explore.</p>
        {cabErr && <div className="err" style={{ padding: 12, marginBottom: 10 }}>{cabErr}</div>}
        {cab === null && <div className="skel" />}
        {cab && cab.length === 0 && !cabErr && <div className="empty" style={{ padding: 22 }}>Nothing saved yet.</div>}
        <div className="dx-list" style={{ marginTop: 12 }}>
          {(cab || []).map(m => (
            <div className="dx-med" key={m.id}><MedThumb name={m.name} form={m.form} />
              <div className="dx-info"><b>{m.name}</b><small>{m.generic_name}</small>{m.rx && <div className="meta" style={{ marginTop: 6 }}><span className="badge rx">Rx</span></div>}</div>
              <div className="dx-actions">
                <button className="btn sm" onClick={() => onSearch(m.name)}><Search size={14} />Find pharmacies</button>
                <button className="btn sm" aria-label={'Remove ' + m.name} onClick={() => remove(m.id)}><X size={14} /></button>
              </div>
            </div>))}
        </div>
      </div>
    </div>
  )
}
