import { describe, expect, it } from 'vitest'
import { cleanList, normalizePayload } from './vault'

describe('normalizePayload', () => {
  it('fills defaults for an old dream', () => {
    expect(normalizePayload({ v: 1, date: '2024-01-01', text: 'hi' })).toEqual({
      v: 1,
      date: '2024-01-01',
      text: 'hi',
      emotions: [],
      people: [],
      places: [],
      tags: [],
      lucid: false,
      nightmare: false,
      recurring: false,
      sleepQuality: null,
      wakingMood: null,
    })
  })
  it('cleans lists, ratings and emotions', () => {
    const p = normalizePayload({
      date: 'd',
      text: 't',
      emotions: ['fear', 'bogus', 'joy'],
      tags: [' Water ', 'water', 'WATER', ''],
      people: [' Mum ', 'mum', 'Dad'],
      sleepQuality: 6,
      wakingMood: 3,
      lucid: 'yes',
    })
    expect(p.emotions).toEqual(['joy', 'fear'])
    expect(p.tags).toEqual(['water'])
    expect(p.people).toEqual(['Mum', 'Dad'])
    expect(p.sleepQuality).toBeNull()
    expect(p.wakingMood).toBe(3)
    expect(p.lucid).toBe(false)
  })
})

describe('cleanList', () => {
  it('caps count and length', () => {
    const many = Array.from({ length: 30 }, (_, i) => `item${i}`)
    expect(cleanList(many)).toHaveLength(20)
    expect(cleanList(['x'.repeat(100)])[0]).toHaveLength(40)
    expect(cleanList('nope')).toEqual([])
  })
})
