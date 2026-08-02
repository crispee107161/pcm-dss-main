import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    env: {
      // lib/prisma.ts constructs a pg Pool at import time; a dummy value
      // avoids import-time failures for stats modules that co-locate pure
      // functions with prisma-backed ones. No tests here touch the DB.
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
})
