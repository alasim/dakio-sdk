import type { Metadata } from 'next'
import { setupError, siteUrl } from '@/lib/dakio'
import { getCategories, getStore } from '@/lib/store'
import Providers from '@/components/Providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'
import './globals.css'

// Catalog pages are rendered on the server (good for Google) and refreshed
// from Dakio at most once a minute.
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  if (setupError) return { title: 'Connect your Dakio store' }
  const store = await getStore()
  return {
    metadataBase: new URL(siteUrl),
    title: { default: store.name, template: `%s | ${store.name}` },
    description: store.description || undefined,
    icons: store.faviconUrl ? [{ url: store.faviconUrl }] : undefined,
    openGraph: { siteName: store.name, ...(store.logoUrl ? { images: [{ url: store.logoUrl }] } : {}) },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (setupError) return <html lang="en"><body><Setup message={setupError} /></body></html>
  const [store, categories] = await Promise.all([getStore(), getCategories()])
  return (
    <html lang="en" style={store.accentColor ? ({ '--accent': store.accentColor } as React.CSSProperties) : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers pixelId={store.tracking.metaPixelId}>
          {store.announcement && <div className="announce">{store.announcement}</div>}
          <Header store={store} categories={categories} />
          <main>{children}</main>
          <Footer store={store} />
          <CartDrawer delivery={store.delivery} />
        </Providers>
      </body>
    </html>
  )
}

function Setup({ message }: { message: string }) {
  return (
    <div className="setup">
      <h1>Connect your Dakio store</h1>
      <p>{message}</p>
      <ol>
        <li>In Dakio, open <b>Settings → Developers</b> and create a key (a <b>Test</b> key while you build).</li>
        <li>Copy <code>.env.example</code> to <code>.env.local</code> and set <code>NEXT_PUBLIC_DAKIO_KEY</code>.</li>
        <li>Restart <code>npm run dev</code>.</li>
      </ol>
    </div>
  )
}
