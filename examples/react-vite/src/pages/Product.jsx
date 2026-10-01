import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCart } from '@dakio/sdk/react'
import { trackPixel, productParams, newEventId } from '@dakio/sdk/pixel'
import { dakio } from '../dakio.js'
import Price from '../components/Price.jsx'
import NotFound from './NotFound.jsx'

export default function Product() {
  const { slug } = useParams()
  const cart = useCart()
  const [product, setProduct] = useState(undefined)
  const [variantId, setVariantId] = useState(null)
  const [image, setImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  useEffect(() => {
    setProduct(undefined); setVariantId(null); setImage(0); setQty(1)
    dakio.products.get(slug).then((p) => {
      setProduct(p)
      if (p) {
        document.title = p.name
        trackPixel('ViewContent', productParams(p), newEventId())
      }
    }).catch(() => setProduct(null))
  }, [slug])

  if (product === undefined) return <div className="wrap section"><div className="product skeleton-block" /></div>
  if (product === null) return <NotFound />

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
    <section className="wrap section product">
      <div className="gallery">
        <div className="gallery-main">{product.images[image] ? <img src={product.images[image]} alt={product.name} /> : <div className="img-empty" />}</div>
        {product.images.length > 1 && (
          <div className="thumbs">
            {product.images.map((src, i) => <button key={src} className={i === image ? 'on' : ''} onClick={() => setImage(i)}><img src={src} alt="" /></button>)}
          </div>
        )}
      </div>
      <div className="buy">
        {product.category && <div className="muted">{product.category.name}</div>}
        <h1>{product.name}</h1>
        <Price price={price} compareAtPrice={compareAt} large />
        {product.campaign && <div className="campaign">{product.campaign.name}</div>}
        {product.shortDescription && <p>{product.shortDescription}</p>}

        {needsVariant && (
          <div className="options">
            <div className="label">Option</div>
            <div className="option-row">
              {product.variants.map((v) => (
                <button key={v.id} className={`option${v.id === variantId ? ' on' : ''}`} disabled={!v.inStock} onClick={() => { setVariantId(v.id); setNote('') }}>
                  {v.name}
                </button>
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

        {product.description && <div className="rich" dangerouslySetInnerHTML={{ __html: product.description }} />}
        {product.contentTabs?.map((t) => (
          <details key={t.key} className="tab">
            <summary>{t.title}</summary>
            <div className="rich" dangerouslySetInnerHTML={{ __html: t.html }} />
          </details>
        ))}
      </div>
    </section>
  )
}
