'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchBox() {
  const router = useRouter()
  const [q, setQ] = useState('')
  return (
    <form className="search" onSubmit={(e) => { e.preventDefault(); router.push(`/shop?search=${encodeURIComponent(q)}`) }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search products" />
    </form>
  )
}
