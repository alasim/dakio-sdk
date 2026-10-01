import { formatTaka } from '@dakio/sdk/bd'

export default function Price({ price, compareAtPrice, large }: { price: number; compareAtPrice?: number | null; large?: boolean }) {
  return (
    <span className={large ? 'price price-lg' : 'price'}>
      <span>{formatTaka(price)}</span>
      {compareAtPrice != null && compareAtPrice > price && (
        <>
          <s>{formatTaka(compareAtPrice)}</s>
          <em>−{Math.round((1 - price / compareAtPrice) * 100)}%</em>
        </>
      )}
    </span>
  )
}
