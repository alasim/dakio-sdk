'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatTaka } from '@dakio/sdk/bd'

export default function OrderPlacedView({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<{ total: number; test?: boolean } | null>(null)
  useEffect(() => {
    try {
      const o = JSON.parse(sessionStorage.getItem('dakio-last-order') || 'null')
      if (o?.orderNumber === orderNumber) setOrder(o)
    } catch { /* fine */ }
  }, [orderNumber])
  return (
    <section className="wrap section narrow center">
      <div className="tick">✓</div>
      <h1>Thank you — your order is placed</h1>
      <p>Order <b>{orderNumber}</b>{order ? <> · {formatTaka(order.total)} cash on delivery</> : null}</p>
      {order?.test && <p className="test-note">Test order — made with a test key. No stock moved and the store won’t ship it.</p>}
      <p className="muted">We’ll call you to confirm before shipping.</p>
      <div className="buy-row center-row">
        <Link href={`/track?order=${encodeURIComponent(orderNumber)}`} className="btn">Track this order</Link>
        <Link href="/shop" className="btn btn-ghost">Keep shopping</Link>
      </div>
    </section>
  )
}
