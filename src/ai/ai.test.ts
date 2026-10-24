import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeDreams, friendlyError, MAX_TOTAL_CHARS } from './anthropic'
import { clearApiKey, getApiKey, setApiKey } from './apiKey'

const ok = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })

describe('analyzeDreams', () => {
  const fetchMock = vi.fn()
  beforeEach(() => vi.stubGlobal('fetch', fetchMock))
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('sends the expected request', async () => {
    fetchMock.mockResolvedValue(ok('hello'))
    const out = await analyzeDreams('k1', [{ date: '2026-01-01', text: 'flying', tags: ['sky'] }])
    expect(out).toBe('hello')
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: object; body: string },
    ]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      'x-api-key': 'k1',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    })
    const body = JSON.parse(init.body)
    expect(body.model).toBe('claude-sonnet-5-5')
    expect(body.max_tokens).toBe(1500)
    expect(body.messages[0].content).toContain('flying')
    expect(body.messages[0].content).toContain('sky')
  })

  it('caps dream count and total characters', async () => {
    fetchMock.mockResolvedValue(ok('x'))
    const dreams = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${i}`,
      text: 'a'.repeat(5000),
    }))
    await analyzeDreams('k', dreams)
    const content: string = JSON.parse(
      (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
    ).messages[0].content
    expect(content).not.toContain('Dream 21')
    expect(content).toContain('Dream 20')
    expect((content.match(/a{50,}/g) ?? []).join('').length).toBeLessThanOrEqual(MAX_TOTAL_CHARS)
  })

  it('maps errors to friendly messages', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }))
    await expect(analyzeDreams('k', [])).rejects.toThrow(/key was not accepted/)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }))
    await expect(analyzeDreams('k', [])).rejects.toThrow(/Rate limit/)
    fetchMock.mockRejectedValueOnce(new TypeError('boom'))
    await expect(analyzeDreams('k', [])).rejects.toThrow(/Could not reach/)
    expect(friendlyError(500)).toMatch(/trouble/)
  })

  it('rethrows aborts', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('x', 'AbortError'))
    await expect(analyzeDreams('k', [])).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('apiKey storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    expect(setApiKey(' abc ')).toBe(true)
    expect(store.get('dreamlog.anthropicKey')).toBe('abc')
    expect(getApiKey()).toBe('abc')
    clearApiKey()
    expect(getApiKey()).toBe('')
  })

  it('survives throwing storage', () => {
    const boom = () => {
      throw new Error('denied')
    }
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom })
    expect(getApiKey()).toBe('')
    expect(setApiKey('x')).toBe(false)
    expect(() => clearApiKey()).not.toThrow()
  })
})
