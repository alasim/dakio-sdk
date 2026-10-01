'use client'
import { useCart } from '@dakio/sdk/react'

export default function BagButton() {
  const cart = useCart()
  return (
    <button className="bag-btn" onClick={cart.open} aria-label="Open bag">
      Bag{cart.ready && cart.count > 0 && <span className="bag-count">{cart.count}</span>}
    </button>
  )
}
