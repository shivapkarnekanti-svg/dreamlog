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

export type Flag = 'lucid' | 'nightmare' | 'recurring'
export const FLAGS: readonly Flag[] = ['lucid', 'nightmare', 'recurring']

export interface Searchable {
  date: string
  text: string
  emotions?: readonly string[]
  people?: readonly string[]
  places?: readonly string[]
  tags?: readonly string[]
  lucid?: boolean
  nightmare?: boolean
  recurring?: boolean
}

/**
 * Keeps rows whose text, people, places, tags or emotions contain the query (case-insensitive,
 * every word must match somewhere) and that have every selected flag. Undecryptable rows only
 * show when nothing is being filtered.
 */
export function filterDreams<T extends { payload: Searchable | null }>(
  rows: readonly T[],
  query: string,
  flags: readonly Flag[] = [],
): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0 && flags.length === 0) return [...rows]
  return rows.filter(({ payload: p }) => {
    if (!p) return false
    if (!flags.every((f) => p[f] === true)) return false
    const hay = [
      p.text,
      ...(p.people ?? []),
      ...(p.places ?? []),
      ...(p.tags ?? []),
      ...(p.emotions ?? []),
    ]
      .join('\n')
      .toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** Every distinct value used so far, most used first then alphabetical, for suggestions. */
export function collectValues(
  rows: readonly { payload: Searchable | null }[],
  field: 'people' | 'places' | 'tags',
): string[] {
  const counts = new Map<string, number>()
  for (const { payload } of rows) {
    for (const v of payload?.[field] ?? []) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v)
}
