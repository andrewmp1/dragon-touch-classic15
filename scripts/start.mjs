// Supervise just these two child servers; never stop unrelated listeners.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function runServers(entries = ['agenda/serve.js', 'board/serve.js']) {
  const children = new Set();
  let stopping = false;
  let killTimer;

  function stop(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) child.kill('SIGTERM');
    killTimer = setTimeout(() => {
      for (const child of children) child.kill('SIGKILL');
    }, 3000);
    killTimer.unref();
  }

  process.on('SIGINT', () => stop(130));
  process.on('SIGTERM', () => stop(143));

  for (const entry of entries) {
    const child = spawn(process.execPath, [entry], { cwd: root, stdio: 'inherit' });
    children.add(child);
    child.on('error', (error) => {
      console.error('Could not start ' + entry + ': ' + error.message);
      stop(1);
    });
    child.on('close', (code, signal) => {
      children.delete(child);
      if (!stopping) {
        console.error(entry + ' stopped (' + (signal || code) + '). Stopping both pages.');
        stop(code || 1);
      }
      if (children.size === 0) clearTimeout(killTimer);
    });
  }
  return stop;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) runServers();
