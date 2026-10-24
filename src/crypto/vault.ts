// The encryption core. Only WebCrypto, no libraries. Design notes: docs/crypto.md.
//
// One random 256-bit data key encrypts every dream (AES-GCM). The data key is stored twice, each
// copy encrypted ("wrapped") with a different key-encryption key:
//   - one derived from the passphrase with PBKDF2-SHA256,
//   - one that is the recovery key itself (256 random bits, so no derivation is needed).
// Each ciphertext is bound to where it belongs (user, slot or dream id) with AES-GCM additional
// data, so the server cannot swap two ciphertexts without decryption failing.

export type Bytes = Uint8Array<ArrayBuffer>

export const KDF = 'PBKDF2-SHA256'
/** OWASP's 2023+ recommendation for PBKDF2-HMAC-SHA256. Stored per user, so it can be raised later. */
export const PBKDF2_ITERATIONS = 600_000
export const MIN_PASSPHRASE_LENGTH = 10

/** What Firestore keeps at users/{uid}. Nothing here reveals the data key without a secret. */
export interface KeyRecord {
  v: 1
  kdf: typeof KDF
  iterations: number
  salt: Bytes
  passIv: Bytes
  passWrapped: Bytes
  recoveryIv: Bytes
  recoveryWrapped: Bytes
}

export interface Sealed {
  iv: Bytes
  ciphertext: Bytes
}

export const EMOTIONS = [
  'joy',
  'fear',
  'anxiety',
  'sadness',
  'anger',
  'love',
  'confusion',
  'wonder',
  'peace',
  'shame',
  'excitement',
  'disgust',
] as const
export type Emotion = (typeof EMOTIONS)[number]

export const MAX_LIST_ITEMS = 20
export const MAX_ITEM_CHARS = 40

export interface DreamPayload {
  v: 1
  /** The night of the dream, YYYY-MM-DD. */
  date: string
  text: string
  // Everything below is optional on disk, so dreams saved before these fields still decode.
  emotions?: Emotion[]
  people?: string[]
  places?: string[]
  /** Lowercased. */
  tags?: string[]
  lucid?: boolean
  nightmare?: boolean
  recurring?: boolean
  sleepQuality?: number | null
  wakingMood?: number | null
}

/** Trims, drops empties, cuts to 40 characters, dedupes (case-insensitively), keeps at most 20. */
export function cleanList(values: unknown, lowercase = false): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    let item = Array.from(raw.trim().replace(/\s+/g, ' ')).slice(0, MAX_ITEM_CHARS).join('').trim()
    if (lowercase) item = item.toLowerCase()
    const key = item.toLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length === MAX_LIST_ITEMS) break
  }
  return out
}

const rating = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null

/** Fills defaults and cleans every optional field. Safe on old or hand-edited payloads. */
export function normalizePayload<T extends { date: string; text: string }>(input: T): DreamPayload {
  const o = input as Record<string, unknown>
  const given = Array.isArray(o.emotions) ? (o.emotions as unknown[]) : []
  return {
    v: 1,
    date: input.date,
    text: input.text,
    emotions: EMOTIONS.filter((e) => given.includes(e)),
    people: cleanList(o.people),
    places: cleanList(o.places),
    tags: cleanList(o.tags, true),
    lucid: o.lucid === true,
    nightmare: o.nightmare === true,
    recurring: o.recurring === true,
    sleepQuality: rating(o.sleepQuality),
    wakingMood: rating(o.wakingMood),
  }
}

export class WrongSecretError extends Error {
  constructor(what: 'passphrase' | 'recovery key') {
    super(`That ${what} does not unlock this journal.`)
    this.name = 'WrongSecretError'
  }
}

const subtle = globalThis.crypto.subtle
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const random = (n: number): Bytes => globalThis.crypto.getRandomValues(new Uint8Array(n))
const utf8 = (s: string): Bytes => encoder.encode(s) as Bytes

const aad = {
  passphrase: (uid: string) => utf8(`dreamlog/v1/key/passphrase/${uid}`),
  recovery: (uid: string) => utf8(`dreamlog/v1/key/recovery/${uid}`),
  dream: (uid: string, id: string) => utf8(`dreamlog/v1/dream/${uid}/${id}`),
}

async function passphraseKey(passphrase: string, salt: Bytes, iterations: number) {
  const material = await subtle.importKey(
    'raw',
    utf8(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

const aesKey = (raw: Bytes) =>
  subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])

async function seal(key: CryptoKey, plain: Bytes, additionalData: Bytes): Promise<Sealed> {
  const iv = random(12)
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, plain)
  return { iv, ciphertext: new Uint8Array(ct) }
}

async function open(key: CryptoKey, sealed: Sealed, additionalData: Bytes): Promise<Bytes> {
  const { iv, ciphertext } = sealed
  return new Uint8Array(
    await subtle.decrypt({ name: 'AES-GCM', iv, additionalData }, key, ciphertext),
  )
}

async function wrapWithPassphrase(
  uid: string,
  rawDataKey: Bytes,
  passphrase: string,
  iterations: number,
) {
  const salt = random(16)
  const kek = await passphraseKey(passphrase, salt, iterations)
  const { iv, ciphertext } = await seal(kek, rawDataKey, aad.passphrase(uid))
  return { salt, passIv: iv, passWrapped: ciphertext }
}

/**
 * Makes a new data key for a new journal. Returns the record to store, the recovery key to show
 * once (it is never stored anywhere), and the data key, ready to use and not extractable.
 */
export async function createVault(uid: string, passphrase: string, iterations = PBKDF2_ITERATIONS) {
  const raw = random(32)
  const recoveryRaw = random(32)
  try {
    const pass = await wrapWithPassphrase(uid, raw, passphrase, iterations)
    const rec = await seal(await aesKey(recoveryRaw), raw, aad.recovery(uid))
    const record: KeyRecord = {
      v: 1,
      kdf: KDF,
      iterations,
      ...pass,
      recoveryIv: rec.iv,
      recoveryWrapped: rec.ciphertext,
    }
    return { record, recoveryKey: encodeRecoveryKey(recoveryRaw), dataKey: await aesKey(raw) }
  } finally {
    raw.fill(0)
    recoveryRaw.fill(0)
  }
}

/** The data key, or WrongSecretError. AES-GCM's tag check is what detects a wrong passphrase. */
export async function unlockWithPassphrase(uid: string, record: KeyRecord, passphrase: string) {
  const kek = await passphraseKey(passphrase, record.salt, record.iterations)
  let raw: Bytes
  try {
    raw = await open(
      kek,
      { iv: record.passIv, ciphertext: record.passWrapped },
      aad.passphrase(uid),
    )
  } catch {
    throw new WrongSecretError('passphrase')
  }
  try {
    return await aesKey(raw)
  } finally {
    raw.fill(0)
  }
}

/**
 * For a forgotten passphrase: opens the data key with the recovery key and wraps it again under a
 * new passphrase. Returns the fields of the record that change, and the data key.
 */
export async function resetPassphrase(
  uid: string,
  record: KeyRecord,
  recoveryKey: string,
  newPassphrase: string,
  iterations = PBKDF2_ITERATIONS,
) {
  const recoveryRaw = decodeRecoveryKey(recoveryKey)
  let raw: Bytes
  try {
    const sealed = { iv: record.recoveryIv, ciphertext: record.recoveryWrapped }
    raw = await open(await aesKey(recoveryRaw), sealed, aad.recovery(uid))
  } catch {
    throw new WrongSecretError('recovery key')
  } finally {
    recoveryRaw.fill(0)
  }
  try {
    const pass = await wrapWithPassphrase(uid, raw, newPassphrase, iterations)
    return { changes: { iterations, ...pass }, dataKey: await aesKey(raw) }
  } finally {
    raw.fill(0)
  }
}

export async function encryptDream(
  dataKey: CryptoKey,
  uid: string,
  id: string,
  dream: DreamPayload,
) {
  return seal(dataKey, utf8(JSON.stringify(dream)), aad.dream(uid, id))
}

export async function decryptDream(
  dataKey: CryptoKey,
  uid: string,
  id: string,
  sealed: Sealed,
): Promise<DreamPayload> {
  const value: unknown = JSON.parse(decoder.decode(await open(dataKey, sealed, aad.dream(uid, id))))
  if (!isDreamPayload(value)) throw new Error('Unknown dream format')
  return value
}

function isDreamPayload(v: unknown): v is DreamPayload {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return d.v === 1 && typeof d.date === 'string' && typeof d.text === 'string'
}

// ---- recovery key text: base32 (RFC 4648 alphabet), 52 letters in groups of 4 ----------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function encodeRecoveryKey(raw: Bytes): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of raw) {
    value = ((value << 8) | byte) & 0xfff
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out.match(/.{1,4}/g)!.join('-')
}

/** Accepts any case, spaces and dashes, and 0/1 typed for O/I. Throws WrongSecretError if malformed. */
export function decodeRecoveryKey(text: string): Bytes {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/0/g, 'O').replace(/1/g, 'I')
  if (clean.length !== 52) throw new WrongSecretError('recovery key')
  const out = new Uint8Array(32)
  let bits = 0
  let value = 0
  let i = 0
  for (const ch of clean) {
    const n = ALPHABET.indexOf(ch)
    if (n < 0) throw new WrongSecretError('recovery key')
    value = ((value << 5) | n) & 0xfff
    bits += 5
    if (bits >= 8) {
      if (i < 32) out[i++] = (value >>> (bits - 8)) & 0xff
      bits -= 8
    }
  }
  return out
}
