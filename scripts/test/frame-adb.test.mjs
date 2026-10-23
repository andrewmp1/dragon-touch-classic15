import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../frame-adb.sh', import.meta.url));

function run(args, overrides = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'frame-adb-test-'));
  const fake = path.join(dir, 'adb');
  const log = path.join(dir, 'calls');
  writeFileSync(fake, `#!/bin/sh
printf '%s\\n' "$*" >> "$TEST_ADB_LOG"
case "$*" in
  devices) printf 'List of devices attached\\ntest-device\\tdevice\\n';
    if [ "\${TEST_MULTIPLE:-}" = 1 ]; then printf 'other-device\\tdevice\\n'; fi ;;
  *'getprop ro.build.display.id') printf '%s\\n' "\${TEST_BUILD:-Classic15-Pro_A33.080124_V02}" ;;
  *'getprop ro.serialno') printf 'test-serial\\n' ;;
esac
`, { mode: 0o755 });
  try {
    const result = spawnSync('sh', [script, ...args], {
      encoding: 'utf8',
      env: { ...process.env, AGENDA_FRAME_IP: '', AGENDA_FRAME_SERIAL: '',
        ADB_BIN: fake, TEST_ADB_LOG: log, ...overrides },
    });
    let calls = '';
    try { calls = readFileSync(log, 'utf8'); } catch { /* validation can exit before ADB */ }
    return { ...result, calls };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('verifies build before sending a drawing swipe', () => {
  const result = run(['swipe', '100', '100', '300', '300']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /getprop ro.build.display.id\n.*shell input swipe 100 100 300 300 500/);
});
test('wrong build prevents input', () => {
  const result = run(['tap', '100', '100'], { TEST_BUILD: 'different-build' });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.calls, /shell input/);
});
test('multiple devices require an explicit target', () => {
  const result = run(['status'], { TEST_MULTIPLE: '1' });
  assert.equal(result.status, 1);
  assert.equal(result.calls, 'devices\n');
});
test('serial mismatch prevents input', () => {
  const result = run(['key', '224'], { AGENDA_FRAME_SERIAL: 'different-serial' });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.calls, /shell input/);
});
test('URL query remains quoted for the Android remote shell', () => {
  const result = run(['open', 'http://example.test:8788/?view=board&test=1']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /shell input keyevent 224/);
  assert.match(result.calls, /-d 'http:\/\/example.test:8788\/\?view=board&test=1'/);
});
test('rejects shell syntax and nonnumeric coordinates before contacting ADB', () => {
  for (const args of [['open', "http://example.test/';id"], ['tap', '1;id', '2']]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.equal(result.calls, '');
  }
});
test('screenshots cannot write private screen contents into the project', () => {
  const result = run(['screenshot', path.join(path.dirname(script), 'capture.png')]);
  assert.equal(result.status, 1);
  assert.equal(result.calls, '');
});
test('captures through a temporary device file for the Android 4.4 shell', () => {
  const result = run(['screenshot', path.join(tmpdir(), 'classic15-test.png')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /shell screencap -p \/data\/local\/tmp\/classic15-capture.png/);
  assert.ok(result.calls.includes('pull /data/local/tmp/classic15-capture.png ' + path.join(tmpdir(), 'classic15-test.png')));
  assert.match(result.calls, /shell rm \/data\/local\/tmp\/classic15-capture.png/);
});
