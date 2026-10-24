import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dreamlog',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

const bytes = (n: number, fill = 7) => Bytes.fromUint8Array(new Uint8Array(n).fill(fill))
const NOW = new Date('2026-10-22T07:00:00Z')

const keyRecord = () => ({
  v: 1,
  kdf: 'PBKDF2-SHA256',
  iterations: 600000,
  salt: bytes(16),
  passIv: bytes(12),
  passWrapped: bytes(48),
  recoveryIv: bytes(12),
  recoveryWrapped: bytes(48),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const dream = () => ({
  iv: bytes(12),
  ciphertext: bytes(200),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const as = (uid: string, verified = true): Firestore =>
  env.authenticatedContext(uid, { email_verified: verified }).firestore() as unknown as Firestore

// Alice has a key record and one dream, written with rules off.
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore
    await setDoc(doc(db, 'users/alice'), { ...keyRecord(), createdAt: NOW, updatedAt: NOW })
    await setDoc(doc(db, 'users/alice/dreams/d1'), {
      iv: bytes(12),
      ciphertext: bytes(100),
      createdAt: NOW,
      updatedAt: NOW,
    })
  })
})

describe('dreams', () => {
  it('the owner can create, read, list, update and delete', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice/dreams/d2'), dream()))
    await assertSucceeds(getDoc(doc(db, 'users/alice/dreams/d1')))
    await assertSucceeds(getDocs(collection(db, 'users/alice/dreams')))
    await assertSucceeds(
      updateDoc(doc(db, 'users/alice/dreams/d1'), {
        iv: bytes(12, 1),
        ciphertext: bytes(120, 1),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/dreams/d1')))
  })

  it("user B cannot read, list, write or delete user A's dreams", async () => {
    const db = as('bob')
    await assertFails(getDoc(doc(db, 'users/alice/dreams/d1')))
    await assertFails(getDocs(collection(db, 'users/alice/dreams')))
    await assertFails(setDoc(doc(db, 'users/alice/dreams/d2'), dream()))
    await assertFails(
      updateDoc(doc(db, 'users/alice/dreams/d1'), {
        ciphertext: bytes(50),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(deleteDoc(doc(db, 'users/alice/dreams/d1')))
  })

  it('signed-out and unverified users get nothing', async () => {
    const anon = env.unauthenticatedContext().firestore() as unknown as Firestore
    await assertFails(getDoc(doc(anon, 'users/alice/dreams/d1')))
    const unverified = as('alice', false)
    await assertFails(getDoc(doc(unverified, 'users/alice/dreams/d1')))
    await assertFails(setDoc(doc(unverified, 'users/alice/dreams/d2'), dream()))
  })

  it('rejects any plaintext or extra field', async () => {
    const db = as('alice')
    for (const extra of [
      { text: 'I was flying' },
      { title: 'Flying' },
      { tags: ['water'] },
      { date: '2026-10-22' },
    ]) {
      await assertFails(setDoc(doc(db, 'users/alice/dreams/d2'), { ...dream(), ...extra }))
      await assertFails(
        updateDoc(doc(db, 'users/alice/dreams/d1'), { ...extra, updatedAt: serverTimestamp() }),
      )
    }
  })

  it('rejects ciphertext sent as text, a wrong iv size, or missing fields', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice/dreams/d2')
    await assertFails(setDoc(ref, { ...dream(), ciphertext: 'I was flying over the sea' }))
    await assertFails(setDoc(ref, { ...dream(), iv: 'aaaaaaaaaaaa' }))
    await assertFails(setDoc(ref, { ...dream(), iv: bytes(16) }))
    await assertFails(setDoc(ref, { ...dream(), ciphertext: bytes(16) }))
    await assertFails(setDoc(ref, { ...dream(), ciphertext: bytes(524289) }))
    const noIv: Record<string, unknown> = dream()
    delete noIv.iv
    await assertFails(setDoc(ref, noIv))
  })

  it('timestamps come from the server and createdAt never changes', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/dreams/d2'), { ...dream(), createdAt: NOW }))
    await assertFails(setDoc(doc(db, 'users/alice/dreams/d2'), { ...dream(), updatedAt: NOW }))
    await assertFails(
      updateDoc(doc(db, 'users/alice/dreams/d1'), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })
})

describe('key record', () => {
  it('only the owner can read it', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')))
    await assertFails(getDoc(doc(as('bob'), 'users/alice')))
    await assertFails(getDocs(collection(as('alice'), 'users')))
  })

  it('a new user can create their own, valid record and nobody else can', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob'), keyRecord()))
    await assertFails(setDoc(doc(as('carol'), 'users/dave'), keyRecord()))
    await assertFails(setDoc(doc(as('carol', false), 'users/carol'), keyRecord()))
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { ...keyRecord(), email: 'c@x.io' }))
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { ...keyRecord(), iterations: 1000 }))
    await assertFails(
      setDoc(doc(as('carol'), 'users/carol'), { ...keyRecord(), passWrapped: bytes(32) }),
    )
  })

  it('a passphrase change may re-wrap, but the recovery wrap is fixed and it cannot be deleted', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice')
    await assertSucceeds(
      updateDoc(ref, {
        salt: bytes(16, 2),
        passIv: bytes(12, 2),
        passWrapped: bytes(48, 2),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(ref, { recoveryWrapped: bytes(48, 3), updatedAt: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    )
    await assertFails(setDoc(ref, keyRecord()))
    await assertFails(deleteDoc(ref))
  })
})

it('everything else is denied', async () => {
  const db = as('alice')
  await assertFails(getDoc(doc(db, 'other/x')))
  await assertFails(setDoc(doc(db, 'users/alice/notes/n1'), { iv: bytes(12) }))
})
