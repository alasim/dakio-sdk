import OrderPlacedView from '@/components/OrderPlacedView'

export const metadata = { title: 'Order placed', robots: { index: false } }

export default async function OrderPlaced({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  return <OrderPlacedView orderNumber={decodeURIComponent(orderNumber)} />
}
