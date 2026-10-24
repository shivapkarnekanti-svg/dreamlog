import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../firebase'
import { authMessage } from './errors'

type Mode = 'signin' | 'signup' | 'reset'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await sendEmailVerification(cred.user).catch(() => undefined)
      } else {
        await sendPasswordResetEmail(auth, email.trim())
        setInfo('If an account exists for that email, a reset link is on its way.')
      }
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'

  return (
    <main className="card">
      <h1>{title}</h1>
      <form onSubmit={(e) => void submit(e)}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'reset' && (
          <>
            <label htmlFor="password">Login password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="info" role="status">
            {info}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : title}
        </button>
      </form>
      <p className="links">
        {mode !== 'signin' && (
          <button type="button" className="link" onClick={() => switchMode('signin')}>
            Back to sign in
          </button>
        )}
        {mode === 'signin' && (
          <>
            <button type="button" className="link" onClick={() => switchMode('signup')}>
              Create an account
            </button>
            <button type="button" className="link" onClick={() => switchMode('reset')}>
              Forgot password
            </button>
          </>
        )}
      </p>
    </main>
  )
}
