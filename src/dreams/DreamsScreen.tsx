import { useEffect, useRef, useState, type FormEvent } from 'react'
import { decryptDream, encryptDream, type DreamPayload } from '../crypto/vault'
import { createDream, deleteDream, newDreamId, updateDream, watchDreams } from '../data/store'
import { MAX_TEXT, previewText, sortDreams, todayISO, type DreamRow } from './helpers'
import './dreams.css'

type Row = DreamRow<DreamPayload>

interface Editing {
  /** null while writing a new dream. */
  id: string | null
  payload: DreamPayload
}

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function DreamsScreen(props: { uid: string; dataKey: CryptoKey; onLock: () => void }) {
  const { uid, dataKey, onLock } = props
  const [rows, setRows] = useState<Row[] | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [text, setText] = useState('')
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
              return {
                id: s.id,
                createdAt: s.createdAt,
                payload: await decryptDream(dataKey, uid, s.id, s),
              }
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

  function open(next: Editing) {
    setEditing(next)
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
    const payload: DreamPayload = { ...editing.payload, date, text }
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
          onClick={() => open({ id: null, payload: { v: 1, date: todayISO(), text: '' } })}
        >
          New dream
        </button>
        <button type="button" onClick={onLock}>
          Lock
        </button>
      </div>
      {error && (
        <p className="dreams__error" role="alert">
          {error}
        </p>
      )}
      {rows === null ? (
        <p className="dreams__loading">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="dreams__empty">No dreams yet</p>
      ) : (
        <ul className="dreams__list">
          {rows.map((r) => (
            <li key={r.id} className="dreams__item">
              {r.payload ? (
                <button
                  type="button"
                  className="dreams__open"
                  onClick={() => open({ id: r.id, payload: r.payload! })}
                >
                  <span className="dreams__date">{r.payload.date}</span>
                  <span className="dreams__preview">{previewText(r.payload.text)}</span>
                </button>
              ) : (
                <div className="dreams__open">
                  <span className="dreams__preview">Couldn't decrypt this dream</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
