import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatTaka } from '@dakio/sdk/bd'
import { dakio } from '../dakio.js'

// "My orders": no passwords — a code by SMS to the phone you order with.
export default function Account() {
  const [phone, setPhone] = useState('')
  const [session, setSession] = useState(null)
  const [code, setCode] = useState('')
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = (fn) => async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <section className="wrap section narrow">
      <h1>My orders</h1>
      {!session && (
        <form className="stack" onSubmit={run(async () => setSession(await dakio.account.sendCode(phone)))}>
          <p className="muted">Enter the phone number you order with. We’ll text you a code.</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" required />
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      )}
      {session && !orders && (
        <form className="stack" onSubmit={run(async () => setOrders(await dakio.account.orders({ sessionToken: session.sessionToken, otp: code })))}>
          <p>Enter the code we sent to {phone}.{session.devCode ? ` (Test code: ${session.devCode})` : ''}</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Code" required />
          <button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Show my orders'}</button>
        </form>
      )}
      {error && <p className="problem">{error}</p>}
      {orders && (orders.length === 0 ? <p>No orders on this phone yet.</p> : (
        <div className="orders">
          {orders.map((o) => (
            <Link key={o.orderNumber} to={`/track?order=${encodeURIComponent(o.orderNumber)}`} className="order-row">
              <span><b>{o.orderNumber}</b><br /><span className="muted small">{new Date(o.placedAt).toLocaleDateString()}</span></span>
              <span>{o.statusLabel}</span>
              <span>{formatTaka(o.total)}</span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  )
}
