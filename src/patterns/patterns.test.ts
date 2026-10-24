import { describe, expect, it } from 'vitest'
import { computePatterns } from './compute'
import { fixtureDreams } from './fixtures'
import { keywordsAndPhrases, tokenize } from './text'
import type { PatternInput } from './types'

const NOW = new Date(2026, 9, 23)

function dream(over: Partial<PatternInput> & { id: string; date: string }): PatternInput {
  return {
    text: '',
    people: [],
    places: [],
    tags: [],
    emotions: [],
    lucid: false,
    nightmare: false,
    recurring: false,
    sleepQuality: null,
    wakingMood: null,
    ...over,
  }
}

describe('computePatterns', () => {
  it('handles no dreams', () => {
    const p = computePatterns([], NOW)
    expect(p.total).toBe(0)
    expect(p.firstDate).toBeNull()
    expect(p.months).toEqual([])
    expect(p.top.people).toEqual([])
    expect(p.weekday).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(p.rates).toEqual({ nightmare: 0, lucid: 0, recurring: 0 })
    expect(p.sleep).toEqual({ nightmare: null, other: null })
    expect(p.mood).toEqual({ nightmare: null, other: null })
    expect([p.pairs, p.rising, p.fading, p.keywords, p.phrases, p.recurring]).toEqual([
      [],
      [],
      [],
      [],
      [],
      [],
    ])
  })

  it('counts top values once per dream with share', () => {
    const p = computePatterns(
      [
        dream({ id: '1', date: '2026-10-01', people: ['Mum', 'Mum'] }),
        dream({ id: '2', date: '2026-10-02', people: ['Mum', 'Dad'] }),
        dream({ id: '3', date: '2026-10-03' }),
        dream({ id: '4', date: '2026-10-04' }),
      ],
      NOW,
    )
    expect(p.top.people[0]).toEqual({ value: 'Mum', count: 2, share: 0.5 })
    expect(p.top.people[1]?.value).toBe('Dad')
  })

  it('limits top to 10', () => {
    const tags = Array.from({ length: 15 }, (_, i) => `t${i}`)
    expect(
      computePatterns([dream({ id: '1', date: '2026-10-01', tags })], NOW).top.tags,
    ).toHaveLength(10)
  })

  it('fills month gaps', () => {
    const p = computePatterns(
      [
        dream({ id: '1', date: '2025-11-30', nightmare: true }),
        dream({ id: '2', date: '2026-02-01', lucid: true }),
      ],
      NOW,
    )
    expect(p.months.map((m) => m.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    expect(p.months[0]).toEqual({ month: '2025-11', dreams: 1, nightmares: 1, lucid: 0 })
    expect(p.months[1]?.dreams).toBe(0)
    expect(p.months[3]?.lucid).toBe(1)
    expect([p.firstDate, p.lastDate]).toEqual(['2025-11-30', '2026-02-01'])
  })

  it('counts weekdays with Monday = 0', () => {
    // 2026-10-19 is a Monday, 2026-10-25 a Sunday
    const p = computePatterns(
      [
        dream({ id: '1', date: '2026-10-19' }),
        dream({ id: '2', date: '2026-10-19' }),
        dream({ id: '3', date: '2026-10-25' }),
      ],
      NOW,
    )
    expect(p.weekday).toEqual([2, 0, 0, 0, 0, 0, 1])
  })

  it('computes rates', () => {
    const p = computePatterns(
      [
        dream({ id: '1', date: '2026-10-01', nightmare: true, recurring: true }),
        dream({ id: '2', date: '2026-10-02', lucid: true }),
        dream({ id: '3', date: '2026-10-03' }),
        dream({ id: '4', date: '2026-10-04' }),
      ],
      NOW,
    )
    expect(p.rates).toEqual({ nightmare: 0.25, lucid: 0.25, recurring: 0.25 })
  })

  it('computes pairs with lift, requiring 3 together', () => {
    const ds = [
      ...[1, 2, 3].map((i) =>
        dream({ id: `a${i}`, date: '2026-10-01', tags: ['work'], emotions: ['anxious'] }),
      ),
      ...[1, 2, 3, 4, 5, 6].map((i) => dream({ id: `b${i}`, date: '2026-10-02', tags: ['sea'] })),
      dream({ id: 'c', date: '2026-10-03', tags: ['work'] }),
    ]
    const p = computePatterns(ds, NOW)
    expect(p.pairs).toHaveLength(1)
    expect(p.pairs[0]).toMatchObject({ a: 'anxious', b: 'work', together: 3 })
    expect(p.pairs[0]!.lift).toBeCloseTo((3 * 10) / (3 * 4))
  })

  it('averages sleep and mood for nightmares vs others', () => {
    const p = computePatterns(
      [
        dream({ id: '1', date: '2026-10-01', nightmare: true, sleepQuality: 1, wakingMood: 2 }),
        dream({ id: '2', date: '2026-10-02', nightmare: true, sleepQuality: 2 }),
        dream({ id: '3', date: '2026-10-03', sleepQuality: 4, wakingMood: 5 }),
        dream({ id: '4', date: '2026-10-04' }),
      ],
      NOW,
    )
    expect(p.sleep).toEqual({ nightmare: 1.5, other: 4 })
    expect(p.mood).toEqual({ nightmare: 2, other: 5 })
    const none = computePatterns([dream({ id: '1', date: '2026-10-01', nightmare: true })], NOW)
    expect(none.sleep.nightmare).toBeNull()
  })

  it('finds rising and fading values', () => {
    const ds = [
      dream({ id: '1', date: '2026-10-20', tags: ['water'] }),
      dream({ id: '2', date: '2026-10-10', tags: ['water'] }),
      dream({ id: '3', date: '2026-10-05', tags: ['water'] }),
      dream({ id: '4', date: '2026-09-10', tags: ['school'] }),
      dream({ id: '5', date: '2026-09-05', tags: ['school'] }),
      dream({ id: '6', date: '2026-09-01', tags: ['school', 'water'] }),
      dream({ id: '7', date: '2026-06-01', tags: ['old'] }),
    ]
    const p = computePatterns(ds, NOW)
    expect(p.rising).toEqual([{ value: 'water', facet: 'tags', recent: 3, before: 1 }])
    expect(p.fading).toEqual([{ value: 'school', facet: 'tags', recent: 0, before: 3 }])
  })

  it('runs on the fixtures', () => {
    const p = computePatterns(fixtureDreams, NOW)
    expect(fixtureDreams.length).toBeGreaterThanOrEqual(30)
    expect(p.total).toBe(fixtureDreams.length)
    expect(p.keywords.length).toBeGreaterThan(0)
  })

  it('is fast for 2000 dreams', () => {
    const words = Array.from(
      { length: 300 },
      (_, i) =>
        `w${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}x`,
    )
    const ds = Array.from({ length: 2000 }, (_, i) =>
      dream({
        id: `d${i}`,
        date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        text: Array.from(
          { length: 60 },
          (_, k) => words[(i * 7 + k * 13 + (i % 5) * k) % words.length],
        ).join(' '),
        tags: [`t${i % 20}`],
      }),
    )
    const t = Date.now()
    computePatterns(ds, NOW)
    // ~5s alone; the bound is loose so a loaded machine running the whole suite doesn't flake.
    expect(Date.now() - t).toBeLessThan(30_000)
  })
})

describe('text', () => {
  it('tokenizes with unicode and drops stopwords and short tokens', () => {
    expect(tokenize('The café was NOT near, and it is an océan!')).toEqual([
      'café',
      'near',
      'océan',
    ])
  })

  it('returns keywords and phrases in at least 2 dreams', () => {
    const ds = [
      dream({
        id: '1',
        date: '2026-10-01',
        text: 'Teeth falling out again. The teeth were loose.',
      }),
      dream({ id: '2', date: '2026-10-02', text: 'My teeth falling in the kitchen' }),
      dream({ id: '3', date: '2026-10-03', text: 'A quiet garden' }),
    ]
    const { keywords, phrases } = keywordsAndPhrases(ds)
    expect(keywords.find((k) => k.value === 'teeth')).toEqual({
      value: 'teeth',
      count: 2,
      share: 2 / 3,
    })
    expect(phrases.map((p) => p.value)).toEqual(['teeth falling'])
  })

  it('detects recurring near-duplicate dreams', () => {
    const ds = [
      dream({
        id: 'b',
        date: '2026-03-02',
        text: 'Running through a dark forest chased by a tall shadow, hiding behind an old oak tree',
      }),
      dream({
        id: 'x',
        date: '2026-02-01',
        text: 'Baking bread with my aunt in a sunny bakery by the harbour',
      }),
      dream({
        id: 'a',
        date: '2026-01-05',
        text: 'Running through the dark forest chased by a tall shadow, I hid behind an oak tree',
      }),
      dream({
        id: 'y',
        date: '2026-02-20',
        text: 'Piloting a spaceship over frozen mountains during a thunderstorm',
      }),
    ]
    const { recurring } = computePatterns(ds, NOW)
    expect(recurring).toHaveLength(1)
    expect(recurring[0]!.ids).toEqual(['a', 'b'])
    expect(recurring[0]!.keywords.length).toBeGreaterThan(0)
    expect(recurring[0]!.keywords.length).toBeLessThanOrEqual(3)
  })
})
