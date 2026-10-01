'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { CartProvider, useVisitPing } from '@dakio/sdk/react'
import { loadPixel } from '@dakio/sdk/pixel'
import { dakio } from '@/lib/dakio'

// Browser-side wiring: the bag (priced by Dakio), the Meta Pixel and the
// merchant's live-visitors count.
export default function Providers({ pixelId, children }: { pixelId: string | null; children: React.ReactNode }) {
  useEffect(() => { loadPixel(pixelId) }, [pixelId])
  return (
    <CartProvider dakio={dakio}>
      <VisitPing />
      {children}
    </CartProvider>
  )
}

function VisitPing() {
  useVisitPing(dakio, usePathname() || '/')
  return null
}
