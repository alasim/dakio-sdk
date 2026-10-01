'use client'
import { useEffect, useState } from 'react'
import type { Product } from '@dakio/sdk'
import { useCart } from '@dakio/sdk/react'
import { trackPixel, productParams, newEventId } from '@dakio/sdk/pixel'
import Price from './Price'

export default function BuyBox({ product }: { product: Product }) {
  const cart = useCart()
  const [variantId, setVariantId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  useEffect(() => { trackPixel('ViewContent', productParams(product), newEventId()) }, [product])

  const variant = product.variants.find((v) => v.id === variantId) || null
  const needsVariant = product.variants.length > 0
  const price = variant ? variant.price : product.price
  const compareAt = variant ? variant.compareAtPrice : product.compareAtPrice
  const inStock = variant ? variant.inStock : product.stock.inStock

  const add = () => {
    if (needsVariant && !variant) { setNote('Choose an option first.'); return }
    cart.add({ productId: product.id, variantId: variant?.id ?? null, qty })
    trackPixel('AddToCart', productParams({ ...product, price }, qty), newEventId())
    setNote('')
    cart.open()
  }

  return (
    <>
      <Price price={price} compareAtPrice={compareAt} large />
      {product.campaign && <div className="campaign">{product.campaign.name}</div>}
      {product.shortDescription && <p>{product.shortDescription}</p>}
      {needsVariant && (
        <div className="options">
          <div className="label">Option</div>
          <div className="option-row">
            {product.variants.map((v) => (
              <button key={v.id} className={`option${v.id === variantId ? ' on' : ''}`} disabled={!v.inStock} onClick={() => { setVariantId(v.id); setNote('') }}>{v.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="buy-row">
        <div className="qty qty-lg">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(10, qty + 1))} aria-label="One more">+</button>
        </div>
        <button className="btn btn-grow" disabled={!inStock} onClick={add}>{inStock ? 'Add to bag' : 'Sold out'}</button>
      </div>
      {note && <p className="problem">{note}</p>}
      <p className="muted small">Cash on delivery · We call to confirm before shipping</p>
    </>
  )
}
