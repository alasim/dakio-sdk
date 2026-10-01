import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dakio } from '../dakio.js'
import { useStore } from '../StoreContext.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function Home() {
  const { store, categories } = useStore()
  const [products, setProducts] = useState(null)

  useEffect(() => {
    dakio.products.list({ limit: 8, sort: 'newest' }).then((r) => setProducts(r.data)).catch(() => setProducts([]))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>{store?.name || ' '}</h1>
          {store?.description && <p>{store.description}</p>}
          <Link to="/shop" className="btn">Shop now</Link>
        </div>
      </section>

      {categories.some((c) => c.productCount > 0) && (
        <section className="wrap section">
          <div className="chips">
            {categories.filter((c) => c.productCount > 0).map((c) => <Link key={c.id} to={`/shop/${c.slug}`} className="chip">{c.name}</Link>)}
          </div>
        </section>
      )}

      <section className="wrap section">
        <div className="section-head"><h2>New in</h2><Link to="/shop">See all</Link></div>
        {products === null ? <div className="grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="card skeleton" />)}</div>
          : products.length === 0 ? <p className="muted">No products yet.</p>
          : <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      </section>
    </>
  )
}
