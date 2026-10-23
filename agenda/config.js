import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function defaultConfigPath() {
  return path.join(here, 'calendars.env');
}

function numberIn(value, min, max, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(name + ' must be a whole number from ' + min + ' to ' + max + '.');
  }
  return n;
}

function systemTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// calendars.env holds the private feed addresses. Lines starting with # are comments.
// A feed line is a URL, or "Label|URL". PORT, DAYS, TZ, and CACHE_MINUTES are optional.
export function parseConfig(text, fallbackTz = systemTz()) {
  const calendars = [];
  let port = 8787;
  let days = 7;
  let tz = fallbackTz;
  let cacheMinutes = 10;

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    const key = (eq === -1 ? '' : line.slice(0, eq)).trim().toUpperCase();
    if (key === 'PORT' || key === 'DAYS' || key === 'TZ' || key === 'CACHE_MINUTES') {
      const value = line.slice(eq + 1).trim();
      if (key === 'PORT') port = numberIn(value, 1, 65535, 'PORT');
      else if (key === 'DAYS') days = numberIn(value, 1, 14, 'DAYS');
      else if (key === 'CACHE_MINUTES') cacheMinutes = numberIn(value, 1, 1440, 'CACHE_MINUTES');
      else if (value) tz = value;
      continue;
    }

    let name = '';
    let url = line;
    const pipe = line.indexOf('|');
    if (pipe !== -1 && !/^https?:\/\//i.test(line) && !/^webcals?:\/\//i.test(line)) {
      name = line.slice(0, pipe).trim();
      url = line.slice(pipe + 1).trim();
    }
    if (!/^(https?|webcals?):\/\//i.test(url)) {
      throw new Error('A calendars.env line is not a calendar link or a known setting.');
    }
    calendars.push({ name, url });
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0);
  } catch {
    throw new Error('TZ is not a timezone name this computer recognizes.');
  }

  return { calendars, port, days, tz, cacheMs: cacheMinutes * 60 * 1000 };
}

export function loadConfig(file = process.env.AGENDA_CONFIG || defaultConfigPath()) {
  if (!file || !fs.existsSync(file)) return parseConfig('');
  return parseConfig(fs.readFileSync(file, 'utf8'));
}
