import { expand, merge } from './expand.js';

const MAX_BYTES = 5 * 1024 * 1024;

export function normalizeUrl(url) {
  if (/^webcals?:\/\//i.test(url)) return 'https://' + url.replace(/^webcals?:\/\//i, '');
  return url;
}

function publicError(err) {
  const msg = String(err && err.message || '');
  if (msg.startsWith('The calendar')) return msg;
  return 'The calendar feed did not load.';
}

export async function fetchFeed(url, fetchImpl = globalThis.fetch) {
  const target = normalizeUrl(url);
  if (!/^https?:\/\//i.test(target)) {
    throw new Error('The calendar link must be an http, https, or webcal address.');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetchImpl(target, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'classic15-agenda' },
    });
    if (!res.ok) throw new Error('The calendar feed refused the request (' + res.status + ').');
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new Error('The calendar feed is larger than this page will download.');
    return new TextDecoder('utf-8').decode(buf);
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('The calendar feed took too long.');
    throw publicError(err) === err.message ? err : new Error(publicError(err));
  } finally {
    clearTimeout(timer);
  }
}

// from is the start of yesterday in the display timezone, so an event that
// began last night and is still going can appear on today. to is exclusive.
export function windowFor(now, tz, days) {
  const start = startOfZonedDay(now, tz);
  return { from: start - 864e5, to: start + days * 864e5 };
}

export async function loadAgenda(calendars, { now = Date.now(), tz, days, fetchImpl } = {}) {
  const { from, to } = windowFor(now, tz, days);
  const lists = [];
  const errors = [];
  for (let i = 0; i < calendars.length; i++) {
    try {
      const text = await fetchFeed(calendars[i].url, fetchImpl);
      lists.push(expand(text, i, from, to, tz));
    } catch (err) {
      errors.push(publicError(err));
    }
  }
  return { events: merge(lists), errors };
}

function startOfZonedDay(ms, tz) {
  const parts = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(ms))) {
    if (type !== 'literal') parts[type] = Number(value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const offsetAt = (instant) => {
    const p = {};
    for (const { type, value } of fmt.formatToParts(new Date(instant))) {
      if (type !== 'literal') p[type] = Number(value);
    }
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
  };
  const first = wall - offsetAt(wall);
  return wall - offsetAt(first);
}
