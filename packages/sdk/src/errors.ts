/** Every failure the SDK throws. `code` is stable; switch on it, not on `message`. */
export class DakioError extends Error {
  readonly code: string
  /** HTTP status; 0 when the request never got an answer. */
  readonly status: number
  readonly productId?: string
  readonly attemptsLeft?: number

  constructor(code: string, message: string, status = 0, extra: { productId?: string; attemptsLeft?: number } = {}) {
    super(message)
    this.name = 'DakioError'
    this.code = code
    this.status = status
    if (extra.productId) this.productId = extra.productId
    if (extra.attemptsLeft != null) this.attemptsLeft = extra.attemptsLeft
  }
}

export const isDakioError = (err: unknown): err is DakioError =>
  err instanceof DakioError || (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'DakioError')
