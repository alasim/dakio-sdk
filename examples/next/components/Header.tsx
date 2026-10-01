import Link from 'next/link'
import type { Category, Store } from '@dakio/sdk'
import BagButton from './BagButton'
import SearchBox from './SearchBox'

export default function Header({ store, categories }: { store: Store; categories: Category[] }) {
  const top = categories.filter((c) => !c.parentId && c.productCount > 0).slice(0, 5)
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" className="logo">{store.logoUrl ? <img src={store.logoUrl} alt={store.name} /> : <span>{store.name}</span>}</Link>
        <nav className="nav">
          <Link href="/shop">Shop all</Link>
          {top.map((c) => <Link key={c.id} href={`/shop/${c.slug}`}>{c.name}</Link>)}
        </nav>
        <SearchBox />
        <div className="header-links">
          <Link href="/shop" className="mobile-only">Shop</Link>
          <Link href="/track">Track</Link>
          <Link href="/account">My orders</Link>
          <BagButton />
        </div>
      </div>
    </header>
  )
}
