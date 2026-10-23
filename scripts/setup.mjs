import os from 'node:os';
import net from 'node:net';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { loadConfig } from '../agenda/config.js';
import { runServers } from './start.mjs';

const BUILD = 'Classic15-Pro_A33.080124_V02';

export function adbCommand(args) {
  try {
    return execFileSync(process.env.ADB_BIN || 'adb', args, {
      encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error('ADB command failed. Check the connection, root access, and host permissions.');
  }
}

export function frameTarget(adb = adbCommand, env = process.env) {
  let target;
  if (env.AGENDA_FRAME_IP) {
    if (!net.isIPv4(env.AGENDA_FRAME_IP)) throw new Error('AGENDA_FRAME_IP must be an IPv4 address.');
    target = env.AGENDA_FRAME_IP + ':5555';
    adb(['connect', target]);
  } else {
    const devices = adb(['devices']).split(/\r?\n/).map(line => line.trim().split(/\s+/))
      .filter(fields => fields[1] === 'device');
    if (devices.length !== 1) throw new Error('Connect one frame, or set AGENDA_FRAME_IP to select it.');
    target = devices[0][0];
  }
  if (adb(['-s', target, 'shell', 'getprop', 'ro.build.display.id']) !== BUILD) {
    throw new Error('Frame build did not match; no device settings changed.');
  }
  if (env.AGENDA_FRAME_SERIAL &&
      adb(['-s', target, 'shell', 'getprop', 'ro.serialno']) !== env.AGENDA_FRAME_SERIAL) {
    throw new Error('Frame serial did not match; no device settings changed.');
  }
  return target;
}

export function configureFrame(target, agendaUrl, boardUrl, adb = adbCommand) {
  // Validate before changing device settings; quote the URLs for Android's shell.
  for (const value of [agendaUrl, boardUrl]) {
    if (!/^http:\/\/[a-zA-Z0-9.:-]+\/$/.test(value)) throw new Error('Use a plain HTTP host URL without a path or query.');
  }
  const shell = (...args) => adb(['-s', target, 'shell', ...args]);
  if (shell('getprop', 'ro.build.display.id') !== BUILD) throw new Error('Frame build changed; setup stopped.');
  shell('pm', 'disable', 'com.waophoto.smartframe');
  if (!shell('pm', 'list', 'packages', '-d').split(/\r?\n/).includes('package:com.waophoto.smartframe')) {
    throw new Error('The photo app did not become disabled; setup stopped.');
  }
  shell('am', 'force-stop', 'com.waophoto.smartframe');
  // Values read from the working frame on 2026-10-22, not inferred from screenshots.
  shell('settings', 'put', 'system', 'accelerometer_rotation', '0');
  shell('settings', 'put', 'system', 'user_rotation', '1');
  if (shell('settings', 'get', 'system', 'accelerometer_rotation') !== '0' ||
      shell('settings', 'get', 'system', 'user_rotation') !== '1') {
    throw new Error('Orientation settings did not persist; setup stopped.');
  }
  shell('input', 'keyevent', '224');
  // Stable application IDs let the stock browser reuse each setup-owned tab.
  for (const [name, url] of [['whiteboard', boardUrl], ['agenda', agendaUrl]]) {
    shell('am', 'start', '-a', 'android.intent.action.VIEW', '-n', 'com.android.browser/.BrowserActivity',
      '--es', 'com.android.browser.application_id', 'classic15.' + name, '-d', "'" + url + "'");
  }
}

async function pageState(url, title) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    return response.ok && text.includes('<title>' + title + '</title>') ? 'ready' : 'occupied';
  } catch (error) {
    return error.cause?.code === 'ECONNREFUSED' ? 'missing' : 'unreachable';
  }
}

async function main() {
  let stopServers;
  try {
    const target = frameTarget();
    const config = loadConfig();
    const boardPort = Number(process.env.BOARD_PORT || 8788);
    if (!Number.isInteger(boardPort) || boardPort < 1 || boardPort > 65535) throw new Error('BOARD_PORT must be a valid port.');
    if (boardPort === config.port) throw new Error('Agenda and Whiteboard must use different ports.');
    const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
      (list || []).filter(item => item.family === 'IPv4' && !item.internal)
        .map(item => ({ name, address: item.address })));
    const host = process.env.FRAME_HOST_IP || addresses.find(item => !/^(bridge|docker|vbox|vmnet)/.test(item.name))?.address;
    if (!host || !net.isIPv4(host) || host.startsWith('127.')) throw new Error('Set FRAME_HOST_IP to this computer\'s IPv4 LAN address.');
    const pages = [
      { entry: 'agenda/serve.js', title: 'Agenda', url: 'http://' + host + ':' + config.port + '/' },
      { entry: 'board/serve.js', title: 'Whiteboard', url: 'http://' + host + ':' + boardPort + '/' },
    ];
    const missing = [];
    for (const page of pages) {
      const state = await pageState(page.url, page.title);
      if (state === 'ready') continue;
      if (state !== 'missing') throw new Error(page.title + ' is unreachable or its port serves another app; no frame settings changed.');
      missing.push(page.entry);
    }
    if (missing.length) stopServers = runServers(missing);
    for (const page of pages) {
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        if (process.exitCode) throw new Error('A server stopped during setup.');
        if (await pageState(page.url, page.title) === 'ready') { ready = true; break; }
        await delay(500);
      }
      if (!ready) throw new Error(page.title + ' did not become ready; no frame settings changed.');
    }
    configureFrame(target, pages[0].url, pages[1].url);
    console.log('Frame configured: photo app disabled, rotation locked, Agenda and Whiteboard opened.');
    console.log(missing.length ? 'Leave this terminal open. Ctrl+C stops only the servers started here.' :
      'Reused existing servers; they remain running independently.');
  } catch (error) {
    console.error(error.message);
    if (stopServers) stopServers(1);
    else process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
