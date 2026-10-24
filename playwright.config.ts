import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    // Explicit demo values, so a local .env.local with the real project can never leak into tests.
    env: {
      VITE_USE_EMULATORS: 'true',
      VITE_FIREBASE_API_KEY: 'demo-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-dreamlog.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-dreamlog',
      VITE_FIREBASE_APP_ID: 'demo-app-id',
    },
    timeout: 120_000,
  },
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel-390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
})
