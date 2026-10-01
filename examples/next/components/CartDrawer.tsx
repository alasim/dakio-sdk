'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useCart } from '@dakio/sdk/react'
import { formatTaka } from '@dakio/sdk/bd'
import { findLine } from './findLine'

// Every number comes from cart.quote — Dakio's pricing, the same checkout charges.
export default function CartDrawer({ delivery }: { delivery: { insideDhaka: number; outsideDhaka: number } }) {
  const cart = useCart()
  const q = cart.quote

  useEffect(() => {
    if (!cart.isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cart.close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cart.isOpen, cart.close])

  if (!cart.isOpen) return null
  return (
    <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label="Your bag">
      <div className="drawer-scrim" onClick={cart.close} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Your bag {cart.count > 0 && `(${cart.count})`}</h2>
          <button className="icon-btn" onClick={cart.close} aria-label="Close">×</button>
        </div>
        {cart.lines.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty.</p>
            <Link href="/shop" className="btn" onClick={cart.close}>Start shopping</Link>
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {cart.lines.map((line, i) => {
                const priced = findLine(q, line, i)
                return (
                  <div key={line.productId + ':' + (line.variantId || '')} className="line">
                    <div className="line-img">{priced?.imageUrl && <img src={priced.imageUrl} alt="" />}</div>
                    <div className="line-body">
                      <div className="line-name">{priced?.name || '…'}</div>
                      {priced?.variantName && <div className="muted">{priced.variantName}</div>}
                      {priced?.problem && <div className="problem">{priced.problem.message}</div>}
                      <div className="qty">
                        <button onClick={() => cart.setQty(line.productId, line.variantId, line.qty - 1)} aria-label="One less">−</button>
                        <span>{line.qty}</span>
                        <button onClick={() => cart.setQty(line.productId, line.variantId, line.qty + 1)} aria-label="One more">+</button>
                        <button className="link" onClick={() => cart.remove(line.productId, line.variantId)}>Remove</button>
                      </div>
                    </div>
                    <div className="line-price">{priced?.lineTotal != null ? formatTaka(priced.lineTotal) : ''}</div>
                  </div>
                )
              })}
            </div>
            <div className="drawer-foot">
              <div className="row"><span>Subtotal</span><b>{q ? formatTaka(q.subtotal) : '…'}</b></div>
              <div className="row muted"><span>Delivery</span><span>{formatTaka(delivery.insideDhaka)} in Dhaka · {formatTaka(delivery.outsideDhaka)} elsewhere</span></div>
              <Link href="/checkout" className={`btn btn-block${q && !q.ok ? ' btn-disabled' : ''}`} onClick={cart.close}>Checkout</Link>
              <p className="muted center small">Cash on delivery</p>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
