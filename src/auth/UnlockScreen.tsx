import { useState, type FormEvent } from 'react'
import {
  MIN_PASSPHRASE_LENGTH,
  resetPassphrase,
  unlockWithPassphrase,
  WrongSecretError,
  type KeyRecord,
} from '../crypto/vault'
import { savePassphraseWrap } from '../data/store'

export function UnlockScreen({
  uid,
  record,
  onUnlocked,
  onRecordChanged,
}: {
  uid: string
  record: KeyRecord
  onUnlocked: (dataKey: CryptoKey) => void
  onRecordChanged: (record: KeyRecord) => void
}) {
  const [recovery, setRecovery] = useState(false)
  const [pass, setPass] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [pass2, setPass2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function unlock(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      onUnlocked(await unlockWithPassphrase(uid, record, pass))
    } catch (err) {
      setError(
        err instanceof WrongSecretError ? 'Wrong passphrase' : 'Could not unlock. Try again.',
      )
      setBusy(false)
    }
  }

  async function recover(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pass.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`)
      return
    }
    if (pass !== pass2) {
      setError('The passphrases do not match.')
      return
    }
    setBusy(true)
    try {
      const { changes, dataKey } = await resetPassphrase(uid, record, recoveryKey, pass)
      await savePassphraseWrap(uid, changes)
      onRecordChanged({ ...record, ...changes })
      onUnlocked(dataKey)
    } catch (err) {
      setError(
        err instanceof WrongSecretError
          ? 'Wrong recovery key'
          : 'Could not save the new passphrase. Check your connection and try again.',
      )
      setBusy(false)
    }
  }

  function toggle() {
    setRecovery(!recovery)
    setError('')
    setPass('')
    setPass2('')
  }

  if (recovery) {
    return (
      <main className="card">
        <h1>Use recovery key</h1>
        <p>Enter your recovery key and choose a new passphrase.</p>
        <form onSubmit={(e) => void recover(e)}>
          <label htmlFor="rk">Recovery key</label>
          <input
            id="rk"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
          />
          <label htmlFor="np">New passphrase (at least {MIN_PASSPHRASE_LENGTH} characters)</label>
          <input
            id="np"
            type="password"
            autoComplete="new-password"
            required
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <label htmlFor="np2">Confirm new passphrase</label>
          <input
            id="np2"
            type="password"
            autoComplete="new-password"
            required
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Unlocking… this takes a moment' : 'Unlock and set new passphrase'}
          </button>
        </form>
        <p className="links">
          <button type="button" className="link" onClick={toggle}>
            Use passphrase instead
          </button>
        </p>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>Unlock your journal</h1>
      <form onSubmit={(e) => void unlock(e)}>
        <label htmlFor="pp">Passphrase</label>
        <input
          id="pp"
          type="password"
          autoComplete="current-password"
          required
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Unlocking… this takes a moment' : 'Unlock'}
        </button>
      </form>
      <p className="links">
        <button type="button" className="link" onClick={toggle}>
          Use recovery key
        </button>
      </p>
    </main>
  )
}
