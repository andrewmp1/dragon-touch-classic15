import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfigPath, loadConfig } from './config.js';
import { loadAgenda } from './feeds.js';
import { renderAgenda } from './render.js';

const configPath = process.env.AGENDA_CONFIG || defaultConfigPath();

function readConfig() {
  try {
    return { config: loadConfig(configPath), error: '' };
  } catch (err) {
    return {
      config: { calendars: [], port: 8787, days: 7, tz: 'UTC', cacheMs: 600000 },
      error: err.message || 'The agenda settings could not be read.',
    };
  }
}

export function createAgendaServer() {
  let loaded = readConfig();
  let loadedMtime = mtimeOf(configPath);
  let state = { events: [], errors: [], fetchedAt: 0, warning: '' };
  let inflight = null;

  function configNow() {
    const mtime = mtimeOf(configPath);
    if (mtime !== loadedMtime) {
      loaded = readConfig();
      loadedMtime = mtime;
      state = { events: [], errors: [], fetchedAt: 0, warning: '' };
    }
    return loaded;
  }

  function refresh(current) {
    if (current.error || current.config.calendars.length === 0) return Promise.resolve(state);
    const fresh = state.fetchedAt && Date.now() - state.fetchedAt < current.config.cacheMs && state.errors.length === 0;
    if (fresh) return Promise.resolve(state);
    if (inflight) return inflight;
    const previous = state.events;
    // Enough days for the week and month views even when DAYS stays at 7.
    const feedDays = Math.max(current.config.days, 35);
    inflight = loadAgenda(current.config.calendars, {
      tz: current.config.tz,
      days: feedDays,
    }).then((result) => {
      const failed = result.errors.length > 0;
      const keepPrevious = failed && result.events.length === 0 && previous.length > 0;
      state = {
        events: keepPrevious ? previous : result.events,
        errors: result.errors,
        fetchedAt: Date.now(),
        warning: keepPrevious
          ? 'Showing the last agenda. A feed did not refresh.'
          : (failed ? 'A calendar feed did not load.' : ''),
      };
      console.log(failed
        ? 'A calendar feed did not load. Showing ' + state.events.length + ' events.'
        : 'Loaded ' + state.events.length + ' events.');
      return state;
    }).finally(() => {
      inflight = null;
    });
    return inflight;
  }

  return http.createServer(async (req, res) => {
    const raw = req.url || '/';
    const url = raw.split('?')[0];
    const view = /(^|[?&])view=(day|week|month)/.exec(raw)?.[2] || 'agenda';
    if (url === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('ok\n');
      return;
    }
    if (url !== '/' && url !== '/index.html') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found\n');
      return;
    }
    const current = configNow();
    const snapshot = await refresh(current);
    const html = renderAgenda({
      now: Date.now(),
      tz: current.config.tz,
      days: current.config.days,
      view,
      events: snapshot.events,
      calendars: current.config.calendars,
      warning: current.error || snapshot.warning,
      fetchedAt: snapshot.fetchedAt,
      configured: current.config.calendars.length > 0 && !current.error,
      configError: current.error,
    });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  });
}

function mtimeOf(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

export function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function main() {
  const { config, error } = readConfig();
  const server = createAgendaServer();
  server.listen(config.port, '0.0.0.0', () => {
    console.log('Agenda listening on port ' + config.port + '.');
    if (error) console.log(error);
    else if (config.calendars.length === 0) console.log('No calendar link yet. Edit agenda/calendars.env.');
    const addresses = lanAddresses();
    if (addresses.length === 0) console.log('Open http://127.0.0.1:' + config.port + '/');
    for (const address of addresses) console.log('On the frame, open http://' + address + ':' + config.port + '/');
  });
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
