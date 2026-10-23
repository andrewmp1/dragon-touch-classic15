import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const installer = fileURLToPath(new URL('../install-host.sh', import.meta.url));
const agenda = fileURLToPath(new URL('../../agenda/', import.meta.url)).replace(/\/$/, '');

function install({ oldNode = false, missing = [], npmFails = false } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'classic15-install-'));
  const bin = path.join(dir, 'bin');
  mkdirSync(bin);
  // Isolate command discovery from tools installed on the machine running tests.
  for (const command of ['dirname', 'readlink', 'cp', 'touch']) {
    const found = spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'sh', command], { encoding: 'utf8' });
    assert.equal(found.status, 0);
    symlinkSync(found.stdout.trim(), path.join(bin, command));
  }
  const scripts = {
    node: `#!/bin/sh
echo "node $*" >> "$SETUP_LOG"
if [ "$1" = --version ]; then echo v24.0.0; exit 0; fi
[ "\${SETUP_OLD_NODE:-}" != 1 ] || [ -f "$SETUP_PREFIX/upgraded" ]
`,
    npm: `#!/bin/sh
echo "npm $* cwd=$PWD" >> "$SETUP_LOG"
[ "\${SETUP_NPM_FAILS:-}" != 1 ]
`,
    adb: '#!/bin/sh\necho "adb $*" >> "$SETUP_LOG"\n',
  };
  for (const [name, script] of Object.entries(scripts)) {
    writeFileSync(path.join(dir, name + '.template'), script, { mode: 0o755 });
    if (!missing.includes(name)) writeFileSync(path.join(bin, name), script, { mode: 0o755 });
  }
  writeFileSync(path.join(bin, 'brew'), `#!/bin/sh
echo "brew $*" >> "$SETUP_LOG"
case "$1" in
  --prefix) echo "$SETUP_PREFIX" ;;
  list) [ "\${SETUP_OLD_NODE:-}" = 1 ] ;;
  install|upgrade)
    case "$2" in
      node) cp "$SETUP_PREFIX/node.template" "$SETUP_PREFIX/bin/node"
        cp "$SETUP_PREFIX/npm.template" "$SETUP_PREFIX/bin/npm"
        touch "$SETUP_PREFIX/upgraded" ;;
      android-platform-tools) cp "$SETUP_PREFIX/adb.template" "$SETUP_PREFIX/bin/adb" ;;
      *) echo 'Unexpected installation' >&2; exit 1 ;;
    esac ;;
esac
`, { mode: 0o755 });
  const log = path.join(dir, 'calls');
  try {
    const result = spawnSync('/bin/sh', [installer], {
      cwd: tmpdir(), encoding: 'utf8',
      env: { ...process.env, PATH: bin, SETUP_LOG: log,
        SETUP_PREFIX: dir, SETUP_OLD_NODE: oldNode ? '1' : '', SETUP_NPM_FAILS: npmFails ? '1' : '' },
    });
    return { ...result, calls: existsSync(log) ? readFileSync(log, 'utf8') : '' };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('installer accepts existing tools and installs agenda packages from any directory', () => {
  const result = install();
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.calls, /brew (install|upgrade)/);
  assert.ok(result.calls.includes('npm ci --ignore-scripts cwd=' + agenda));
  assert.doesNotMatch(result.calls, /java|sdkmanager|kitchen-frame/);
});
test('installer upgrades an existing old Homebrew Node', () => {
  const result = install({ oldNode: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /brew upgrade node/);
});
test('installer provisions missing Node, npm, and ADB without kiosk tools', () => {
  const result = install({ missing: ['node', 'npm', 'adb'] });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /brew install node/);
  assert.match(result.calls, /brew install android-platform-tools/);
  assert.doesNotMatch(result.calls, /temurin|commandlinetools|sdkmanager|git/);
});
test('dependency installation failure is not reported as success', () => {
  const result = install({ npmFails: true });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /Host runtime is ready/);
});
