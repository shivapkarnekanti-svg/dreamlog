import { useState, type FormEvent } from 'react'
import { createVault, MIN_PASSPHRASE_LENGTH, type KeyRecord } from '../crypto/vault'
import { saveKeyRecord } from '../data/store'

interface Pending {
  record: KeyRecord
  recoveryKey: string
  dataKey: CryptoKey
}

export function SetupScreen({
  uid,
  onDone,
}: {
  uid: string
  onDone: (record: KeyRecord, dataKey: CryptoKey) => void
}) {
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pass.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`)
      return
    }
    if (pass !== confirm) {
      setError('The passphrases do not match.')
      return
    }
    setBusy(true)
    try {
      setPending(await createVault(uid, pass))
    } catch {
      setError('Could not create your journal key. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    if (!pending) return
    setError('')
    setBusy(true)
    try {
      await saveKeyRecord(uid, pending.record)
      onDone(pending.record, pending.dataKey)
    } catch {
      setError('Could not save to the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  function download() {
    if (!pending) return
    const blob = new Blob([`Dreamlog recovery key\n\n${pending.recoveryKey}\n`], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dreamlog-recovery-key.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copy() {
    if (!pending) return
    try {
      await navigator.clipboard.writeText(pending.recoveryKey)
      setCopied(true)
    } catch {
      setError('Could not copy. Select the key and copy it by hand.')
    }
  }

  if (pending) {
    return (
      <main className="card">
        <h1>Save your recovery key</h1>
        <p>
          If you forget your passphrase, this key is the only way back into your dreams. It is shown
          once and never stored. Keep it somewhere safe, such as a password manager.
        </p>
        <p className="recovery" data-testid="recovery-key">
          {pending.recoveryKey}
        </p>
        <div className="row">
          <button type="button" onClick={download}>
            Download .txt
          </button>
          <button type="button" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I
          saved my recovery key
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="primary"
          disabled={!saved || busy}
          onClick={() => void finish()}
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>Set a passphrase</h1>
      <p>
        Your dreams are encrypted on this device with a passphrase. It is separate from your login
        password, and we cannot recover it. If you lose it, only your recovery key can help.
      </p>
      <form onSubmit={(e) => void create(e)}>
        <label htmlFor="pass">Passphrase (at least {MIN_PASSPHRASE_LENGTH} characters)</label>
        <input
          id="pass"
          type="password"
          autoComplete="new-password"
          required
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <label htmlFor="pass2">Confirm passphrase</label>
        <input
          id="pass2"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Encrypting… this takes a moment' : 'Create journal'}
        </button>
      </form>
    </main>
  )
}
