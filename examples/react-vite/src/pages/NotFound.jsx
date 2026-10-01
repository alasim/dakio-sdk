import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="wrap section narrow center">
      <h1>Page not found</h1>
      <p className="muted">It may have moved, or the product is no longer available.</p>
      <Link to="/shop" className="btn">Go to the shop</Link>
    </section>
  )
}
