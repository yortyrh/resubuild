import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scripts live at the repo root alongside the monorepo root.
    // We run them with a node environment only.
    // see openspec/specs/toolchain-parallelism-budget/spec.md
    environment: 'node',
    // Only run scripts/**/*.spec.mjs at the root; other workspaces
    // have their own vitest configs and Turbo pipelines.
    include: ['scripts/**/*.spec.mjs'],
    passWithNoTests: true,
  },
});
