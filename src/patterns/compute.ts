import { findRecurring, keywordsAndPhrases } from './text'
import type { Count, Facet, MonthPoint, Pair, PatternInput, Patterns, Trend } from './types'

const FACETS: Facet[] = ['people', 'places', 'tags', 'emotions']
const DAY_MS = 86_400_000

function parseDate(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number)
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 }
}

/** Whole days since epoch of the local calendar date (DST-safe). */
function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

function clean(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

function monthKey(y: number, m: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`
}

export function computePatterns(dreams: PatternInput[], now = new Date()): Patterns {
  const total = dreams.length
  const sorted = [...dreams].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )

  // top
  const top = { people: [], places: [], tags: [], emotions: [] } as Record<Facet, Count[]>
  for (const f of FACETS) {
    const map = new Map<string, number>()
    for (const d of dreams) for (const v of clean(d[f])) map.set(v, (map.get(v) ?? 0) + 1)
    top[f] = [...map.entries()]
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
      .slice(0, 10)
      .map(([value, count]) => ({ value, count, share: count / total }))
  }

  // months
  const months: MonthPoint[] = []
  if (total) {
    const byMonth = new Map<string, MonthPoint>()
    for (const d of dreams) {
      const { y, m } = parseDate(d.date)
      const k = monthKey(y, m)
      const p = byMonth.get(k) ?? { month: k, dreams: 0, nightmares: 0, lucid: 0 }
      p.dreams++
      if (d.nightmare) p.nightmares++
      if (d.lucid) p.lucid++
      byMonth.set(k, p)
    }
    const a = parseDate(sorted[0]!.date)
    const b = parseDate(sorted[total - 1]!.date)
    let y = a.y
    let m = a.m
    while (y < b.y || (y === b.y && m <= b.m)) {
      const k = monthKey(y, m)
      months.push(byMonth.get(k) ?? { month: k, dreams: 0, nightmares: 0, lucid: 0 })
      if (++m > 12) {
        m = 1
        y++
      }
    }
  }

  // weekday
  const weekday = [0, 0, 0, 0, 0, 0, 0]
  for (const d of dreams) {
    const { y, m, d: day } = parseDate(d.date)
    weekday[(new Date(y, m - 1, day).getDay() + 6) % 7]!++
  }

  // rates
  const rate = (f: (d: PatternInput) => boolean) => (total ? dreams.filter(f).length / total : 0)
  const rates = {
    nightmare: rate((d) => d.nightmare),
    lucid: rate((d) => d.lucid),
    recurring: rate((d) => d.recurring),
  }

  // pairs
  const single = new Map<string, number>()
  const together = new Map<string, number>()
  for (const d of dreams) {
    const vals = [...new Set(FACETS.flatMap((f) => clean(d[f])))].sort()
    for (const v of vals) single.set(v, (single.get(v) ?? 0) + 1)
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        const k = `${vals[i]}\u0000${vals[j]}`
        together.set(k, (together.get(k) ?? 0) + 1)
      }
    }
  }
  const pairs: Pair[] = []
  for (const [k, n] of together) {
    if (n < 3) continue
    const [a, b] = k.split('\u0000') as [string, string]
    pairs.push({ a, b, together: n, lift: (n * total) / (single.get(a)! * single.get(b)!) })
  }
  pairs.sort((x, y) => y.lift - x.lift || y.together - x.together || x.a.localeCompare(y.a))
  pairs.length = Math.min(pairs.length, 10)

  // sleep / mood
  const side = (pick: (d: PatternInput) => number | null) => {
    const n: number[] = []
    const o: number[] = []
    for (const d of dreams) {
      const v = pick(d)
      if (v !== null) (d.nightmare ? n : o).push(v)
    }
    return { nightmare: avg(n), other: avg(o) }
  }
  const sleep = side((d) => d.sleepQuality)
  const mood = side((d) => d.wakingMood)

  // rising / fading
  const today = dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const win = new Map<string, Trend>()
  for (const d of dreams) {
    const { y, m, d: day } = parseDate(d.date)
    const age = today - dayNumber(y, m, day)
    const slot = age >= 0 && age < 30 ? 'recent' : age >= 30 && age < 60 ? 'before' : null
    if (!slot) continue
    for (const f of FACETS) {
      for (const value of clean(d[f])) {
        const key = `${f}\u0000${value}`
        const t = win.get(key) ?? { value, facet: f, recent: 0, before: 0 }
        t[slot]++
        win.set(key, t)
      }
    }
  }
  const trends = [...win.values()]
  const byValue = (x: Trend, y: Trend) => x.value.localeCompare(y.value)
  const rising = trends
    .filter((t) => t.recent >= 2 && t.recent >= t.before + 2)
    .sort((x, y) => y.recent - y.before - (x.recent - x.before) || byValue(x, y))
    .slice(0, 5)
  const fading = trends
    .filter((t) => t.before >= t.recent + 2)
    .sort((x, y) => y.before - y.recent - (x.before - x.recent) || byValue(x, y))
    .slice(0, 5)

  const { keywords, phrases } = keywordsAndPhrases(dreams)

  return {
    total,
    firstDate: total ? sorted[0]!.date : null,
    lastDate: total ? sorted[total - 1]!.date : null,
    top,
    months,
    weekday,
    rates,
    pairs,
    sleep,
    mood,
    rising,
    fading,
    keywords,
    phrases,
    recurring: findRecurring(dreams),
  }
}
