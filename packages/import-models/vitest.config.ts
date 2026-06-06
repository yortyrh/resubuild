import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // memory-budget: singleFork=true keeps all files in one fork to avoid RAM exhaustion
    // see openspec/specs/toolchain-parallelism-budget/spec.md
    // @ts-expect-error -- singleFork requires Vitest 5+; all workspaces ship Vitest 4
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
});
