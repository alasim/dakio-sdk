import { Link } from 'react-router-dom'
import Price from './Price.jsx'

export default function ProductCard({ product }) {
  return (
    <Link to={`/p/${product.slug}`} className="card">
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
