import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

async function waitFor(check) {
  const end = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > end) throw new Error('Timed out waiting for launcher state');
    await delay(20);
  }
}

async function fixture(fail, action) {
  const dir = mkdtempSync(path.join(tmpdir(), 'classic15-start-'));
  for (const name of ['scripts', 'agenda', 'board']) mkdirSync(path.join(dir, name));
  copyFileSync(new URL('../start.mjs', import.meta.url), path.join(dir, 'scripts/start.mjs'));
  for (const name of ['agenda', 'board']) {
    writeFileSync(path.join(dir, name, 'serve.js'), `
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(path.join(dir, name + '.ready'))}, String(process.pid));
process.on('SIGTERM', () => {
  fs.writeFileSync(${JSON.stringify(path.join(dir, name + '.stopped'))}, 'stopped');
  process.exit(0);
});
${fail && name === 'board' ? 'setTimeout(() => process.exit(7), 300);' : ''}
setInterval(() => {}, 1000);
`);
  }
  const parent = spawn(process.execPath, [path.join(dir, 'scripts/start.mjs')], {
    cwd: tmpdir(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  parent.stderr.on('data', data => { stderr += data; });
  const exited = once(parent, 'close');
  try {
    await waitFor(() => existsSync(path.join(dir, 'agenda.ready')) && existsSync(path.join(dir, 'board.ready')));
    await action({ dir, parent, exited, stderr: () => stderr });
  } finally {
    if (parent.exitCode === null) parent.kill('SIGTERM');
    await exited;
    for (const name of ['agenda', 'board']) {
      const ready = path.join(dir, name + '.ready');
      if (existsSync(ready)) {
        const pid = Number(readFileSync(ready, 'utf8'));
        try { process.kill(pid, 'SIGKILL'); } catch { /* already stopped */ }
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test('launcher starts both from another directory and forwards shutdown', { timeout: 10000 }, async () => {
  await fixture(false, async ({ dir, parent, exited }) => {
    parent.kill('SIGINT');
    const [code] = await exited;
    assert.equal(code, 130);
    assert.ok(existsSync(path.join(dir, 'agenda.stopped')));
    assert.ok(existsSync(path.join(dir, 'board.stopped')));
  });
});
test('a child failure stops its companion and preserves the failure code', { timeout: 10000 }, async () => {
  await fixture(true, async ({ dir, exited, stderr }) => {
    const [code] = await exited;
    assert.equal(code, 7);
    assert.ok(existsSync(path.join(dir, 'agenda.stopped')));
    assert.match(stderr(), /board\/serve.js stopped \(7\)/);
  });
});
