export const MAX_TEXT = 20000
export const PREVIEW_CHARS = 120

export interface DreamRow<P extends { date: string } = { date: string }> {
  id: string
  createdAt: Date
  /** null when decryption failed. */
  payload: P | null
}

/** Newest dream date first; ties and undecryptable rows fall back to createdAt, newest first. */
export function sortDreams<T extends DreamRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.payload?.date ?? ''
    const db = b.payload?.date ?? ''
    if (da !== db) return da < db ? 1 : -1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

/** First ~max characters on one line, with an ellipsis when cut. */
export function previewText(text: string, max = PREVIEW_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  return chars.length <= max ? flat : chars.slice(0, max).join('').trimEnd() + '…'
}

/** Local today as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
