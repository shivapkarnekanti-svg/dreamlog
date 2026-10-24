import { useState } from 'react'
import { sendEmailVerification, signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { authMessage } from './errors'

export function VerifyScreen({ user, onChecked }: { user: User; onChecked: () => void }) {
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function resend() {
    setError('')
    setMsg('')
    setBusy(true)
    try {
      await sendEmailVerification(user)
      setMsg('Verification email sent.')
    } catch (e) {
      setError(authMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function check() {
    setError('')
    setMsg('')
    setBusy(true)
    try {
      await user.reload()
      if (user.emailVerified) onChecked()
      else setError('Your email is not verified yet. Open the link in the email first.')
    } catch (e) {
      setError(authMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="card">
      <h1>Check your inbox</h1>
      <p>
        We sent a verification link to <strong>{user.email}</strong>. Open it, then come back here.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {msg && (
        <p className="info" role="status">
          {msg}
        </p>
      )}
      <button type="button" className="primary" disabled={busy} onClick={() => void check()}>
        I&apos;ve verified
      </button>
      <button type="button" disabled={busy} onClick={() => void resend()}>
        Resend email
      </button>
      <p className="links">
        <button type="button" className="link" onClick={() => void signOut(auth)}>
          Sign out
        </button>
      </p>
    </main>
  )
}
