// Find devices on the LAN with TCP 5555 open (open Wi-Fi ADB).
// Usage: node find-frame.js <subnet> <own-ip?>
// Connects to .1-.254 in parallel with a short timeout and prints every IP
// that accepts the connection, one per line. Bounded, no long scan.
import net from 'node:net';

const subnet = process.argv[2];              // first three octets of the frame's IPv4 address
const skip = new Set((process.argv[3] || '').split(' ').filter(Boolean));

const results = [];
let pending = 0;

function probe(ip) {
  return new Promise((resolve) => {
    const sock = net.connect(5555, ip, () => {
      results.push(ip);
      sock.destroy();
      resolve();
    });
    sock.on('error', () => resolve());
    sock.on('timeout', () => { sock.destroy(); resolve(); });
    sock.setTimeout(400);
  });
}

const jobs = [];
for (let i = 1; i <= 254; i++) {
  const ip = subnet + '.' + i;
  if (skip.has(ip)) continue;
  jobs.push(probe(ip));
}
await Promise.all(jobs);
for (const ip of results.sort()) console.log(ip);
process.exit(results.length ? 0 : 1);
