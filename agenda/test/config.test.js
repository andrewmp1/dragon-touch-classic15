import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../config.js';
import { loadAgenda, normalizeUrl, windowFor } from '../feeds.js';
import { readFileSync } from 'node:fs';

test('config reads labels, webcal links, and limits', () => {
  const cfg = parseConfig(`
# comment
PORT=8790
DAYS=3
TZ=America/Chicago
CACHE_MINUTES=5
Family|webcal://calendar.example/family.ics
https://calendar.example/other.ics
`, 'UTC');
  assert.equal(cfg.port, 8790);
  assert.equal(cfg.days, 3);
  assert.equal(cfg.tz, 'America/Chicago');
  assert.equal(cfg.cacheMs, 300000);
  assert.deepEqual(cfg.calendars, [
    { name: 'Family', url: 'webcal://calendar.example/family.ics' },
    { name: '', url: 'https://calendar.example/other.ics' },
  ]);
});

test('a bad line is rejected without echoing it', () => {
  assert.throws(
    () => parseConfig('not a url and not a setting\n', 'UTC'),
    (err) => !String(err.message).includes('not a url'),
  );
});

test('webcal is fetched as https', () => {
  assert.equal(normalizeUrl('webcal://calendar.example/a.ics'), 'https://calendar.example/a.ics');
});

test('the window starts at local midnight', () => {
  const now = Date.parse('2026-10-22T18:00:00Z');
  const { from, to } = windowFor(now, 'America/Chicago', 7);
  assert.equal(new Date(from).toISOString(), '2026-10-21T05:00:00.000Z');
  assert.equal(new Date(to).toISOString(), '2026-10-29T05:00:00.000Z');
});

test('loadAgenda expands a feed and hides the address when the fetch fails', async () => {
  const text = readFileSync(new URL('./fixtures/google.ics', import.meta.url), 'utf8');
  const secret = 'https://calendar.example/secret-token-abc.ics';
  const loaded = await loadAgenda([{ name: 'Family', url: secret }], {
    now: Date.parse('2026-10-12T12:00:00Z'),
    tz: 'America/Chicago',
    days: 14,
    fetchImpl: async (url) => {
      assert.equal(url, secret);
      return {
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(text).buffer,
      };
    },
  });
  assert.deepEqual(loaded.errors, []);
  assert.ok(loaded.events.some((ev) => ev.title === 'Vitamins'));

  const failed = await loadAgenda([{ name: '', url: secret }], {
    now: Date.parse('2026-10-12T12:00:00Z'),
    tz: 'UTC',
    days: 7,
    fetchImpl: async () => {
      throw new Error('connect failed ' + secret);
    },
  });
  assert.deepEqual(failed.events, []);
  assert.equal(failed.errors.length, 1);
  assert.equal(failed.errors[0], 'The calendar feed did not load.');
  assert.ok(!failed.errors[0].includes('secret-token'));
});
