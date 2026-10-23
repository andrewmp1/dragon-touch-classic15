import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { parseConfig, defaultConfigPath } from '../agenda/config.js';

// Keep URLs out of command arguments, terminal echo, and error messages.
export function addCalendar(file, input) {
  const link = String(input).trim();
  if (!link) return 'skipped';
  let url;
  try { url = new URL(link); } catch { throw new Error('Paste a complete calendar feed URL.'); }
  if (!['https:', 'http:', 'webcal:', 'webcals:'].includes(url.protocol) ||
      !url.hostname || url.username || url.password || /[\s|]/.test(link)) {
    throw new Error('Use an http(s) or webcal calendar feed URL on a single line.');
  }
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const config = parseConfig(previous);
  const normalize = value => value.replace(/^webcals?:/i, 'https:');
  if (config.calendars.some(calendar => normalize(calendar.url) === normalize(link))) return 'duplicate';
  const content = previous + (previous && !previous.endsWith('\n') ? '\n' : '') + link + '\n';
  const temporary = file + '.tmp';
  try {
    fs.writeFileSync(temporary, content, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
  } catch {
    // Do not echo paths or filesystem errors that might contain user input.
    throw new Error('Could not save calendar settings. Check file permissions and any leftover .tmp file.');
  }
  return 'added';
}

export async function promptCalendar() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log('Calendar prompt skipped: run node scripts/setup-calendar.mjs in a terminal to add a feed.');
    return;
  }
  console.log('iCloud: Calendar > Calendars > info beside your calendar > Public Calendar > Share Link > Copy.');
  console.log('Anyone with that link can read the calendar. Paste it below; it will be hidden.');
  const hiddenOutput = new Writable({ write(chunk, encoding, done) { done(); } });
  const rl = readline.createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
  process.stdout.write('Calendar feed URL (Enter skips; existing feeds are kept): ');
  const answer = await new Promise(resolve => {
    rl.question('', value => resolve(value));
    rl.once('close', () => resolve(null));
    rl.once('SIGINT', () => { process.exitCode = 130; rl.close(); });
  });
  rl.close();
  process.stdout.write('\n');
  if (answer === null) return;
  try {
    const result = addCalendar(process.env.AGENDA_CONFIG || defaultConfigPath(), answer);
    console.log(result === 'added' ? 'Calendar saved locally.' :
      result === 'duplicate' ? 'That calendar is already configured.' : 'Existing calendar settings kept.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await promptCalendar();
