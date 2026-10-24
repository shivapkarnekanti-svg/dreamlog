export interface AiDream {
  date: string
  text: string
  tags?: string[]
  emotions?: string[]
}

export const MODEL = 'claude-sonnet-5-5'
export const MAX_DREAMS = 20
export const MAX_TOTAL_CHARS = 30000
const ENDPOINT = 'https://api.anthropic.com/v1/messages'

export const SYSTEM_PROMPT =
  'You are a careful, non-clinical reflective reader of a personal dream journal. ' +
  'Look for recurring themes, symbols, emotions and links between the dreams. ' +
  'Do not diagnose anything and do not claim certainty about what a dream means; ' +
  'offer your observations tentatively and finish with a few questions the dreamer could ask themselves. ' +
  'Reply in plain text (no markdown) in under 350 words.'

export function buildPrompt(dreams: AiDream[]): string {
  const list = dreams.slice(0, MAX_DREAMS)
  const per = Math.max(200, Math.floor(MAX_TOTAL_CHARS / Math.max(list.length, 1)))
  let budget = MAX_TOTAL_CHARS
  const parts: string[] = []
  list.forEach((d, i) => {
    if (budget <= 0) return
    const text = d.text.slice(0, Math.min(per, budget))
    budget -= text.length
    const meta = [
      d.tags?.length ? `Tags: ${d.tags.join(', ')}` : '',
      d.emotions?.length ? `Emotions: ${d.emotions.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
    parts.push(`Dream ${i + 1} (${d.date})${meta ? ` [${meta}]` : ''}:\n${text}`)
  })
  return parts.join('\n\n---\n\n')
}

export function friendlyError(status: number): string {
  if (status === 401 || status === 403)
    return 'Your API key was not accepted. Check it and try again.'
  if (status === 429) return 'Rate limit reached. Please wait a moment and try again.'
  if (status >= 500) return 'Anthropic is having trouble right now. Please try again later.'
  return `The request failed (error ${status}).`
}

export async function analyzeDreams(
  apiKey: string,
  dreams: AiDream[],
  signal?: AbortSignal,
): Promise<string> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(dreams) }],
      }),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error('Could not reach Anthropic. Check your connection and try again.')
  }
  if (!res.ok) throw new Error(friendlyError(res.status))
  let data: { content?: { type: string; text?: string }[] }
  try {
    data = await res.json()
  } catch {
    throw new Error('Unexpected response from Anthropic.')
  }
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new Error('Anthropic returned an empty answer.')
  return text
}
