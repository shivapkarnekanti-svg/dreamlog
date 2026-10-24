import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.test.ts'],
    // One emulator, one shared database: run files and tests in order.
    fileParallelism: false,
    testTimeout: 20000,
  },
})
