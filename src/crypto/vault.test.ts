import { describe, expect, it } from 'vitest'
import {
  createVault,
  decodeRecoveryKey,
  decryptDream,
  encodeRecoveryKey,
  encryptDream,
  resetPassphrase,
  unlockWithPassphrase,
  WrongSecretError,
  type Bytes,
} from './vault'

// Low iterations keep the suite fast; the production count is the default argument.
const FAST = 1_000
const UID = 'alice'
const DREAM = { v: 1 as const, date: '2026-10-22', text: 'Teeth falling out on a ferry 🌊' }

describe('vault', () => {
  it('round-trips a dream through a passphrase unlock', async () => {
    const { record, dataKey } = await createVault(UID, 'correct horse battery', FAST)
    const sealed = await encryptDream(dataKey, UID, 'd1', DREAM)

    const unlocked = await unlockWithPassphrase(UID, record, 'correct horse battery')
    expect(await decryptDream(unlocked, UID, 'd1', sealed)).toEqual(DREAM)
  })

  it('never contains the plaintext in what it stores', async () => {
    const { record, dataKey } = await createVault(UID, 'correct horse battery', FAST)
    const sealed = await encryptDream(dataKey, UID, 'd1', DREAM)
    const stored = new TextDecoder('utf-8', { fatal: false }).decode(sealed.ciphertext)
    expect(stored).not.toContain('ferry')
    expect(sealed.iv).toHaveLength(12)
    expect(Object.keys(record).sort()).toEqual(
      [
        'iterations',
        'kdf',
        'passIv',
        'passWrapped',
        'recoveryIv',
        'recoveryWrapped',
        'salt',
        'v',
      ].sort(),
    )
  })

  it('rejects a wrong passphrase', async () => {
    const { record } = await createVault(UID, 'correct horse battery', FAST)
    await expect(unlockWithPassphrase(UID, record, 'correct horse batterY')).rejects.toBeInstanceOf(
      WrongSecretError,
    )
  })

  it("rejects another user's key record (bound to the uid)", async () => {
    const { record } = await createVault(UID, 'correct horse battery', FAST)
    await expect(unlockWithPassphrase('mallory', record, 'correct horse battery')).rejects.toThrow()
  })

  it('fails to decrypt a tampered or moved dream', async () => {
    const { dataKey } = await createVault(UID, 'correct horse battery', FAST)
    const sealed = await encryptDream(dataKey, UID, 'd1', DREAM)
    // Moved to another document id: the additional data no longer matches.
    await expect(decryptDream(dataKey, UID, 'd2', sealed)).rejects.toThrow()
    const flipped = new Uint8Array(sealed.ciphertext) as Bytes
    flipped[0]! ^= 1
    await expect(
      decryptDream(dataKey, UID, 'd1', { ...sealed, ciphertext: flipped }),
    ).rejects.toThrow()
  })

  it('uses a fresh iv for every encryption', async () => {
    const { dataKey } = await createVault(UID, 'correct horse battery', FAST)
    const a = await encryptDream(dataKey, UID, 'd1', DREAM)
    const b = await encryptDream(dataKey, UID, 'd1', DREAM)
    expect(a.iv).not.toEqual(b.iv)
    expect(a.ciphertext).not.toEqual(b.ciphertext)
  })

  it('resets a forgotten passphrase with the recovery key and keeps old dreams readable', async () => {
    const { record, recoveryKey, dataKey } = await createVault(UID, 'first passphrase', FAST)
    const sealed = await encryptDream(dataKey, UID, 'd1', DREAM)

    const { changes } = await resetPassphrase(
      UID,
      record,
      recoveryKey.toLowerCase(),
      'second one!',
      FAST,
    )
    const updated = { ...record, ...changes }
    await expect(unlockWithPassphrase(UID, updated, 'first passphrase')).rejects.toBeInstanceOf(
      WrongSecretError,
    )
    const key = await unlockWithPassphrase(UID, updated, 'second one!')
    expect(await decryptDream(key, UID, 'd1', sealed)).toEqual(DREAM)
  })

  it('rejects a wrong recovery key', async () => {
    const { record } = await createVault(UID, 'first passphrase', FAST)
    const other = encodeRecoveryKey(new Uint8Array(32) as Bytes)
    await expect(resetPassphrase(UID, record, other, 'x'.repeat(12), FAST)).rejects.toBeInstanceOf(
      WrongSecretError,
    )
    await expect(
      resetPassphrase(UID, record, 'too-short', 'x'.repeat(12), FAST),
    ).rejects.toBeInstanceOf(WrongSecretError)
  })
})

describe('recovery key text', () => {
  it('round-trips 32 bytes through 13 groups of 4', () => {
    const raw = globalThis.crypto.getRandomValues(new Uint8Array(32)) as Bytes
    const text = encodeRecoveryKey(raw)
    expect(text).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/)
    expect(decodeRecoveryKey(text)).toEqual(raw)
    expect(decodeRecoveryKey(text.replace(/-/g, ' ').toLowerCase())).toEqual(raw)
  })

  it('reads 0 and 1 as O and I', () => {
    const raw = new Uint8Array(32).fill(0x73) as Bytes
    const text = encodeRecoveryKey(raw)
    expect(decodeRecoveryKey(text.replace(/O/g, '0').replace(/I/g, '1'))).toEqual(raw)
  })
})
