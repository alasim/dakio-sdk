import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CartProvider, useVisitPing } from '@dakio/sdk/react'
import { dakio, setupError } from './dakio.js'
import { StoreProvider, useStore } from './StoreContext.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderPlaced from './pages/OrderPlaced.jsx'
import Track from './pages/Track.jsx'
import Account from './pages/Account.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  if (setupError) return <Setup error={setupError} />
  return (
    <BrowserRouter>
      <StoreProvider>
        <CartProvider dakio={dakio}>
          <Layout />
        </CartProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}

function Layout() {
  const { store, error } = useStore()
  const { pathname } = useLocation()
  useVisitPing(dakio, pathname)   // the merchant's live-visitors count

  if (error) return <Setup error={error} />
  return (
    <>
      {store?.announcement && <div className="announce">{store.announcement}</div>}
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/p/:slug" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderNumber" element={<OrderPlaced />} />
          <Route path="/track" element={<Track />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}

function Setup({ error }) {
  return (
    <div className="setup">
      <h1>Connect your Dakio store</h1>
      <p>{error.message}</p>
      <ol>
        <li>In Dakio, open <b>Settings → Developers</b> and create a key (a <b>Test</b> key while you build).</li>
        <li>Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_DAKIO_KEY</code>.</li>
        <li>Restart <code>npm run dev</code>.</li>
      </ol>
      {error.code === 'ORIGIN_NOT_ALLOWED' && <p>This is a live key: add this website under <b>Allowed websites</b>, or use a test key.</p>}
    </div>
  )
}
