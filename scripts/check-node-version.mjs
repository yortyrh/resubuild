#!/usr/bin/env node

import { readFileSync } from 'node:fs';

// Single source of truth: root package.json `devEngines.runtime`, which pnpm
// downloads and puts on PATH for every `pnpm run` script.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const requiredVersion = pkg.devEngines.runtime.version;
const requiredMajor = Number.parseInt(requiredVersion.split('.')[0], 10);
const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (major !== requiredMajor) {
  console.error(
    `Node ${requiredMajor}.x is required for local verify/CI parity (current: ${process.version}).`,
  );
  console.error(
    'Run it through pnpm (`pnpm verify`) so pnpm uses the Node from devEngines.runtime.',
  );
  process.exit(1);
}
