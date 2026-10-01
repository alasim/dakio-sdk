import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '@dakio/sdk/react'
import { useStore } from '../StoreContext.jsx'

export default function Header() {
  const { store, categories } = useStore()
  const cart = useCart()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const top = categories.filter((c) => !c.parentId && c.productCount > 0).slice(0, 5)

  return (
    <header className="header">
      <div className="wrap header-row">
        <Link to="/" className="logo">
          {store?.logoUrl ? <img src={store.logoUrl} alt={store.name} /> : <span>{store?.name || ' '}</span>}
        </Link>
        <nav className="nav">
          <NavLink to="/shop" end>Shop all</NavLink>
          {top.map((c) => <NavLink key={c.id} to={`/shop/${c.slug}`}>{c.name}</NavLink>)}
        </nav>
        <form className="search" onSubmit={(e) => { e.preventDefault(); navigate(`/shop?search=${encodeURIComponent(q)}`) }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search products" />
        </form>
        <div className="header-links">
          <Link to="/shop" className="mobile-only">Shop</Link>
          <Link to="/track">Track</Link>
          <Link to="/account">My orders</Link>
          <button className="bag-btn" onClick={cart.open} aria-label="Open bag">
            Bag{cart.ready && cart.count > 0 && <span className="bag-count">{cart.count}</span>}
          </button>
        </div>
      </div>
    </header>
  )
}
