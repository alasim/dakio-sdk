'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { TrackedOrder } from '@dakio/sdk'
import { formatTaka } from '@dakio/sdk/bd'
import { dakio } from '@/lib/dakio'

export default function TrackView() {
  const params = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<{ loading: boolean; order: TrackedOrder | null; error: string }>({ loading: false, order: null, error: '' })

  const find = async (e: React.FormEvent) => {
    e.preventDefault()
    setState({ loading: true, order: null, error: '' })
    try {
      const order = await dakio.orders.track({ orderNumber, phone })
      setState({ loading: false, order, error: order ? '' : 'No order with that number and phone.' })
    } catch (err) {
      setState({ loading: false, order: null, error: (err as Error).message })
    }
  }
  const o = state.order

  return (
    <section className="wrap section narrow">
      <h1>Track your order</h1>
      <form className="stack" onSubmit={find}>
        <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order number, e.g. #ABC-DEFG" required />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone you ordered with" inputMode="tel" required />
        <button className="btn" disabled={state.loading}>{state.loading ? 'Looking…' : 'Track'}</button>
      </form>
      {state.error && <p className="problem">{state.error}</p>}
      {o && (
        <div className="track">
          <h2>{o.orderNumber} · {o.statusLabel}</h2>
          {o.timeline.length > 0 ? (
            <ol className="timeline">{o.timeline.map((s) => <li key={s.key} className={s.done ? (s.current ? 'current' : 'done') : ''}>{s.label}</li>)}</ol>
          ) : <p>This order was {o.status === 'returned' ? 'returned' : 'cancelled'}.</p>}
          {o.courier && <p className="muted">Courier: {o.courier}</p>}
          {o.items.map((i, k) => <div key={k} className="row"><span>{i.qty} × {i.name}</span><span>{formatTaka(i.total)}</span></div>)}
          <div className="row total"><span>{o.codAmount != null ? 'Pay on delivery' : 'Total'}</span><span>{formatTaka(o.codAmount ?? o.total)}</span></div>
        </div>
      )}
    </section>
  )
}
