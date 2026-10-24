import { describe, expect, it } from 'vitest'
import { scanName, scanText } from './secret-scan.mjs'

describe('secret scan', () => {
  it('blocks credential file names but allows .env.example', () => {
    expect(scanName('keys/my-project-firebase-adminsdk-abc.json')).toBeTruthy()
    expect(scanName('serviceAccount.json')).toBeTruthy()
    expect(scanName('.env.local')).toBeTruthy()
    expect(scanName('.env')).toBeTruthy()
    expect(scanName('.env.example')).toBeNull()
    expect(scanName('src/App.tsx')).toBeNull()
  })

  it('flags private keys and service account JSON', () => {
    const pem = ['-----BEGIN PRIVATE', 'KEY-----'].join(' ')
    expect(scanText(pem)).toContain('private key block')
    const sa = '{"type": "' + 'service' + '_account"}'
    expect(scanText(sa)).toContain('service account key')
  })

  it('flags OAuth and CLI tokens', () => {
    expect(scanText('ya29.' + 'a'.repeat(30))).toContain('Google OAuth token')
    expect(scanText('1//0' + 'b'.repeat(45))).toContain('Firebase CLI refresh token')
  })

  it('does not flag the public Firebase web config', () => {
    expect(scanText('apiKey: "AIzaSyD-example-public-web-key-1234567890"')).toEqual([])
  })
})
