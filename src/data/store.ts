// Firestore reads and writes. Everything that crosses this boundary is already encrypted.
import {
  Bytes as FsBytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Bytes, KeyRecord, Sealed } from '../crypto/vault'

const toFs = (b: Bytes) => FsBytes.fromUint8Array(b)
const fromFs = (b: FsBytes) => b.toUint8Array() as Bytes

const keyRef = (uid: string) => doc(db, 'users', uid)
const dreamsCol = (uid: string) => collection(db, 'users', uid, 'dreams')

/** A new random id for a dream, made locally so it can be bound into the ciphertext first. */
export const newDreamId = (uid: string) => doc(dreamsCol(uid)).id

/** The key record, or null for a user who has not set a passphrase yet. Falls back to the offline cache, so a known journal unlocks offline. */
export async function loadKeyRecord(uid: string): Promise<KeyRecord | null> {
  const snap = await getDoc(keyRef(uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    v: 1,
    kdf: d.kdf,
    iterations: d.iterations,
    salt: fromFs(d.salt),
    passIv: fromFs(d.passIv),
    passWrapped: fromFs(d.passWrapped),
    recoveryIv: fromFs(d.recoveryIv),
    recoveryWrapped: fromFs(d.recoveryWrapped),
  }
}

export async function saveKeyRecord(uid: string, r: KeyRecord) {
  await setDoc(keyRef(uid), {
    v: r.v,
    kdf: r.kdf,
    iterations: r.iterations,
    salt: toFs(r.salt),
    passIv: toFs(r.passIv),
    passWrapped: toFs(r.passWrapped),
    recoveryIv: toFs(r.recoveryIv),
    recoveryWrapped: toFs(r.recoveryWrapped),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function savePassphraseWrap(
  uid: string,
  c: Pick<KeyRecord, 'iterations' | 'salt' | 'passIv' | 'passWrapped'>,
) {
  await updateDoc(keyRef(uid), {
    iterations: c.iterations,
    salt: toFs(c.salt),
    passIv: toFs(c.passIv),
    passWrapped: toFs(c.passWrapped),
    updatedAt: serverTimestamp(),
  })
}

export interface StoredDream extends Sealed {
  id: string
  createdAt: Date
  updatedAt: Date
}

/** Newest first. Calls back with ciphertext; decryption happens in the caller. */
export function watchDreams(
  uid: string,
  onDreams: (dreams: StoredDream[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(dreamsCol(uid), orderBy('createdAt', 'desc')),
    (snap) =>
      onDreams(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' })
          return {
            id: d.id,
            iv: fromFs(data.iv),
            ciphertext: fromFs(data.ciphertext),
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
          }
        }),
      ),
    onError,
  )
}

export function createDream(uid: string, id: string, s: Sealed) {
  return setDoc(doc(dreamsCol(uid), id), {
    iv: toFs(s.iv),
    ciphertext: toFs(s.ciphertext),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function updateDream(uid: string, id: string, s: Sealed) {
  return updateDoc(doc(dreamsCol(uid), id), {
    iv: toFs(s.iv),
    ciphertext: toFs(s.ciphertext),
    updatedAt: serverTimestamp(),
  })
}

export function deleteDream(uid: string, id: string) {
  return deleteDoc(doc(dreamsCol(uid), id))
}

/** One-shot read of every stored dream (server, or the cache when offline). */
export async function loadAllDreamsOnce(uid: string): Promise<StoredDream[]> {
  const snap = await getDocs(query(dreamsCol(uid), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => {
    const data = d.data({ serverTimestamps: 'estimate' })
    return {
      id: d.id,
      iv: fromFs(data.iv),
      ciphertext: fromFs(data.ciphertext),
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    }
  })
}

/** Deletes every dream (batches of at most 400, awaited), then the key record. */
export async function deleteAllUserData(uid: string) {
  const snap = await getDocs(dreamsCol(uid))
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref)
    await batch.commit()
  }
  await deleteDoc(keyRef(uid))
}
