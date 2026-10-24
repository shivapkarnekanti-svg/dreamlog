import { describe, expect, it } from 'vitest'
import { previewText, sortDreams, todayISO } from './helpers'

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
