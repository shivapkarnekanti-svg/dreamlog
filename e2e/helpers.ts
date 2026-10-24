import { expect, type APIRequestContext, type Page } from '@playwright/test'

const AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-dreamlog'
const FIRESTORE =
  'http://127.0.0.1:8080/emulator/v1/projects/demo-dreamlog/databases/(default)/documents'
const FIRESTORE_REST =
  'http://127.0.0.1:8080/v1/projects/demo-dreamlog/databases/(default)/documents'

export const PASSPHRASE = 'correct horse battery'
export const NEW_PASSPHRASE = 'another long passphrase'
export const DREAM_TEXT = 'I was flying over a purple sea'

export async function clearEmulators(request: APIRequestContext): Promise<void> {
  await request.delete(`${AUTH}/accounts`)
  await request.delete(FIRESTORE)
}

export async function verifyEmail(request: APIRequestContext, email: string): Promise<void> {
  await expect(async () => {
    const res = await request.get(`${AUTH}/oobCodes`)
    const body = (await res.json()) as {
      oobCodes: { email: string; requestType: string; oobLink: string }[]
    }
    const hit = body.oobCodes
      .filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
      .at(-1)
    expect(hit).toBeTruthy()
    const verify = await request.get(hit!.oobLink)
    expect(verify.ok()).toBe(true)
  }).toPass({ timeout: 15_000 })
}

/** Sign up, verify, set a passphrase, save the recovery key. Returns the recovery key. */
export async function signUpAndSetup(
  page: Page,
  request: APIRequestContext,
  email: string,
  passphrase = PASSPHRASE,
): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Login password').fill('login-password-123')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await verifyEmail(request, email)
  await page.getByRole('button', { name: "I've verified" }).click()
  await page.getByLabel('Passphrase (at least 10 characters)').fill(passphrase)
  await page.getByLabel('Confirm passphrase').fill(passphrase)
  await page.getByRole('button', { name: 'Create journal' }).click()
  const key = (await page.getByTestId('recovery-key').innerText()).trim()
  expect(key.length).toBeGreaterThan(10)
  await page.getByLabel('I saved my recovery key').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('No dreams yet')).toBeVisible()
  return key
}

export async function addDream(page: Page, text = DREAM_TEXT): Promise<void> {
  await page.getByRole('button', { name: 'New dream' }).click()
  await page.getByLabel('Dream', { exact: true }).fill(text)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(text.slice(6))).toBeVisible()
}

export async function unlock(page: Page, passphrase: string): Promise<void> {
  await page.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
}

/** Raw stored dream documents for all users, from the Firestore emulator REST API. */
export async function storedDreamsJson(request: APIRequestContext): Promise<string> {
  const headers = { Authorization: 'Bearer owner' }
  const users = await request.get(`${FIRESTORE_REST}/users`, { headers })
  const list = (await users.json()) as { documents?: { name: string }[] }
  const parts: string[] = []
  for (const doc of list.documents ?? []) {
    const uid = doc.name.split('/').pop()
    const res = await request.get(`${FIRESTORE_REST}/users/${uid}/dreams`, { headers })
    parts.push(await res.text())
  }
  return parts.join('\n')
}
