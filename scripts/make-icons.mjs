// Renders public/icon.svg to the PNG icons the manifest and iOS need. Run: npm run icons
// Uses Playwright's Chromium (already a dev dependency), so no image library is needed.
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const rounded = readFileSync('public/icon.svg', 'utf8')
// Full-bleed square for "maskable" (the phone applies its own shape) and for iOS (no transparency).
const square = rounded.replace(' rx="96"', '')
// Maskable icons keep their content inside a central circle (80% of the width), so shrink the moon.
const safe = square
  .replace(
    /(<rect[^>]*\/>)/,
    '$1<g transform="translate(256 256) scale(.82) translate(-256 -256)">',
  )
  .replace('</svg>', '</g></svg>')

const targets = [
  { file: 'public/icon-192.png', svg: rounded, size: 192, transparent: true },
  { file: 'public/icon-512.png', svg: rounded, size: 512, transparent: true },
  { file: 'public/icon-maskable-512.png', svg: safe, size: 512, transparent: false },
  { file: 'public/apple-touch-icon.png', svg: square, size: 180, transparent: false },
]

const browser = await chromium.launch()
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size } })
    const body = `<body style="margin:0;background:transparent">${t.svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body>`
    await page.setContent(body)
    writeFileSync(t.file, await page.screenshot({ omitBackground: t.transparent }))
    await page.close()
    console.log(`wrote ${t.file}`)
  }
} finally {
  await browser.close()
}
