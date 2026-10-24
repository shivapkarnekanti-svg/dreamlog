import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { addRichDream, clearEmulators, signUpAndSetup, userDocCount } from './helpers'

test.setTimeout(90_000)

test.beforeEach(async ({ request }) => {
  await clearEmulators(request)
})

test('fields and search', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'fields@example.com')
  await addRichDream(page, {
    text: 'A lighthouse above a green harbor',
    emotions: ['joy'],
    people: ['Alice'],
    places: ['Harbor'],
    tags: ['water'],
    flags: ['Lucid'],
  })
  await addRichDream(page, {
    text: 'Chased through a dark corridor',
    emotions: ['fear'],
    people: ['Bob'],
    tags: ['chase'],
    flags: ['Nightmare'],
  })

  const lighthouse = page.getByRole('button', { name: /lighthouse above/ })
  const corridor = page.getByRole('button', { name: /dark corridor/ })
  await expect(lighthouse).toContainText('Lucid')
  await expect(lighthouse).toContainText('joy')
  await expect(lighthouse).toContainText('#water')
  await expect(corridor).toContainText('Nightmare')
  await expect(corridor).toContainText('fear')
  await expect(corridor).toContainText('#chase')

  const search = page.getByLabel('Search')
  await search.fill('chase')
  await expect(corridor).toBeVisible()
  await expect(lighthouse).toHaveCount(0)

  await search.fill('alice')
  await expect(lighthouse).toBeVisible()
  await expect(corridor).toHaveCount(0)

  await search.fill('')
  await page.getByRole('button', { name: 'Lucid', exact: true }).click()
  await expect(lighthouse).toBeVisible()
  await expect(corridor).toHaveCount(0)
  await page.getByRole('button', { name: 'Lucid', exact: true }).click()

  await search.fill('zzzqqq nonsense')
  await expect(page.getByText('No matching dreams')).toBeVisible()
})

test('patterns tab', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'patterns@example.com')
  const words = ['river', 'forest', 'castle', 'desert', 'island', 'tower']
  for (const w of words) {
    await addRichDream(page, {
      text: `A long walk near the ${w} today`,
      people: ['Alice'],
      emotions: ['joy'],
    })
  }

  await page.getByRole('button', { name: 'Patterns', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible()
  await expect(page.locator('.pat__summary')).toContainText('6 dreams')
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
  await expect(page.locator('.pat__bar-label').getByText('Alice', { exact: true })).toBeVisible()
  await expect(page.getByText('Worked out on this device').first()).toBeVisible()

  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await expect(page.getByRole('button', { name: /near the river/ })).toBeVisible()
})

test('AI panel never sends without consent', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'ai@example.com')
  await addRichDream(page, { text: 'Secret dream about a velvet moon' })
  await addRichDream(page, { text: 'Other dream about copper bells' })

  const bodies: string[] = []
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors })
      return
    }
    bodies.push(route.request().postData() ?? '')
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ type: 'text', text: 'A calm reading.' }] }),
    })
  })

  await page.getByRole('button', { name: 'Analyze', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Analyze with AI' })).toBeVisible()
  expect(bodies).toHaveLength(0)

  await page.getByLabel('Anthropic API key').fill('sk-ant-test-key')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('checkbox', { name: /velvet moon/ }).check()
  const analyze = page.getByRole('button', { name: 'Analyze selected dreams' })
  await expect(analyze).toBeDisabled()
  expect(bodies).toHaveLength(0)

  await page.getByLabel(/I understand these dreams will be sent/).check()
  await expect(analyze).toBeEnabled()
  expect(bodies).toHaveLength(0)

  await analyze.click()
  await expect(page.getByText('A calm reading.')).toBeVisible()
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toContain('velvet moon')
  expect(bodies[0]).not.toContain('copper bells')
})

test('export', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'export@example.com')
  await addRichDream(page, { text: 'Exported dream about a silver train' })

  await page.getByRole('button', { name: 'Account', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export my dreams (JSON)' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const json = JSON.parse(await readFile(path, 'utf8')) as {
    app: string
    dreams: { text: string }[]
  }
  expect(json.app).toBe('dreamlog')
  expect(json.dreams.map((d) => d.text)).toContain('Exported dream about a silver train')
})

test('delete account', async ({ page, request }) => {
  await signUpAndSetup(page, request, 'delete@example.com')
  await addRichDream(page, { text: 'A dream that will be deleted' })
  expect(await userDocCount(request)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await page.getByLabel('Login password').fill('login-password-123')
  await page.getByRole('button', { name: 'Delete my account forever' }).click()

  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 20_000 })
  await expect.poll(() => userDocCount(request)).toBe(0)
})
