import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { addCalendar } from '../setup-calendar.mjs';

function fixture(action) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classic15-calendar-'));
  try { action(path.join(dir, 'calendars.env')); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('new calendar is written privately without changing its webcal scheme', () => fixture(file => {
  assert.equal(addCalendar(file, 'webcal://calendar.example.test/shared.ics'), 'added');
  assert.equal(fs.readFileSync(file, 'utf8'), 'webcal://calendar.example.test/shared.ics\n');
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
}));
test('adding a feed preserves settings and existing labelled feeds', () => fixture(file => {
  const before = '# settings\nTZ=UTC\nPORT=8790\nFamily|https://calendar.example.test/first.ics';
  fs.writeFileSync(file, before);
  addCalendar(file, 'webcal://calendar.example.test/second.ics');
  assert.equal(fs.readFileSync(file, 'utf8'), before + '\nwebcal://calendar.example.test/second.ics\n');
}));
test('empty input and duplicate feeds do not rewrite existing settings', () => fixture(file => {
  const before = 'Family|https://calendar.example.test/shared.ics\n';
  fs.writeFileSync(file, before);
  assert.equal(addCalendar(file, ''), 'skipped');
  assert.equal(addCalendar(file, 'webcal://calendar.example.test/shared.ics'), 'duplicate');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
}));
test('invalid and multiline input is rejected without exposing it or changing settings', () => fixture(file => {
  fs.writeFileSync(file, 'TZ=UTC\n');
  for (const link of ['private-value', 'file:///secret', 'https://user:password@example.test/',
    'https://example.test/token\nhttps://example.test/other']) {
    assert.throws(() => addCalendar(file, link), error => !error.message.includes(link));
    assert.equal(fs.readFileSync(file, 'utf8'), 'TZ=UTC\n');
  }
}));
test('invalid existing configuration is preserved', () => fixture(file => {
  fs.writeFileSync(file, 'broken-private-settings');
  assert.throws(() => addCalendar(file, 'https://example.test/feed.ics'),
    error => !error.message.includes('broken-private-settings'));
  assert.equal(fs.readFileSync(file, 'utf8'), 'broken-private-settings');
}));
