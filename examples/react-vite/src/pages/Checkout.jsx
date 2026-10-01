import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart, useCheckout, useAbandonedCart } from '@dakio/sdk/react'
import { DISTRICTS, getThanas, isBdPhone, detectLocation, formatTaka } from '@dakio/sdk/bd'
import { trackPixel, purchaseParams, newEventId } from '@dakio/sdk/pixel'
import { dakio } from '../dakio.js'
import { findLine } from '../components/CartDrawer.jsx'

const COUPON_WORDS = {
  NOT_FOUND: 'That code doesn’t exist.', NOT_STARTED: 'This code isn’t open yet.', CAMPAIGN_NOT_RUNNING: 'This offer isn’t running right now.',
  EXPIRED: 'This code has expired.', USED_UP: 'This code has been used up.',
}

export default function Checkout() {
  const cart = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', district: '', city: '', note: '' })
  const [couponInput, setCouponInput] = useState('')
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  // One event id per action, shared by the browser Pixel and Dakio's server event.
  const ids = useRef({ lead: newEventId('lead'), checkout: newEventId('ic'), purchase: newEventId('pur') })

  const checkout = useCheckout(dakio, {
    onPlaced(order) {
      if (cart.quote) trackPixel('Purchase', purchaseParams(cart.quote), ids.current.purchase)
      navigate(`/order/${encodeURIComponent(order.orderNumber)}`, { state: { order } })
    },
  })

  // Delivery is priced by district: hand it to the bag so its quote includes it.
  useEffect(() => { cart.setDistrict(form.district) }, [form.district])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cart.quote) trackPixel('InitiateCheckout', purchaseParams(cart.quote), ids.current.checkout)
  }, [Boolean(cart.quote)])   // eslint-disable-line react-hooks/exhaustive-deps

  // A buyer who fills in their phone and leaves still reaches the merchant
  // (Incomplete Orders + Nova's follow-up).
  useAbandonedCart(dakio, { ...form, items: cart.lines, leadEventId: ids.current.lead, checkoutEventId: ids.current.checkout })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'district' ? { city: '' } : {}) }))
  const errors = useMemo(() => ({
    name: !form.name.trim() && 'Your name, please.',
    phone: !isBdPhone(form.phone) && 'A Bangladesh mobile number: 01XXXXXXXXX.',
    address: !form.address.trim() && 'Your full address, please.',
    district: !form.district && 'Choose your district.',
    city: !form.city && 'Choose your thana.',
  }), [form])
  const valid = !Object.values(errors).some(Boolean)
  const q = cart.quote

  if (cart.ready && cart.lines.length === 0 && checkout.phase !== 'placed') {
    return <section className="wrap section narrow"><h1>Checkout</h1><p>Your bag is empty.</p><Link to="/shop" className="btn">Shop</Link></section>
  }

  const placeOrder = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || !q?.ok) return
    await checkout.submit({
      customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, address: form.address.trim(), district: form.district, city: form.city },
      items: cart.lines,
      couponCode: cart.couponCode || undefined,
      note: form.note.trim() || undefined,
      eventId: ids.current.purchase,
    })
  }

  const busy = checkout.phase === 'submitting' || checkout.phase === 'verifying'

  return (
    <section className="wrap section checkout">
      <form className="checkout-form" onSubmit={placeOrder} noValidate>
        <h1>Checkout</h1>
        <Field label="Full name" error={touched && errors.name}><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Phone" error={touched && errors.phone}><input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" /></Field>
        <Field label="Email (optional)"><input value={form.email} onChange={set('email')} type="email" autoComplete="email" /></Field>
        <Field label="Full address" error={touched && errors.address}>
          <textarea value={form.address} onChange={set('address')} rows={2} placeholder="House, road, area"
            onBlur={() => {
              if (form.district) return
              const found = detectLocation(form.address)
              if (found.district) setForm((f) => ({ ...f, district: found.district, city: found.thana || '' }))
            }} />
        </Field>
        <div className="two">
          <Field label="District" error={touched && errors.district}>
            <select value={form.district} onChange={set('district')}>
              <option value="">Choose…</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Thana / Upazila" error={touched && errors.city}>
            <select value={form.city} onChange={set('city')} disabled={!form.district}>
              <option value="">Choose…</option>
              {form.district && getThanas(form.district).map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Note (optional)"><input value={form.note} onChange={set('note')} placeholder="Anything we should know" /></Field>

        <div className="pay">
          <b>Cash on delivery</b>
          <span className="muted">Pay when your order arrives. We call to confirm first.</span>
        </div>

        {checkout.phase === 'otp' || checkout.phase === 'verifying' ? (
          <div className="otp">
            <p>We sent a code to <b>{checkout.otp?.maskedPhone}</b>. Enter it to confirm your order.</p>
            <div className="buy-row">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Code" maxLength={6} />
              <button type="button" className="btn" disabled={busy || code.length < 4} onClick={() => checkout.verify(code)}>{busy ? 'Checking…' : 'Confirm'}</button>
            </div>
            {checkout.error && <p className="problem">{checkout.error.message}{checkout.error.attemptsLeft != null ? ` (${checkout.error.attemptsLeft} tries left)` : ''}</p>}
          </div>
        ) : (
          <>
            {checkout.error && <p className="problem">{checkout.error.message}</p>}
            {q && !q.storeAcceptingOrders && <p className="problem">This store isn’t taking orders right now.</p>}
            <button className="btn btn-block" disabled={busy || !q || !q.ok}>
              {busy ? 'Placing your order…' : q ? `Place order · ${formatTaka(q.total)}` : 'Place order'}
            </button>
          </>
        )}
      </form>

      <aside className="summary">
        <h2>Your order</h2>
        {cart.lines.map((line, i) => {
          const l = findLine(q, line, i)
          return (
            <div key={line.productId + ':' + (line.variantId || '')} className="sum-line">
              <div className="line-img">{l?.imageUrl && <img src={l.imageUrl} alt="" />}<span className="pip">{line.qty}</span></div>
              <div className="line-body">
                <div>{l?.name || '…'}</div>
                {l?.variantName && <div className="muted small">{l.variantName}</div>}
                {l?.problem && <div className="problem small">{l.problem.message}</div>}
              </div>
              <div>{l?.lineTotal != null ? formatTaka(l.lineTotal) : ''}</div>
            </div>
          )
        })}

        <div className="coupon">
          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Discount code" />
          <button type="button" className="btn btn-ghost" onClick={() => cart.setCouponCode(couponInput.trim())}>Apply</button>
        </div>
        {q?.coupon && !q.coupon.valid && (
          <p className="problem small">{q.coupon.reason === 'MIN_ORDER' ? `Spend ${formatTaka(q.coupon.minOrder)} to use this code.` : COUPON_WORDS[q.coupon.reason] || 'This code can’t be used.'}</p>
        )}

        <div className="row"><span>Subtotal</span><span>{q ? formatTaka(q.subtotal) : '…'}</span></div>
        {q?.discount > 0 && <div className="row"><span>Discount ({q.coupon?.code})</span><span>−{formatTaka(q.discount)}</span></div>}
        <div className="row"><span>Delivery{form.district ? ` (${form.district})` : ''}</span><span>{q?.shipping ? formatTaka(q.shipping.charge) : 'Choose district'}</span></div>
        <div className="row total"><span>Total</span><span>{q ? formatTaka(q.total) : '…'}</span></div>
        {cart.quoting && <p className="muted small">Updating…</p>}
      </aside>
    </section>
  )
}

function Field({ label, error, children }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  )
}
