import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeDreams, MAX_DREAMS } from './anthropic'
import { clearApiKey, getApiKey, setApiKey } from './apiKey'
import './ai.css'

interface PanelDream {
  id: string
  date: string
  text: string
  tags?: string[]
  emotions?: string[]
}

export function AnalyzePanel(props: { dreams: PanelDream[]; onClose: () => void }) {
  const [savedKey, setSavedKey] = useState(() => getApiKey())
  const [keyInput, setKeyInput] = useState(() => getApiKey())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const sorted = useMemo(
    () => [...props.dreams].sort((a, b) => b.date.localeCompare(a.date)),
    [props.dreams],
  )
  const canRun = !!savedKey && selected.size >= 1 && consent && !busy

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_DREAMS) next.add(id)
      return next
    })
  }

  function save() {
    const k = keyInput.trim()
    if (!k) return
    setSavedKey(k)
    setError(
      setApiKey(k)
        ? ''
        : 'Could not save the key in this browser; it is used for this session only.',
    )
  }

  function remove() {
    clearApiKey()
    setSavedKey('')
    setKeyInput('')
  }

  async function run() {
    const chosen = sorted.filter((d) => selected.has(d.id))
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    setError('')
    setResult('')
    setCopied(false)
    try {
      const text = await analyzeDreams(
        savedKey,
        chosen.map(({ date, text, tags, emotions }) => ({ date, text, tags, emotions })),
        ctrl.signal,
      )
      setResult(text)
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
    } catch {
      setError('Could not copy. Select the text and copy it manually.')
    }
  }

  return (
    <section className="ai-panel" aria-labelledby="ai-title">
      <div className="ai-row">
        <h2 id="ai-title">Analyze with AI</h2>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </div>
      <p className="ai-notice">
        The dreams you select below will be sent to Anthropic, outside this device, using your own
        API key. Nothing else is sent.
      </p>

      <div className="ai-key">
        <label htmlFor="ai-key-input">Anthropic API key</label>
        <div className="ai-row">
          <input
            id="ai-key-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button type="button" onClick={save} disabled={!keyInput.trim()}>
            Save
          </button>
          <button type="button" onClick={remove} disabled={!savedKey && !keyInput}>
            Remove key
          </button>
        </div>
        <span className="ai-muted">Saved only in this browser.</span>
      </div>

      <fieldset>
        <legend>
          Choose dreams ({selected.size} of up to {MAX_DREAMS})
        </legend>
        {sorted.length === 0 ? (
          <p className="ai-muted">No dreams to analyze yet.</p>
        ) : (
          <ul className="ai-list">
            {sorted.map((d) => (
              <li key={d.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    disabled={!selected.has(d.id) && selected.size >= MAX_DREAMS}
                    onChange={() => toggle(d.id)}
                  />
                  <span>
                    {d.date} {d.text.slice(0, 60)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <label className="ai-row">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I
        understand these dreams will be sent to Anthropic
      </label>

      <div className="ai-row">
        <button type="button" className="primary" onClick={run} disabled={!canRun}>
          Analyze selected dreams
        </button>
        {busy && (
          <>
            <span role="status">Reading…</span>
            <button type="button" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p className="ai-result">{result}</p>
          <div className="ai-row">
            <button type="button" onClick={copy}>
              Copy
            </button>
            {copied && <span role="status">Copied</span>}
          </div>
        </>
      )}
    </section>
  )
}
