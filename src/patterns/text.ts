import type { Count, PatternInput, RecurringGroup } from './types'

const STOPWORDS = new Set(
  (
    'a about above after again against all also am an and any are aren as at be because been before being below ' +
    'between both but by can cannot could couldn did didn do does doesn doing don down during each few for from ' +
    'further had hadn has hasn have haven having he her here hers herself him himself his how i if in into is isn ' +
    'it its itself just let like me more most my myself no nor not of off on once only or other ought our ours ' +
    'ourselves out over own really same she should shouldn so some such than that the their theirs them ' +
    'themselves then there these they this those through to too under until up very was wasn we were weren what ' +
    'when where which while who whom why will with won would wouldn you your yours yourself yourselves ' +
    'suddenly felt feel feeling saw seemed seem got get going went came come one two dream dreamed dreamt'
  ).split(/\s+/),
)

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token)
}

/** Lowercase, unicode letters only, no stopwords or tokens shorter than 3 chars. */
export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/\p{L}+/gu) ?? []
  return raw.filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

/** Adjacent non-stopword word pairs within a sentence or clause. */
function phrasesOf(text: string): string[] {
  const out: string[] = []
  for (const part of text.toLowerCase().split(/[^\p{L}\s]+/u)) {
    const words = part.match(/\p{L}+/gu) ?? []
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i]!
      const b = words[i + 1]!
      if (a.length >= 3 && b.length >= 3 && !STOPWORDS.has(a) && !STOPWORDS.has(b)) {
        out.push(`${a} ${b}`)
      }
    }
  }
  return out
}

function topCounts(map: Map<string, number>, total: number, limit: number, min = 1): Count[] {
  return [...map.entries()]
    .filter(([, c]) => c >= min)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count, share: total ? count / total : 0 }))
}

/** Keywords (per-dream count, top 15) and two-word phrases in >= 2 dreams (top 10). */
export function keywordsAndPhrases(dreams: PatternInput[]): {
  keywords: Count[]
  phrases: Count[]
} {
  const kw = new Map<string, number>()
  const ph = new Map<string, number>()
  for (const d of dreams) {
    for (const t of new Set(tokenize(d.text))) kw.set(t, (kw.get(t) ?? 0) + 1)
    for (const p of new Set(phrasesOf(d.text))) ph.set(p, (ph.get(p) ?? 0) + 1)
  }
  return {
    keywords: topCounts(kw, dreams.length, 15),
    phrases: topCounts(ph, dreams.length, 10, 2),
  }
}

const SIMILARITY = 0.35

/** TF-IDF + cosine similarity, grouped with union-find. Text similarity only. */
export function findRecurring(dreams: PatternInput[]): RecurringGroup[] {
  const n = dreams.length
  const tfs = dreams.map((d) => {
    const m = new Map<string, number>()
    for (const t of tokenize(d.text)) m.set(t, (m.get(t) ?? 0) + 1)
    return m
  })
  const df = new Map<string, number>()
  for (const m of tfs) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1)

  const vecs = tfs.map((m) => {
    const v = new Map<string, number>()
    let norm = 0
    for (const [t, c] of m) {
      const w = (1 + Math.log(c)) * (Math.log((1 + n) / (1 + df.get(t)!)) + 1)
      v.set(t, w)
      norm += w * w
    }
    norm = Math.sqrt(norm)
    if (norm > 0) for (const [t, w] of v) v.set(t, w / norm)
    return v
  })

  const parent = dreams.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!
      i = parent[i]!
    }
    return i
  }
  // Inverted index: accumulate dot products only for dreams sharing a term.
  const postings = new Map<string, { doc: number; w: number }[]>()
  for (let i = 0; i < n; i++) {
    const v = vecs[i]!
    if (v.size < 2) continue
    for (const [t, w] of v) {
      const list = postings.get(t)
      if (list) list.push({ doc: i, w })
      else postings.set(t, [{ doc: i, w }])
    }
  }
  const acc = new Float64Array(n)
  const touched: number[] = []
  for (let i = 0; i < n; i++) {
    const a = vecs[i]!
    if (a.size < 2) continue
    touched.length = 0
    for (const [t, w] of a) {
      for (const p of postings.get(t)!) {
        if (p.doc <= i) continue
        if (acc[p.doc] === 0) touched.push(p.doc)
        acc[p.doc]! += w * p.w
      }
    }
    for (const j of touched) {
      if (acc[j]! >= SIMILARITY) parent[find(i)] = find(j)
      acc[j] = 0
    }
  }

  const groups = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const g = groups.get(r)
    if (g) g.push(i)
    else groups.set(r, [i])
  }

  const out: RecurringGroup[] = []
  for (const members of groups.values()) {
    if (members.length < 2) continue
    members.sort(
      (x, y) =>
        dreams[x]!.date.localeCompare(dreams[y]!.date) ||
        dreams[x]!.id.localeCompare(dreams[y]!.id),
    )
    const score = new Map<string, { w: number; k: number }>()
    for (const i of members) {
      for (const [t, w] of vecs[i]!) {
        const s = score.get(t) ?? { w: 0, k: 0 }
        s.w += w
        s.k += 1
        score.set(t, s)
      }
    }
    const keywords = [...score.entries()]
      .filter(([, s]) => s.k >= 2)
      .sort((x, y) => y[1].w - x[1].w || x[0].localeCompare(y[0]))
      .slice(0, 3)
      .map(([t]) => t)
    out.push({ ids: members.map((i) => dreams[i]!.id), keywords })
  }
  return out.sort((a, b) => b.ids.length - a.ids.length || a.ids[0]!.localeCompare(b.ids[0]!))
}
