import { useId, useState, type KeyboardEvent } from 'react'
import { cleanList, MAX_ITEM_CHARS, MAX_LIST_ITEMS } from '../crypto/vault'

/** A list of short text chips. Enter or a comma adds one; suggestions come from a datalist. */
export function ChipInput(props: {
  label: string
  values: string[]
  suggestions: string[]
  lowercase?: boolean
  onChange: (next: string[]) => void
}) {
  const { label, values, suggestions, lowercase, onChange } = props
  const id = useId()
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const parts = raw.split(',')
    setDraft('')
    if (parts.every((p) => !p.trim())) return
    onChange(cleanList([...values, ...parts], lowercase))
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  const unused = suggestions.filter((s) => !values.includes(s)).slice(0, 50)

  return (
    <div className="dreams__field">
      <label htmlFor={id}>{label}</label>
      {values.length > 0 && (
        <ul className="dreams__chips" aria-label={`${label} added`}>
          {values.map((v) => (
            <li key={v} className="dreams__chip">
              <span>{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        value={draft}
        list={`${id}-list`}
        maxLength={MAX_ITEM_CHARS}
        disabled={values.length >= MAX_LIST_ITEMS}
        autoComplete="off"
        placeholder="Type, then press Enter or comma"
        onChange={(e) =>
          e.target.value.endsWith(',') ? commit(e.target.value) : setDraft(e.target.value)
        }
        onKeyDown={onKey}
        onBlur={() => commit(draft)}
      />
      <datalist id={`${id}-list`}>
        {unused.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
