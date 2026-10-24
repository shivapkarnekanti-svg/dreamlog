import { describe, expect, it } from 'vitest'
import {
  collectValues,
  filterDreams,
  previewText,
  sortDreams,
  todayISO,
  type Searchable,
} from './helpers'

const row = (id: string, date: string | null, t: number) => ({
  id,
  createdAt: new Date(t),
  payload: date ? { date } : null,
})

describe('sortDreams', () => {
  it('orders by dream date desc, then createdAt desc', () => {
    const out = sortDreams([
      row('a', '2024-01-01', 1),
      row('b', '2024-03-01', 1),
      row('c', '2024-01-01', 5),
    ])
    expect(out.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
  it('puts undecryptable rows last and does not mutate', () => {
    const input = [row('x', null, 9), row('y', '2020-01-01', 1)]
    expect(sortDreams(input).map((r) => r.id)).toEqual(['y', 'x'])
    expect(input[0]?.id).toBe('x')
  })
})

describe('previewText', () => {
  it('keeps short text and collapses whitespace', () => {
    expect(previewText('a\n\n b')).toBe('a b')
  })
  it('truncates with an ellipsis', () => {
    expect(previewText('x'.repeat(200))).toBe('x'.repeat(120) + '…')
  })
})

describe('todayISO', () => {
  it('formats local date', () => {
    expect(todayISO(new Date(2024, 0, 5))).toBe('2024-01-05')
  })
})

describe('filterDreams', () => {
  const r = (id: string, p: Partial<Searchable> | null) => ({
    id,
    payload: p ? { date: '2024-01-01', text: '', ...p } : null,
  })
  const rows = [
    r('a', { text: 'Flying over the Sea', people: ['Mum'], lucid: true }),
    r('b', { text: 'school exam', tags: ['stress'], emotions: ['anxiety'], nightmare: true }),
    r('c', { text: 'quiet', places: ['Lisbon'], lucid: true, nightmare: true }),
    r('d', null),
  ]
  const ids = (x: { id: string }[]) => x.map((i) => i.id)
  it('returns everything with no query or flags', () => {
    expect(ids(filterDreams(rows, '  '))).toEqual(['a', 'b', 'c', 'd'])
  })
  it('matches text, people, places, tags and emotions case-insensitively', () => {
    expect(ids(filterDreams(rows, 'SEA'))).toEqual(['a'])
    expect(ids(filterDreams(rows, 'mum'))).toEqual(['a'])
    expect(ids(filterDreams(rows, 'lisbon'))).toEqual(['c'])
    expect(ids(filterDreams(rows, 'STRESS'))).toEqual(['b'])
    expect(ids(filterDreams(rows, 'anxi'))).toEqual(['b'])
  })
  it('requires every word', () => {
    expect(ids(filterDreams(rows, 'school anxiety'))).toEqual(['b'])
    expect(ids(filterDreams(rows, 'school sea'))).toEqual([])
  })
  it('requires every selected flag and hides undecryptable rows', () => {
    expect(ids(filterDreams(rows, '', ['lucid']))).toEqual(['a', 'c'])
    expect(ids(filterDreams(rows, '', ['lucid', 'nightmare']))).toEqual(['c'])
    expect(ids(filterDreams(rows, 'zzz'))).toEqual([])
  })
})

describe('collectValues', () => {
  it('orders by use then name', () => {
    const rows = [
      { payload: { date: 'x', text: '', tags: ['b', 'a'] } },
      { payload: { date: 'x', text: '', tags: ['b'] } },
      { payload: null },
    ]
    expect(collectValues(rows, 'tags')).toEqual(['b', 'a'])
  })
})
