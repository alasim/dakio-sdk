import { notFound } from 'next/navigation'
import { productJsonLd, productMetadata, jsonLdScript } from '@dakio/sdk/next'
import { dakio, siteUrl } from '@/lib/dakio'
import { getStore } from '@/lib/store'
import BuyBox from '@/components/BuyBox'
import Gallery from '@/components/Gallery'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const [product, store] = await Promise.all([dakio.products.get(slug), getStore()])
  return product ? productMetadata(product, store, { url: `${siteUrl}/p/${product.slug}` }) : {}
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const [product, store] = await Promise.all([dakio.products.get(slug), getStore()])
  if (!product) notFound()
  const url = `${siteUrl}/p/${product.slug}`
  return (
    <section className="wrap section product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, store, { url })) }} />
      <Gallery images={product.images} name={product.name} />
      <div className="buy">
        {product.category && <div className="muted">{product.category.name}</div>}
        <h1>{product.name}</h1>
        <BuyBox product={product} />
        {product.description && <div className="rich" dangerouslySetInnerHTML={{ __html: product.description }} />}
        {product.contentTabs?.map((t) => (
          <details key={t.key} className="tab">
            <summary>{t.title}</summary>
            <div className="rich" dangerouslySetInnerHTML={{ __html: t.html }} />
          </details>
        ))}
      </div>
    </section>
  )
}
