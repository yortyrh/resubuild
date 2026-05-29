#!/usr/bin/env node

const REQUIRED_MAJOR = 22;
const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (major !== REQUIRED_MAJOR) {
  console.error(
    `Node ${REQUIRED_MAJOR}.x is required for local verify/CI parity (current: ${process.version}).`,
  );
  console.error('Use the version in .nvmrc (e.g. nvm use, fnm use, mise install).');
  process.exit(1);
}
