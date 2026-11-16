import { useState } from 'react'
import { ArrowLeft, Check, Store } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function PharmacyAuth({ onAuth, onBack }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', phone: '', password: '' })
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const reg = mode === 'register'
  const why = reg && f.name.trim().length < 2 ? 'Enter the owner or manager name.'
    : !/^[6-9]\d{9}$/.test(f.phone) ? 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
    : f.password.length < (reg ? 8 : 1) ? (reg ? 'Password must be at least 8 characters.' : 'Enter your password.') : ''

  async function submit(e) {
    e.preventDefault()
    if (why) return setErr(why)
    setBusy(true); setErr('')
    try {
      const r = await fetch(`${API}/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Request failed')
      onAuth(d)
    } catch (e) { setErr(e.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : e.message) }
    setBusy(false)
  }

  return (
    <div className="auth" style={{ maxWidth: 520 }}>
      <button className="btn sm" onClick={onBack}><ArrowLeft size={14} />Back to Medlify</button>
      <div className="logo"><i><Store size={18} /></i>Medlify for Pharmacies</div>
      <h1>{reg ? 'Register your pharmacy' : 'Pharmacy sign in'}</h1>
      <p className="sub">List the medicines you stock and reach customers near you.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '14px auto', maxWidth: 360, display: 'grid', gap: 6, fontSize: 14 }}>
        {['Choose which medicines you stock', 'Update quantity and price in seconds', 'Changes show instantly to nearby customers'].map(t => (
          <li key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Check size={16} color="#0E9F85" />{t}</li>))}
      </ul>
      <div className="tabs" style={{ margin: '18px 0 14px' }}>
        <button style={{ flex: 1 }} className={!reg ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>Log in</button>
        <button style={{ flex: 1 }} className={reg ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>Register</button>
      </div>
      <form className="form" onSubmit={submit}>
        {reg && <input placeholder="Owner or manager name" autoComplete="name" value={f.name} onChange={e => { setF({ ...f, name: e.target.value }); setErr('') }} />}
        <input placeholder="Mobile number (10 digits)" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={e => { setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }); setErr('') }} />
        <input type="password" placeholder={reg ? 'Password (min 8 characters)' : 'Password'} autoComplete={reg ? 'new-password' : 'current-password'} value={f.password} onChange={e => { setF({ ...f, password: e.target.value }); setErr('') }} />
        {(err || why) && <p className="sub" style={{ fontSize: 12, color: '#D64545', margin: '8px 0 0', textAlign: 'left' }}>{err || why}</p>}
        <button className="btn pri" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} disabled={busy || !!why}>{busy ? 'Please wait…' : reg ? 'Create account and continue' : 'Log in to dashboard'}</button>
      </form>
      {reg && <p className="sub" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>Step 1 of 2. Next you will pick your pharmacy and enter your drug licence number.</p>}
      <p className="sub" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>Demo only: phone numbers are not verified by OTP.</p>
    </div>
  )
}
