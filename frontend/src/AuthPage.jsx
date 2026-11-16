import { useState } from 'react'
import { ArrowLeft, Cross } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function AuthPage({ onAuth, onBack, pharmacy, setPharmacy }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', phone: '', password: '', address: '' })
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const reg = mode === 'register'
  const phone = f.phone.replace(/\s/g, '')
  const valid = /^[6-9]\d{9}$/.test(phone) && f.password.length >= (reg ? 8 : 1) && (!reg || (f.name.trim().length >= 2 && (!f.address.trim() || f.address.trim().length >= 10)))

  const why = reg && f.name.trim().length < 2 ? 'Enter your name.'
    : !/^[6-9]\d{9}$/.test(phone) ? 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
    : f.password.length < (reg ? 8 : 1) ? (reg ? 'Password must be at least 8 characters.' : 'Enter your password.')
    : reg && f.address.trim() && f.address.trim().length < 10 ? 'Address must be at least 10 characters, or leave it empty.' : ''

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await fetch(`${API}/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, phone }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Request failed')
      onAuth(d, reg ? f.address.trim() : null)
    } catch (e) { setErr(e.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : e.message) }
    setBusy(false)
  }

  return (
    <div className="auth">
      <button className="btn sm" onClick={onBack}><ArrowLeft size={14} />Back</button>
      <div className="logo"><i><Cross size={18} /></i>Medlify</div>
      <h1>{reg ? 'Create your account' : 'Welcome back'}</h1>
      <p className="sub">{reg ? 'Save medicines and track orders across devices.' : 'Log in to see your orders and medicine cabinet.'}</p>
      {pharmacy && <div className="note">Pharmacy sign-in: log in or sign up, then claim or open your pharmacy.</div>}
      <p style={{ textAlign: 'center', margin: '10px 0 0' }}><button type="button" className="btn sm" onClick={() => setPharmacy(!pharmacy)}>{pharmacy ? 'Customer login instead' : 'Pharmacy owner or staff? Pharmacy login'}</button></p>
      <div className="tabs" style={{ margin: '18px 0 14px' }}>
        <button style={{ flex: 1 }} className={!reg ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>Log in</button>
        <button style={{ flex: 1 }} className={reg ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>Sign up</button>
      </div>
      <form className="form" onSubmit={submit}>
        {reg && <input placeholder="Your name" autoComplete="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />}
        <input placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <input type="password" placeholder={reg ? 'Password (min 8 characters)' : 'Password'} autoComplete={reg ? 'new-password' : 'current-password'} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        {reg && <textarea rows={3} placeholder="Delivery address (optional, you can add it later)" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />}
        {why && !err && <p className="sub" style={{ fontSize: 12, margin: '8px 0 0', color: '#D64545', textAlign: 'left' }}>{why}</p>}
        {err && <div className="err" style={{ padding: 12, margin: '8px 0' }}>{err}</div>}
        <button className="btn pri" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} disabled={!valid || busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
      </form>
      <p className="sub" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>Demo only: phone numbers are not verified by OTP.</p>
    </div>
  )
}
