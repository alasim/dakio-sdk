import type { CartLine, Quote, QuoteLine } from '@dakio/sdk'

// The quote line for a bag line (same order; matched by product + option in
// case the bag changed while it was being priced).
export function findLine(quote: Quote | null, line: CartLine, i: number): QuoteLine | null {
  if (!quote) return null
  const match = (l: QuoteLine) => l.productId === line.productId && (!line.variantId || l.variantId === line.variantId)
  const at = quote.lines[i]
  return at && match(at) ? at : quote.lines.find(match) || null
}
