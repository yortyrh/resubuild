#!/usr/bin/env node
// Ensure the active Node version matches .nvmrc before running a command.
//
// Two modes of operation:
//
//   1. Eval mode (default, no positional args):
//      Prints shell code on stdout that, when eval'd, mutates the calling
//      shell's PATH so subsequent commands use the right Node binary. If
//      the active Node already matches .nvmrc, prints nothing (no-op).
//      This is the mode used by the lefthook pre-push guard so that PATH
//      changes propagate to every later `commands.run` entry in the same
//      hook chain.
//
//   2. Exec mode (with positional args):
//      Re-execs the supplied command with a PATH that resolves to the
//      version-manager-installed Node binary. Used by `pnpm verify` for
//      defense in depth (a developer running verify outside the hook).
//
// Detection priority for the Node version manager:
//      fnm > mise > volta > asdf > n > nvm
// If none is found and the active Node is wrong, the script exits 1 with
// install instructions (macOS brew + curl fallbacks). The user can then
// install fnm/mise/etc. once and have it pick up `.nvmrc` automatically
// via the shell-init hint we also print.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

/**
 * Parse .nvmrc → required major version. Supports "22" or "v22.11.0".
 * Pass an explicit `nvmrcDir` to override the default repo-root lookup
 * (used by tests).
 */
function readRequiredMajor(nvmrcDir = REPO_ROOT) {
  const path = join(nvmrcDir, '.nvmrc');
  if (!existsSync(path)) {
    throw new Error(`.nvmrc not found at ${path}`);
  }
  const raw = readFileSync(path, 'utf8').trim();
  const match = raw.match(/v?(\d+)(?:\.\d+)?/);
  if (!match) {
    throw new Error(`.nvmrc contains an unparseable version: "${raw}"`);
  }
  return Number.parseInt(match[1], 10);
}

function currentNodeMajor() {
  return Number.parseInt(process.versions.node.split('.')[0], 10);
}

function tryExec(command, args, opts = {}) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      ...opts,
    }).trim();
  } catch {
    return null;
  }
}

function commandExists(cmd) {
  return tryExec('command', ['-v', cmd]) !== null;
}

/**
 * Detect the first available version manager. Returns a tagged union or null.
 * nvm is a shell function and may not be on PATH; we look for its install dir.
 */
function detectManager() {
  if (commandExists('fnm')) return { kind: 'fnm', binary: 'fnm' };
  if (commandExists('mise')) return { kind: 'mise', binary: 'mise' };
  if (commandExists('volta')) return { kind: 'volta', binary: 'volta' };
  if (commandExists('asdf')) return { kind: 'asdf', binary: 'asdf', plugin: 'nodejs' };
  if (commandExists('n')) return { kind: 'n', binary: 'n' };
  if (process.env.NVM_DIR && existsSync(join(process.env.NVM_DIR, 'nvm.sh'))) {
    return { kind: 'nvm', shellInit: join(process.env.NVM_DIR, 'nvm.sh') };
  }
  if (existsSync(join(process.env.HOME ?? '', '.nvm', 'nvm.sh'))) {
    return {
      kind: 'nvm',
      shellInit: join(process.env.HOME ?? '', '.nvm', 'nvm.sh'),
    };
  }
  return null;
}

/** Resolve fnm's install root. Defaults to ~/.local/share/fnm on macOS/Linux. */
function resolveFnmDir() {
  if (process.env.FNM_DIR) return process.env.FNM_DIR;
  // `fnm env` itself requires --fnm-dir if FNM_DIR is unset, so we fall back
  // to a probe: list a known-stable parent dir.
  return join(process.env.HOME ?? '', '.local', 'share', 'fnm');
}

/** Resolve the on-disk bin directory for the required Node major under a manager. */
function resolveNodeBinDir(manager) {
  const major = readRequiredMajor();
  switch (manager.kind) {
    case 'fnm': {
      const fnmDir = resolveFnmDir();
      const versionList = tryExec(manager.binary, ['list', '--fnm-dir', fnmDir]);
      if (!versionList) return null;
      for (const line of versionList.split('\n').map((l) => l.trim())) {
        if (!line) continue;
        // `fnm list` marks the active version with a leading "* " and the
        // default with " default". Strip both before matching the version.
        const stripped = line.replace(/^\*\s*/, '');
        const match = stripped.match(/^v?(\d+)\./);
        if (match && Number.parseInt(match[1], 10) === major) {
          const version = stripped.split(/\s/)[0];
          const candidate = join(fnmDir, 'node-versions', version, 'installation', 'bin');
          if (existsSync(candidate)) return candidate;
        }
      }
      return null;
    }
    case 'volta': {
      const voltaHome = process.env.VOLTA_HOME ?? join(process.env.HOME ?? '', '.volta');
      const toolsBin = join(voltaHome, 'bin');
      return existsSync(toolsBin) ? toolsBin : null;
    }
    case 'mise':
    case 'asdf': {
      const out = tryExec(manager.binary, ['where', `node@${major}`]);
      return out ? join(out, 'bin') : null;
    }
    case 'n': {
      const prefix = process.env.N_PREFIX ?? '/usr/local';
      return join(prefix, 'bin');
    }
    case 'nvm': {
      const versionsRoot = join(
        process.env.NVM_DIR ?? join(process.env.HOME ?? '', '.nvm'),
        'versions',
        'node',
      );
      if (!existsSync(versionsRoot)) return null;
      const expected = `v${major}.`;
      for (const entry of tryExec('ls', ['-1', versionsRoot])?.split('\n') ?? []) {
        if (entry.startsWith(expected)) {
          return join(versionsRoot, entry, 'bin');
        }
      }
      return null;
    }
    default:
      return null;
  }
}

function installNode(manager) {
  const major = readRequiredMajor();
  switch (manager.kind) {
    case 'fnm':
      return (
        spawnSync(manager.binary, ['install', String(major), '--fnm-dir', resolveFnmDir()], {
          stdio: 'inherit',
        }).status === 0
      );
    case 'mise':
      return (
        spawnSync(manager.binary, ['install', `node@${major}`], { stdio: 'inherit' }).status === 0
      );
    case 'volta':
      return (
        spawnSync(manager.binary, ['install', `node@${major}`], { stdio: 'inherit' }).status === 0
      );
    case 'asdf':
      return (
        spawnSync(manager.binary, ['install', 'nodejs', `latest:${major}`], { stdio: 'inherit' })
          .status === 0
      );
    case 'n':
      return spawnSync(manager.binary, [String(major)], { stdio: 'inherit' }).status === 0;
    case 'nvm':
      // nvm is shell-only; we can't install from a non-interactive Node child.
      console.error(`nvm detected. Run: source ${manager.shellInit} && nvm install ${major}`);
      return false;
    default:
      return false;
  }
}

const INSTALL_HINTS = [
  '  brew install fnm           # macOS/Linux, fast (recommended)',
  '  curl -fsSL https://fnm.vercel.app/install | bash',
  '  https://mise.jdx.dev/getting-started.html',
  '  https://docs.volta.sh/guide/getting-started',
];

/**
 * Exec mode: re-exec the trailing command (everything after `--`) with a
 * PATH prepended with the version-manager's Node bin dir. Returns exit code.
 */
function execWithSwitchedNode(manager, commandArgs) {
  if (commandArgs.length === 0) return 0;
  const binDir = resolveNodeBinDir(manager);
  if (!binDir) {
    console.error(
      `Could not resolve Node ${readRequiredMajor()}.x binary directory from ${manager.kind}.`,
    );
    printInstallHints();
    return 1;
  }
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` };
  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    stdio: 'inherit',
    env,
  });
  return result.status ?? 1;
}

export {
  currentNodeMajor,
  detectManager,
  execWithSwitchedNode,
  installNode,
  printInstallHints,
  readRequiredMajor,
  resolveFnmDir,
  resolveNodeBinDir,
  run,
};

/**
 * Pure entry point. Returns:
 *   { kind: 'noop-exit', code: 0 }   - Node already on the right major; exit 0
 *   { kind: 'noop-exec',  code }     - Node matches; exec'd command, got code
 *   { kind: 'no-manager', code: 1 }  - Wrong major and no version manager found
 *   { kind: 'eval',       code: 0, script } - Emitted shell that switches PATH
 *   { kind: 'eval-installed', code: 0, script } - Same, after auto-installing
 *   { kind: 'eval-failed', code: 1, reason } - Manager found, install failed
 *   { kind: 'exec',       code }     - Re-exec'd command with switched PATH
 *
 * `deps` is an injection point for tests: it lets us stub out
 * tryExec/existsSync/spawnSync without monkey-patching node.
 */
function run({
  argv = process.argv,
  env = process.env,
  currentMajor = currentNodeMajor(),
  stdout = process.stdout,
  stderr = process.stderr,
  detect = detectManager,
  resolveBin = resolveNodeBinDir,
  doInstall = installNode,
  doExec = execWithSwitchedNode,
  required = readRequiredMajor(),
} = {}) {
  const sepIndex = argv.indexOf('--');
  const commandArgs = sepIndex === -1 ? [] : argv.slice(sepIndex + 1);

  if (currentMajor === required) {
    if (commandArgs.length === 0) {
      return { kind: 'noop-exit', code: 0 };
    }
    const result = spawnSync(commandArgs[0], commandArgs.slice(1), { stdio: 'inherit' });
    return { kind: 'noop-exec', code: result.status ?? 0 };
  }

  const manager = detect();
  if (!manager) {
    stderr.write(
      `Node ${required}.x is required (current: ${env.NODE_VERSION ?? process.version}). See .nvmrc.\n`,
    );
    printInstallHints(stderr);
    return { kind: 'no-manager', code: 1 };
  }

  if (commandArgs.length === 0) {
    const binDir = resolveBin(manager);
    if (binDir) {
      const script = renderSwitchScript(binDir, env.PATH ?? '', manager.kind, 'switched');
      stdout.write(script);
      return { kind: 'eval', code: 0, script };
    }
    stderr.write(`Detected ${manager.kind} but Node ${required}.x is not installed. Installing…\n`);
    if (!doInstall(manager)) {
      stderr.write(`Failed to install Node ${required}.x via ${manager.kind}.\n`);
      return { kind: 'eval-failed', code: 1, reason: 'install-failed' };
    }
    const installedDir = resolveBin(manager);
    if (!installedDir) {
      stderr.write(`Node ${required}.x install reported success, but bin dir is still missing.\n`);
      return { kind: 'eval-failed', code: 1, reason: 'bin-missing' };
    }
    const script = renderSwitchScript(
      installedDir,
      env.PATH ?? '',
      manager.kind,
      'installed + switched',
    );
    stdout.write(script);
    return { kind: 'eval-installed', code: 0, script };
  }

  stderr.write(
    `Detected ${manager.kind} (current node: ${env.NODE_VERSION ?? process.version}, required: ${required}.x). Switching…\n`,
  );
  if (!resolveBin(manager) && !doInstall(manager)) {
    stderr.write(`Failed to install Node ${required}.x via ${manager.kind}.\n`);
    return { kind: 'exec-failed', code: 1, reason: 'install-failed' };
  }
  return { kind: 'exec', code: doExec(manager, commandArgs) };
}

function renderSwitchScript(binDir, currentPath, kind, verb) {
  return [
    `export PATH="${binDir}:${currentPath}"`,
    `echo "node-version:ensure: ${verb} PATH to ${binDir} via ${kind}"`,
    '',
  ].join('\n');
}

function printInstallHints(stream = process.stderr) {
  stream.write('No supported Node version manager was found on PATH.\n');
  stream.write('Install one of the following, then re-run your command:\n');
  stream.write(`${INSTALL_HINTS.join('\n')}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run();
  process.exit(result.code);
}
