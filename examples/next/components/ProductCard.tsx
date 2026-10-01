import Link from 'next/link'
import type { Product } from '@dakio/sdk'
import Price from './Price'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/p/${product.slug}`} className="card">
      <div className="card-img">
        {product.images[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <div className="img-empty" />}
        {product.onSale && <span className="badge">Sale</span>}
        {!product.onSale && product.isNew && <span className="badge badge-new">New</span>}
        {!product.stock.inStock && <span className="badge badge-out">Sold out</span>}
      </div>
      <div className="card-name">{product.name}</div>
      <Price price={product.price} compareAtPrice={product.compareAtPrice} />
    </Link>
  )
}
