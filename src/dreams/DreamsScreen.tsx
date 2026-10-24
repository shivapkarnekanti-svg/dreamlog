import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  decryptDream,
  EMOTIONS,
  encryptDream,
  normalizePayload,
  type DreamPayload,
  type Emotion,
} from '../crypto/vault'
import { createDream, deleteDream, newDreamId, updateDream, watchDreams } from '../data/store'
import { ChipInput } from './ChipInput'
import { RatingGroup } from './RatingGroup'
import {
  collectValues,
  filterDreams,
  FLAGS,
  MAX_TEXT,
  previewText,
  sortDreams,
  todayISO,
  type DreamRow,
  type Flag,
} from './helpers'
import { Dashboard } from '../patterns/Dashboard'
import type { PatternInput } from '../patterns/types'
import './dreams.css'

type Row = DreamRow<DreamPayload>

interface Editing {
  /** null while writing a new dream. */
  id: string | null
  payload: DreamPayload
}

const FLAG_LABEL: Record<Flag, string> = {
  lucid: 'Lucid',
  nightmare: 'Nightmare',
  recurring: 'Recurring',
}
const MAX_BADGES = 3

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function DreamsScreen(props: { uid: string; dataKey: CryptoKey; onLock: () => void }) {
  const { uid, dataKey, onLock } = props
  const [rows, setRows] = useState<Row[] | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [text, setText] = useState('')
  const [form, setForm] = useState<DreamPayload>(() => normalizePayload({ date: '', text: '' }))
  const [query, setQuery] = useState('')
  const [flags, setFlags] = useState<Flag[]>([])
  const [view, setView] = useState<'journal' | 'patterns'>('journal')
  const newBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let current = 0
    const unsub = watchDreams(
      uid,
      (stored) => {
        const run = ++current
        void Promise.all(
          stored.map(async (s): Promise<Row> => {
            try {
              const payload = await decryptDream(dataKey, uid, s.id, s)
              return { id: s.id, createdAt: s.createdAt, payload: normalizePayload(payload) }
            } catch {
              return { id: s.id, createdAt: s.createdAt, payload: null }
            }
          }),
        ).then((all) => {
          if (run === current) setRows(sortDreams(all))
        })
      },
      (e) => setError(msg(e)),
    )
    return () => {
      current++
      unsub()
    }
  }, [uid, dataKey])

  const known = useMemo(
    () => ({
      people: collectValues(rows ?? [], 'people'),
      places: collectValues(rows ?? [], 'places'),
      tags: collectValues(rows ?? [], 'tags'),
    }),
    [rows],
  )
  const patternInputs = useMemo<PatternInput[]>(
    () =>
      (rows ?? []).flatMap((r) => {
        const p = r.payload
        if (!p) return []
        return [
          {
            id: r.id,
            date: p.date,
            text: p.text,
            people: p.people ?? [],
            places: p.places ?? [],
            tags: p.tags ?? [],
            emotions: p.emotions ?? [],
            lucid: p.lucid === true,
            nightmare: p.nightmare === true,
            recurring: p.recurring === true,
            sleepQuality: p.sleepQuality ?? null,
            wakingMood: p.wakingMood ?? null,
          },
        ]
      }),
    [rows],
  )
  const shown = useMemo(() => filterDreams(rows ?? [], query, flags), [rows, query, flags])

  function open(next: Editing) {
    setEditing(next)
    setForm(normalizePayload(next.payload))
    setDate(next.payload.date)
    setText(next.payload.text)
    setConfirming(false)
    setError('')
  }

  function close() {
    setEditing(null)
    setConfirming(false)
    setTimeout(() => newBtn.current?.focus(), 0)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!editing || !text.trim() || !date) return
    const id = editing.id ?? newDreamId(uid)
    const payload = normalizePayload({ ...form, date, text })
    try {
      const sealed = await encryptDream(dataKey, uid, id, payload)
      // Not awaited: Firestore queues the write while offline.
      const write =
        editing.id === null ? createDream(uid, id, sealed) : updateDream(uid, id, sealed)
      write.catch((err: unknown) => setError(`Couldn't save: ${msg(err)}`))
      close()
    } catch (err) {
      setError(`Couldn't save: ${msg(err)}`)
    }
  }

  function setEmotion(emo: Emotion, on: boolean) {
    const rest = (form.emotions ?? []).filter((x) => x !== emo)
    setForm({ ...form, emotions: on ? [...rest, emo] : rest })
  }

  function toggleFlag(f: Flag) {
    setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))
  }

  function remove(id: string) {
    deleteDream(uid, id).catch((err: unknown) => setError(`Couldn't delete: ${msg(err)}`))
    close()
  }

  if (editing) {
    const editId = editing.id
    return (
      <main className="dreams">
        <h1>{editId ? 'Edit dream' : 'New dream'}</h1>
        <form onSubmit={(e) => void save(e)}>
          <div className="dreams__field">
            <label htmlFor="dream-date">Date</label>
            <input
              id="dream-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="dreams__field">
            <label htmlFor="dream-text">Dream</label>
            <textarea
              id="dream-text"
              required
              maxLength={MAX_TEXT}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </div>
          <fieldset className="dreams__group">
            <legend>Emotions</legend>
            <div className="dreams__chips">
              {EMOTIONS.map((emo) => {
                const on = form.emotions?.includes(emo) ?? false
                return (
                  <button
                    key={emo}
                    type="button"
                    className="dreams__toggle"
                    aria-pressed={on}
                    onClick={() => setEmotion(emo, !on)}
                  >
                    {emo}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <ChipInput
            label="People"
            values={form.people ?? []}
            suggestions={known.people}
            onChange={(people) => setForm({ ...form, people })}
          />
          <ChipInput
            label="Places"
            values={form.places ?? []}
            suggestions={known.places}
            onChange={(places) => setForm({ ...form, places })}
          />
          <ChipInput
            label="Tags"
            lowercase
            values={form.tags ?? []}
            suggestions={known.tags}
            onChange={(tags) => setForm({ ...form, tags })}
          />
          <div className="dreams__group dreams__checks">
            {FLAGS.map((f) => (
              <label key={f} className="dreams__choice">
                <input
                  type="checkbox"
                  checked={form[f] === true}
                  onChange={(e) => setForm({ ...form, [f]: e.target.checked })}
                />
                <span>{FLAG_LABEL[f]}</span>
              </label>
            ))}
          </div>
          <RatingGroup
            legend="Sleep quality"
            value={form.sleepQuality ?? null}
            onChange={(sleepQuality) => setForm({ ...form, sleepQuality })}
          />
          <RatingGroup
            legend="Waking mood"
            value={form.wakingMood ?? null}
            onChange={(wakingMood) => setForm({ ...form, wakingMood })}
          />
          {error && (
            <p className="dreams__error" role="alert">
              {error}
            </p>
          )}
          <div className="dreams__actions">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" onClick={close}>
              Cancel
            </button>
            <span className="dreams__spacer" />
            {editId && !confirming && (
              <button type="button" className="danger" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {editId && confirming && (
              <>
                <span role="alert">Delete this dream for good?</span>
                <button type="button" className="danger" onClick={() => remove(editId)}>
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    )
  }

  return (
    <main className="dreams">
      <div className="dreams__bar">
        <button
          type="button"
          className="primary"
          ref={newBtn}
          onClick={() =>
            open({ id: null, payload: normalizePayload({ date: todayISO(), text: '' }) })
          }
        >
          New dream
        </button>
        <button type="button" onClick={onLock}>
          Lock
        </button>
      </div>
      <div className="dreams__chips">
        <button
          type="button"
          className="dreams__toggle"
          aria-pressed={view === 'journal'}
          onClick={() => setView('journal')}
        >
          Journal
        </button>
        <button
          type="button"
          className="dreams__toggle"
          aria-pressed={view === 'patterns'}
          onClick={() => setView('patterns')}
        >
          Patterns
        </button>
      </div>
      {error && (
        <p className="dreams__error" role="alert">
          {error}
        </p>
      )}
      {view === 'patterns' && rows !== null ? (
        <Dashboard
          dreams={patternInputs}
          onOpenDream={(id) => {
            const r = rows.find((x) => x.id === id)
            if (r?.payload) open({ id: r.id, payload: r.payload })
          }}
        />
      ) : rows === null ? (
        <p className="dreams__loading">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="dreams__empty">No dreams yet</p>
      ) : (
        <>
          <div className="dreams__field">
            <label htmlFor="dream-search">Search</label>
            <input
              id="dream-search"
              type="search"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="dreams__chips">
            {FLAGS.map((f) => (
              <button
                key={f}
                type="button"
                className="dreams__toggle"
                aria-pressed={flags.includes(f)}
                onClick={() => toggleFlag(f)}
              >
                {FLAG_LABEL[f]}
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="dreams__empty">No matching dreams</p>}
          <ul className="dreams__list">
            {shown.map((r) => (
              <li key={r.id} className="dreams__item">
                {r.payload ? (
                  <button
                    type="button"
                    className="dreams__open"
                    onClick={() => open({ id: r.id, payload: r.payload! })}
                  >
                    <span className="dreams__date">{r.payload.date}</span>
                    <span className="dreams__preview">{previewText(r.payload.text)}</span>
                    <Badges payload={r.payload} />
                  </button>
                ) : (
                  <div className="dreams__open">
                    <span className="dreams__preview">Couldn't decrypt this dream</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}

function Badges({ payload }: { payload: DreamPayload }) {
  const flagBadges = FLAGS.filter((f) => payload[f] === true).map((f) => FLAG_LABEL[f])
  const more = [...(payload.emotions ?? []), ...(payload.tags ?? []).map((t) => '#' + t)]
  const items = [...flagBadges, ...more.slice(0, MAX_BADGES)]
  if (items.length === 0) return null
  const extra = more.length - MAX_BADGES
  return (
    <span className="dreams__badges">
      {items.map((b) => (
        <span key={b} className="dreams__badge">
          {b}
        </span>
      ))}
      {extra > 0 && <span className="dreams__badge">+{extra}</span>}
    </span>
  )
}
