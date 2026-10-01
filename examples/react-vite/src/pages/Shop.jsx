import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { dakio } from '../dakio.js'
import { useStore } from '../StoreContext.jsx'
import ProductCard from '../components/ProductCard.jsx'

const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['name_asc', 'Name']]

export default function Shop() {
  const { category } = useParams()
  const [params, setParams] = useSearchParams()
  const { categories } = useStore()
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page') || 1)
  const [result, setResult] = useState(null)
  const current = categories.find((c) => c.slug === category)

  useEffect(() => {
    setResult(null)
    dakio.products.list({ category, search: search || undefined, sort, page, limit: 24 })
      .then(setResult)
      .catch(() => setResult({ data: [], page: 1, totalPages: 0, total: 0 }))
  }, [category, search, sort, page])

  const set = (k, v) => { const next = new URLSearchParams(params); v ? next.set(k, v) : next.delete(k); if (k !== 'page') next.delete('page'); setParams(next) }

  return (
    <section className="wrap section">
      <div className="section-head">
        <h1>{search ? `“${search}”` : current?.name || 'Shop all'}</h1>
        <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {result === null ? <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" />)}</div>
        : result.data.length === 0 ? <p className="muted">Nothing here yet.</p>
        : <div className="grid">{result.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      {result?.totalPages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => set('page', String(page - 1))}>← Previous</button>
          <span>Page {page} of {result.totalPages}</span>
          <button disabled={page >= result.totalPages} onClick={() => set('page', String(page + 1))}>Next →</button>
        </div>
      )}
    </section>
  )
}
