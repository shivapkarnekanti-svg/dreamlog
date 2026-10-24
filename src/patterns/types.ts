// Shape shared by the pattern functions (compute.ts) and the dashboard (Dashboard.tsx).
// Everything is computed in the browser from decrypted dreams; nothing here is stored.

export type Facet = 'people' | 'places' | 'tags' | 'emotions'

export interface Count {
  value: string
  count: number
  /** Share of all dreams that mention it, 0..1. */
  share: number
}

export interface MonthPoint {
  /** 'YYYY-MM' */
  month: string
  dreams: number
  nightmares: number
  lucid: number
}

export interface Pair {
  a: string
  b: string
  together: number
  /** How many times more often they appear together than chance. Only pairs with together >= 3. */
  lift: number
}

export interface Trend {
  value: string
  facet: Facet
  /** Count in the last 30 days vs the 30 days before. */
  recent: number
  before: number
}

export interface RecurringGroup {
  /** Dream ids, oldest first; similarity >= threshold to at least one other in the group. */
  ids: string[]
  /** Top shared keywords. */
  keywords: string[]
}

export interface Patterns {
  total: number
  firstDate: string | null
  lastDate: string | null
  top: Record<Facet, Count[]>
  months: MonthPoint[]
  /** Index 0 = Monday. */
  weekday: number[]
  rates: { nightmare: number; lucid: number; recurring: number }
  pairs: Pair[]
  /** Average sleep quality / waking mood on nightmare nights vs other nights (null if no data). */
  sleep: { nightmare: number | null; other: number | null }
  mood: { nightmare: number | null; other: number | null }
  rising: Trend[]
  fading: Trend[]
  keywords: Count[]
  phrases: Count[]
  recurring: RecurringGroup[]
}

export interface PatternInput {
  id: string
  date: string
  text: string
  people: string[]
  places: string[]
  tags: string[]
  emotions: string[]
  lucid: boolean
  nightmare: boolean
  recurring: boolean
  sleepQuality: number | null
  wakingMood: number | null
}
