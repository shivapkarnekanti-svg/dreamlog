import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  addDream,
  clearEmulators,
  DREAM_TEXT,
  NEW_PASSPHRASE,
  PASSPHRASE,
  signUpAndSetup,
  storedDreamsJson,
  unlock,
} from './helpers'

test.setTimeout(90_000)

test.beforeEach(async ({ request }) => {
  await clearEmulators(request)
})

test('sign up, set passphrase, add a dream, lock, unlock', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'dreamer@example.com')
  await addDream(page)

  await page.getByRole('button', { name: 'Lock' }).click()
  await unlock(page, 'wrong passphrase!')
  await expect(page.getByText('Wrong passphrase')).toBeVisible()
  await unlock(page, PASSPHRASE)
  await expect(page.getByText('flying over a purple sea')).toBeVisible()

  await page.reload()
  await unlock(page, PASSPHRASE)
  await expect(page.getByText('flying over a purple sea')).toBeVisible()

  const stored = await storedDreamsJson(request)
  expect(stored).toContain('ciphertext')
  expect(stored).not.toContain('purple')
  expect(stored).not.toContain(DREAM_TEXT)
})

test('recovery key unlock sets a new passphrase', async ({ page, request }) => {
  const key = await signUpAndSetup(page, request, 'recover@example.com')
  await addDream(page)

  await page.getByRole('button', { name: 'Lock' }).click()
  await page.getByRole('button', { name: 'Use recovery key' }).click()
  await page.getByLabel('Recovery key').fill(key)
  await page.getByLabel('New passphrase (at least 10 characters)').fill(NEW_PASSPHRASE)
  await page.getByLabel('Confirm new passphrase').fill(NEW_PASSPHRASE)
  await page.getByRole('button', { name: 'Unlock and set new passphrase' }).click()
  await expect(page.getByText('flying over a purple sea')).toBeVisible()

  await page.getByRole('button', { name: 'Lock' }).click()
  await unlock(page, NEW_PASSPHRASE)
  await expect(page.getByText('flying over a purple sea')).toBeVisible()
})

test('no serious accessibility violations', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  const signIn = await new AxeBuilder({ page }).analyze()
  expect(
    signIn.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  await signUpAndSetup(page, request, 'axe@example.com')
  await addDream(page)
  const list = await new AxeBuilder({ page }).analyze()
  expect(list.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  )
})
