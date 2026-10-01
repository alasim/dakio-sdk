import { Link, useLocation, useParams } from 'react-router-dom'
import { formatTaka } from '@dakio/sdk/bd'

export default function OrderPlaced() {
  const { orderNumber } = useParams()
  const { state } = useLocation()
  const order = state?.order
  return (
    <section className="wrap section narrow center">
      <div className="tick">✓</div>
      <h1>Thank you — your order is placed</h1>
      <p>Order <b>{orderNumber}</b>{order ? <> · {formatTaka(order.total)} cash on delivery</> : null}</p>
      {order?.test && <p className="test-note">Test order — made with a test key. No stock moved and the store won’t ship it.</p>}
      <p className="muted">We’ll call you to confirm before shipping.</p>
      <div className="buy-row center-row">
        <Link to={`/track?order=${encodeURIComponent(orderNumber)}`} className="btn">Track this order</Link>
        <Link to="/shop" className="btn btn-ghost">Keep shopping</Link>
      </div>
    </section>
  )
}
