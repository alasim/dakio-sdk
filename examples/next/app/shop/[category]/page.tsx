import { notFound } from 'next/navigation'
import { siteUrl } from '@/lib/dakio'
import { getCategories } from '@/lib/store'
import ShopView, { parseSort } from '@/components/ShopView'

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ sort?: string; page?: string }> }

export async function generateMetadata({ params }: Props) {
  const { category } = await params
  const c = (await getCategories()).find((x) => x.slug === category)
  return c ? { title: c.name, alternates: { canonical: `${siteUrl}/shop/${c.slug}` } } : {}
}

export default async function Category({ params, searchParams }: Props) {
  const [{ category }, sp] = await Promise.all([params, searchParams])
  const c = (await getCategories()).find((x) => x.slug === category)
  if (!c) notFound()
  return <ShopView title={c.name} category={c.slug} sort={parseSort(sp.sort)} page={Math.max(1, Number(sp.page) || 1)} />
}
