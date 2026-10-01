import Link from 'next/link'
import { dakio } from '@/lib/dakio'
import { getCategories, getStore } from '@/lib/store'
import ProductCard from '@/components/ProductCard'

export default async function Home() {
  const [store, categories, latest] = await Promise.all([getStore(), getCategories(), dakio.products.list({ limit: 8, sort: 'newest' })])
  const withProducts = categories.filter((c) => c.productCount > 0)
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>{store.name}</h1>
          {store.description && <p>{store.description}</p>}
          <Link href="/shop" className="btn">Shop now</Link>
        </div>
      </section>
      {withProducts.length > 0 && (
        <section className="wrap section">
          <div className="chips">{withProducts.map((c) => <Link key={c.id} href={`/shop/${c.slug}`} className="chip">{c.name}</Link>)}</div>
        </section>
      )}
      <section className="wrap section">
        <div className="section-head"><h2>New in</h2><Link href="/shop">See all</Link></div>
        {latest.data.length === 0 ? <p className="muted">No products yet.</p>
          : <div className="grid">{latest.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      </section>
    </>
  )
}
