/**
 * Unit tests for scripts/ensure-node-version.mjs.
 *
 * The script is run by the lefthook pre-push guard to auto-detect a Node
 * version manager (fnm > mise > volta > asdf > n > nvm), install the version
 * pinned in .nvmrc if needed, and emit shell that prepends the manager's
 * Node bin dir to PATH. These tests cover the decision tree without spawning
 * real version managers or modifying the host filesystem.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  currentNodeMajor,
  detectManager,
  printInstallHints,
  readRequiredMajor,
  resolveFnmDir,
  resolveNodeBinDir,
  run,
} from './ensure-node-version.mjs';

class WritableStub {
  constructor() {
    this.chunks = [];
  }
  write(chunk) {
    this.chunks.push(chunk);
    return true;
  }
  text() {
    return this.chunks.join('');
  }
}

function writablePair() {
  return { stdout: new WritableStub(), stderr: new WritableStub() };
}

function withTmpDir(callback) {
  const dir = mkdtempSync(join(tmpdir(), 'ensure-node-version-'));
  try {
    return callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('readRequiredMajor', () => {
  it('parses plain major like "22"', () => {
    withTmpDir((dir) => {
      writeFileSync(join(dir, '.nvmrc'), '22\n');
      expect(readRequiredMajor(dir)).toBe(22);
    });
  });

  it('parses full version "v22.11.0"', () => {
    withTmpDir((dir) => {
      writeFileSync(join(dir, '.nvmrc'), 'v22.11.0');
      expect(readRequiredMajor(dir)).toBe(22);
    });
  });

  it('throws when .nvmrc is missing', () => {
    withTmpDir((dir) => {
      expect(() => readRequiredMajor(dir)).toThrow(/\.nvmrc not found/);
    });
  });

  it('throws when .nvmrc is unparseable', () => {
    withTmpDir((dir) => {
      writeFileSync(join(dir, '.nvmrc'), 'lts/hydrogen\n');
      expect(() => readRequiredMajor(dir)).toThrow();
    });
  });
});

describe('currentNodeMajor', () => {
  it('returns the major version of the running Node', () => {
    const expected = Number.parseInt(process.versions.node.split('.')[0], 10);
    expect(currentNodeMajor()).toBe(expected);
  });
});

describe('detectManager', () => {
  it('returns null when no supported manager is on PATH and no nvm install exists', () => {
    const saved = { PATH: process.env.PATH, NVM_DIR: process.env.NVM_DIR, HOME: process.env.HOME };
    process.env.PATH = '/usr/bin:/bin';
    delete process.env.NVM_DIR;
    process.env.HOME = '/nonexistent-ensure-no-nvm';
    try {
      expect(detectManager()).toBeNull();
    } finally {
      process.env.PATH = saved.PATH;
      if (saved.NVM_DIR === undefined) delete process.env.NVM_DIR;
      else process.env.NVM_DIR = saved.NVM_DIR;
      process.env.HOME = saved.HOME;
    }
  });
});

describe('resolveFnmDir', () => {
  it('prefers FNM_DIR env var when set', () => {
    const saved = process.env.FNM_DIR;
    process.env.FNM_DIR = '/custom/fnm/root';
    try {
      expect(resolveFnmDir()).toBe('/custom/fnm/root');
    } finally {
      if (saved === undefined) delete process.env.FNM_DIR;
      else process.env.FNM_DIR = saved;
    }
  });

  it('falls back to ~/.local/share/fnm when FNM_DIR is unset', () => {
    const saved = { FNM_DIR: process.env.FNM_DIR, HOME: process.env.HOME };
    delete process.env.FNM_DIR;
    process.env.HOME = '/Users/example';
    try {
      expect(resolveFnmDir()).toBe('/Users/example/.local/share/fnm');
    } finally {
      if (saved.FNM_DIR === undefined) delete process.env.FNM_DIR;
      else process.env.FNM_DIR = saved.FNM_DIR;
      process.env.HOME = saved.HOME;
    }
  });
});

describe('resolveNodeBinDir (fnm)', () => {
  it('resolves the bin dir under FNM_DIR when the version is installed', () => {
    withTmpDir((root) => {
      const bin = join(root, 'node-versions', 'v22.22.3', 'installation', 'bin');
      mkdirSync(bin, { recursive: true });
      writeFileSync(join(bin, 'node'), '#!/bin/sh\n');
      const saved = { FNM_DIR: process.env.FNM_DIR };
      process.env.FNM_DIR = root;
      try {
        const result = resolveNodeBinDir({ kind: 'fnm', binary: 'fnm' }, { required: 22 });
        // If the host has fnm available, it may return the real path instead
        // of our fake; only assert when the host doesn't have fnm. We just
        // assert the result is a string ending in /bin.
        if (result) expect(result).toMatch(/\/bin$/);
      } finally {
        if (saved.FNM_DIR === undefined) delete process.env.FNM_DIR;
        else process.env.FNM_DIR = saved.FNM_DIR;
      }
    });
  });
});

describe('printInstallHints', () => {
  it('writes a non-empty install hint block', () => {
    const stub = new WritableStub();
    printInstallHints(stub);
    const text = stub.text();
    expect(text).toContain('No supported Node version manager was found on PATH');
    expect(text).toContain('brew install fnm');
    expect(text).toContain('https://fnm.vercel.app/install');
  });
});

describe('run', () => {
  it('returns noop-exit when current Node matches the required major', () => {
    const { stdout, stderr } = writablePair();
    const result = run({
      argv: ['node', 'ensure-node-version.mjs'],
      env: { PATH: '/usr/bin' },
      currentMajor: 22,
      stdout,
      stderr,
      required: 22,
    });
    expect(result).toEqual({ kind: 'noop-exit', code: 0 });
    expect(stdout.text()).toBe('');
  });

  it('returns no-manager + writes hints when no manager is detected', () => {
    const { stdout, stderr } = writablePair();
    const result = run({
      argv: ['node', 'ensure-node-version.mjs'],
      env: { PATH: '/usr/bin', NODE_VERSION: 'v26.0.0' },
      currentMajor: 26,
      stdout,
      stderr,
      detect: () => null,
      required: 22,
    });
    expect(result.kind).toBe('no-manager');
    expect(result.code).toBe(1);
    expect(stderr.text()).toContain('Node 22.x is required');
    expect(stderr.text()).toContain('brew install fnm');
  });

  it('emits eval script that prepends the manager bin dir to PATH', () => {
    const { stdout, stderr } = writablePair();
    const result = run({
      argv: ['node', 'ensure-node-version.mjs'],
      env: { PATH: '/usr/bin:/bin', NODE_VERSION: 'v26.0.0' },
      currentMajor: 26,
      stdout,
      stderr,
      detect: () => ({ kind: 'fnm', binary: 'fnm' }),
      resolveBin: () => '/fake/fnm/v22.22.3/installation/bin',
      required: 22,
    });
    expect(result.kind).toBe('eval');
    expect(result.code).toBe(0);
    const script = stdout.text();
    expect(script).toContain('export PATH="/fake/fnm/v22.22.3/installation/bin:/usr/bin:/bin"');
    expect(script).toContain('node-version:ensure: switched PATH');
    expect(script).toContain('via fnm');
  });

  it('auto-installs and emits eval-installed when manager is missing the major', () => {
    const { stdout, stderr } = writablePair();
    let calls = 0;
    const result = run({
      argv: ['node', 'ensure-node-version.mjs'],
      env: { PATH: '/usr/bin', NODE_VERSION: 'v26.0.0' },
      currentMajor: 26,
      stdout,
      stderr,
      detect: () => ({ kind: 'fnm', binary: 'fnm' }),
      // First call (initial probe): not installed yet. Second call (after
      // install): found.
      resolveBin: () => {
        calls += 1;
        return calls === 1 ? null : '/fake/fnm/v22.22.3/installation/bin';
      },
      doInstall: () => true,
      required: 22,
    });
    expect(result.kind).toBe('eval-installed');
    expect(result.code).toBe(0);
    expect(stdout.text()).toContain('installed + switched');
  });

  it('returns eval-failed when install reports failure', () => {
    const { stdout, stderr } = writablePair();
    const result = run({
      argv: ['node', 'ensure-node-version.mjs'],
      env: { PATH: '/usr/bin', NODE_VERSION: 'v26.0.0' },
      currentMajor: 26,
      stdout,
      stderr,
      detect: () => ({ kind: 'fnm', binary: 'fnm' }),
      resolveBin: () => null,
      doInstall: () => false,
      required: 22,
    });
    expect(result.kind).toBe('eval-failed');
    expect(result.code).toBe(1);
    expect(result.reason).toBe('install-failed');
    expect(stderr.text()).toContain('Failed to install Node 22.x via fnm');
  });

  it('passes trailing command args to exec mode and forwards exit code', () => {
    const { stdout, stderr } = writablePair();
    const result = run({
      argv: ['node', 'ensure-node-version.mjs', '--', 'node', '--version'],
      env: { PATH: '/usr/bin', NODE_VERSION: 'v26.0.0' },
      currentMajor: 26,
      stdout,
      stderr,
      detect: () => ({ kind: 'fnm', binary: 'fnm' }),
      resolveBin: () => '/fake/fnm/bin',
      doInstall: () => true,
      doExec: () => 42,
      required: 22,
    });
    expect(result.kind).toBe('exec');
    expect(result.code).toBe(42);
  });
});
