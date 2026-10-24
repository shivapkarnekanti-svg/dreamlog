import { describe, expect, it } from 'vitest'
import { buildExport } from './exportDreams'

describe('buildExport', () => {
  it('wraps dreams with app, version and date, flattening the payload', () => {
    const out = buildExport(
      [{ id: 'a', payload: { v: 1, date: '2026-10-01', text: '<b>hi</b>', tags: ['x'] } }],
      new Date('2026-10-23T00:00:00Z'),
    )
    expect(out).toContain('\n  ')
    expect(JSON.parse(out)).toEqual({
      app: 'dreamlog',
      version: 1,
      exportedAt: '2026-10-23T00:00:00.000Z',
      dreams: [{ id: 'a', v: 1, date: '2026-10-01', text: '<b>hi</b>', tags: ['x'] }],
    })
  })

  it('handles no dreams', () => {
    expect(JSON.parse(buildExport([])).dreams).toEqual([])
  })
})
