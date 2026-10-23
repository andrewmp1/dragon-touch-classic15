import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('public source works in a renamed checkout with spaces and an unrelated current directory', { timeout: 30000 }, () => {
  const original = fileURLToPath(new URL('../../', import.meta.url));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'classic15 relocation '));
  const checkout = path.join(temporary, 'downloaded project');
  fs.mkdirSync(checkout);
  function copy(relative) {
    const source = path.join(original, relative);
    const destination = path.join(checkout, relative);
    if (fs.statSync(source).isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      for (const name of fs.readdirSync(source)) {
        if (name === 'node_modules' || name === 'saves' || name.startsWith('calendars.env')) continue;
        if (name === 'relocation.test.mjs') continue;
        copy(path.join(relative, name));
      }
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
  }
  try {
    for (const name of ['agenda', 'board', 'scripts']) copy(name);
    // Reuse the installed parser only as a test dependency; never copy private config or saves.
    fs.cpSync(path.join(original, 'agenda/node_modules/ical.js'),
      path.join(checkout, 'agenda/node_modules/ical.js'), { recursive: true });
    const tests = [
      ...fs.readdirSync(path.join(checkout, 'agenda/test')).filter(name => name.endsWith('.test.js'))
        .map(name => path.join(checkout, 'agenda/test', name)),
      ...fs.readdirSync(path.join(checkout, 'scripts/test')).filter(name => name.endsWith('.test.mjs'))
        .map(name => path.join(checkout, 'scripts/test', name)),
    ];
    const testEnv = { ...process.env };
    delete testEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', ...tests], {
      cwd: os.tmpdir(), encoding: 'utf8', timeout: 25000, env: testEnv,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /tests 45\b/);
    assert.ok(!fs.existsSync(path.join(checkout, 'agenda/calendars.env')));
    assert.ok(!fs.existsSync(path.join(checkout, 'board/saves')));
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
