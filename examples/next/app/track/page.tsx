import { Suspense } from 'react'
import TrackView from '@/components/TrackView'

export const metadata = { title: 'Track your order' }

export default function Track() {
  return <Suspense><TrackView /></Suspense>
}
