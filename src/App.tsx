import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'
import { loadKeyRecord } from './data/store'
import type { KeyRecord } from './crypto/vault'
import { AuthScreen } from './auth/AuthScreen'
import { VerifyScreen } from './auth/VerifyScreen'
import { SetupScreen } from './auth/SetupScreen'
import { UnlockScreen } from './auth/UnlockScreen'
import { DreamsScreen } from './dreams/DreamsScreen'

const loading = (
  <main className="card">
    <p role="status">Loading…</p>
  </main>
)

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [, setTick] = useState(0)
  // Tagged with the uid they belong to, so a different user never sees them.
  type Rec = { uid: string; value: KeyRecord | null | 'error' }
  const [recState, setRecState] = useState<Rec | null>(null)
  const [keyState, setKeyState] = useState<{ uid: string; key: CryptoKey } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), [])

  const uid = user?.uid
  const verified = user?.emailVerified === true

  useEffect(() => {
    if (!uid || !verified) return
    let cancelled = false
    loadKeyRecord(uid).then(
      (value) => {
        if (!cancelled) setRecState({ uid, value })
      },
      () => {
        if (!cancelled) setRecState({ uid, value: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [uid, verified, attempt])

  const record = recState && recState.uid === uid ? recState.value : undefined
  const dataKey = keyState && keyState.uid === uid ? keyState.key : null
  const setDataKey = (key: CryptoKey | null) => setKeyState(key && uid ? { uid, key } : null)
  const setRecord = (value: KeyRecord) => {
    if (uid) setRecState({ uid, value })
  }

  let body: ReactNode
  if (user === undefined) {
    body = loading
  } else if (user === null) {
    body = <AuthScreen />
  } else if (!user.emailVerified) {
    body = <VerifyScreen user={user} onChecked={() => setTick((t) => t + 1)} />
  } else if (record === undefined) {
    body = loading
  } else if (record === 'error') {
    body = (
      <main className="card">
        <p className="error" role="alert">
          Could not load your journal. Check your connection.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setRecState(null)
            setAttempt((a) => a + 1)
          }}
        >
          Retry
        </button>
      </main>
    )
  } else if (record === null) {
    body = (
      <SetupScreen
        uid={user.uid}
        onDone={(r, k) => {
          setRecord(r)
          setDataKey(k)
        }}
      />
    )
  } else if (!dataKey) {
    body = (
      <UnlockScreen
        uid={user.uid}
        record={record}
        onUnlocked={setDataKey}
        onRecordChanged={setRecord}
      />
    )
  } else {
    body = <DreamsScreen uid={user.uid} dataKey={dataKey} onLock={() => setDataKey(null)} />
  }

  return (
    <>
      <header className="bar">
        <span className="brand">Dreamlog</span>
        {user && (
          <nav aria-label="Account">
            <button type="button" onClick={() => void signOut(auth)}>
              Sign out
            </button>
          </nav>
        )}
      </header>
      {body}
    </>
  )
}
