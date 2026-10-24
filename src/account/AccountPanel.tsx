import { useState, type FormEvent } from 'react'
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../firebase'
import { deleteAllUserData } from '../data/store'
import type { DreamPayload } from '../crypto/vault'
import { buildExport, downloadText } from './exportDreams'
import './account.css'

function deleteMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
    return 'That login password is not correct.'
  if (code === 'auth/network-request-failed' || code === 'unavailable')
    return 'Network problem. Check your connection and try again.'
  if (code === 'auth/requires-recent-login')
    return 'For safety, please sign out, sign in again, and then retry.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.'
  return 'Could not delete the account. Please try again.'
}

export function AccountPanel(props: {
  uid: string
  dreams: { id: string; payload: DreamPayload }[]
  onClose: () => void
  onDeleted: () => void
}) {
  const { uid, dreams, onClose, onDeleted } = props
  const [confirm, setConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ready = confirm === 'DELETE' && password.length > 0 && !busy

  function exportNow() {
    const day = new Date().toISOString().slice(0, 10)
    downloadText(`dreamlog-export-${day}.json`, buildExport(dreams))
  }

  async function remove(e: FormEvent) {
    e.preventDefault()
    const user = auth.currentUser
    if (!ready || !user || !user.email) return
    setBusy(true)
    setError('')
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      await deleteAllUserData(uid)
      await deleteUser(user)
      onDeleted()
    } catch (err) {
      setError(deleteMessage(err))
      setBusy(false)
    }
  }

  return (
    <main className="account">
      <h1>Account</h1>
      <section aria-labelledby="acc-export">
        <h2 id="acc-export">Export</h2>
        <p className="account-note">
          The exported file is NOT encrypted: anyone who gets it can read your dreams. Keep it
          somewhere safe.
        </p>
        <button type="button" onClick={exportNow}>
          Export my dreams (JSON)
        </button>
      </section>
      <section aria-labelledby="acc-delete">
        <h2 id="acc-delete">Delete account</h2>
        <p className="account-note">
          This permanently deletes all your dreams, your key record and your login. It cannot be
          undone.
        </p>
        <form onSubmit={remove}>
          <label htmlFor="acc-confirm">Type DELETE to confirm</label>
          <input
            id="acc-confirm"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <label htmlFor="acc-password">Login password</label>
          <input
            id="acc-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="danger" disabled={!ready}>
            Delete my account forever
          </button>
        </form>
      </section>
      <button type="button" onClick={onClose} disabled={busy}>
        Close
      </button>
    </main>
  )
}
