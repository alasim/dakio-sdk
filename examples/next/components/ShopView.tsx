import Link from 'next/link'
import type { Sort } from '@dakio/sdk'
import { dakio } from '@/lib/dakio'
import ProductCard from './ProductCard'

const SORTS: [Sort, string][] = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['name_asc', 'Name']]

// A server component: the listing is in the HTML Google reads.
export default async function ShopView({ title, category, search, sort, page }: { title: string; category?: string; search?: string; sort: Sort; page: number }) {
  const result = await dakio.products.list({ category, search, sort, page, limit: 24 })
  const base = category ? `/shop/${category}` : '/shop'
  const href = (over: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const all = { search, sort: sort === 'newest' ? undefined : sort, page: page > 1 ? page : undefined, ...over }
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== '') q.set(k, String(v))
    const s = q.toString()
    return s ? `${base}?${s}` : base
  }
  return (
    <section className="wrap section">
      <div className="section-head">
        <h1>{title}</h1>
        <div className="chips">{SORTS.map(([v, l]) => <Link key={v} href={href({ sort: v === 'newest' ? undefined : v, page: undefined })} className="chip" style={v === sort ? { borderColor: 'var(--ink)' } : undefined}>{l}</Link>)}</div>
      </div>
      {result.data.length === 0 ? <p className="muted">Nothing here yet.</p>
        : <div className="grid">{result.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      {result.totalPages > 1 && (
        <div className="pager">
          {page > 1 ? <Link href={href({ page: page - 1 })}>← Previous</Link> : <span />}
          <span>Page {page} of {result.totalPages}</span>
          {page < result.totalPages ? <Link href={href({ page: page + 1 })}>Next →</Link> : <span />}
        </div>
      )}
    </section>
  )
}

export const parseSort = (s?: string): Sort => (['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc'].includes(s || '') ? s as Sort : 'newest')
