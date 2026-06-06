import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 10_000,
    retry: 1,
    pool: 'forks',
    // memory-budget: singleFork=true keeps all files in one fork to avoid RAM exhaustion
    // see openspec/specs/toolchain-parallelism-budget/spec.md
    // @ts-expect-error -- singleFork requires Vitest 5+; present in apps/web as a future upgrade
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    passWithNoTests: true,
    clearMocks: true,
  },
});
