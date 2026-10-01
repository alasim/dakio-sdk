import ShopView, { parseSort } from '@/components/ShopView'

export const metadata = { title: 'Shop' }

export default async function Shop({ searchParams }: { searchParams: Promise<{ search?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams
  return <ShopView title={sp.search ? `“${sp.search}”` : 'Shop all'} search={sp.search} sort={parseSort(sp.sort)} page={Math.max(1, Number(sp.page) || 1)} />
}
