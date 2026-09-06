/**
 * Test de bout en bout du formulaire de contact.
 * Démarre un SMTP factice sur 2525, poste sur l'API du serveur de dev, vérifie les mails reçus.
 * Prérequis : `astro dev --port 4321` en cours, .env pointant sur 127.0.0.1:2525.
 */
import { SMTPServer } from 'smtp-server';

const ORIGIN = 'http://localhost:4321';
const received = [];

const server = new SMTPServer({
  disabledCommands: ['STARTTLS'],
  onAuth: (auth, session, cb) => cb(null, { user: auth.username }),
  onData(stream, session, cb) {
    let raw = '';
    stream.on('data', (c) => (raw += c));
    stream.on('end', () => {
      received.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
      cb();
    });
  },
});

const post = async (fields) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  const res = await fetch(`${ORIGIN}/api/contact/`, {
    method: 'POST',
    headers: { Origin: ORIGIN },
    body,
  });
  return { status: res.status, message: (await res.json()).message };
};

const header = (raw, name) =>
  raw.split('\r\n\r\n')[0].split('\r\n').find((l) => l.toLowerCase().startsWith(name.toLowerCase() + ':')) ?? '';

const checks = [];
const expect = (label, actual, wanted) => {
  const ok = actual === wanted;
  checks.push(ok);
  console.log(`  ${ok ? 'OK  ' : 'ECHEC'} ${label}${ok ? '' : ` (obtenu: ${actual}, attendu: ${wanted})`}`);
};

await new Promise((r) => server.listen(2525, '127.0.0.1', r));
console.log('SMTP factice sur 2525\n');

console.log('Validation :');
expect('champs vides refusés', (await post({ 'your-name': '', 'your-email': '', 'your-message': '' })).status, 400);
expect('email invalide refusé', (await post({ 'your-name': 'A', 'your-email': 'nope', 'your-message': 'x' })).status, 400);

const hp = await post({ 'your-name': 'Bot', 'your-email': 'b@spam.com', 'your-message': 'x', 'company-website': 'http://spam' });
expect('honeypot: réponse 200', hp.status, 200);
expect('honeypot: aucun mail envoyé', received.length, 0);

console.log('\nEnvoi réel :');
const sent = await post({
  'your-name': 'Olivier Baeyaert',
  'your-email': 'olivier@example.com',
  'your-subject': 'Devis literie',
  'your-message': 'Bonjour, je souhaite un devis pour 40 chambres.',
});
expect('message accepté', sent.status, 200);
await new Promise((r) => setTimeout(r, 800));
expect('2 mails partis (notification + accusé)', received.length, 2);

if (received.length === 2) {
  const [notif, ack] = received;
  expect('notification -> contact@cdegroupe.com', notif.to[0], 'contact@cdegroupe.com');
  expect('accusé -> expéditeur', ack.to[0], 'olivier@example.com');
  console.log('   ', header(notif.raw, 'Subject').slice(0, 70));
  console.log('   ', header(notif.raw, 'Reply-To').slice(0, 70));
  const body = Buffer.from(notif.raw.split('\r\n\r\n').slice(1).join('\n'), 'utf8').toString();
  checks.push(/40 chambres/.test(body.replace(/=\r?\n/g, '')));
  console.log(`  ${/40 chambres/.test(body.replace(/=\r?\n/g, '')) ? 'OK  ' : 'ECHEC'} le message de l'internaute est dans le corps`);
}

console.log('\nInjection d\'en-tête :');
const inj = await post({
  'your-name': 'X\r\nBcc: pirate@evil.com',
  'your-email': 'a@b.co',
  'your-subject': 'Y\r\nBcc: pirate@evil.com',
  'your-message': 'test',
});
await new Promise((r) => setTimeout(r, 800));
const last = received.at(-1);
const hasBcc = last ? /pirate@evil\.com/.test(last.raw.split('\r\n\r\n')[0]) : false;
expect('CRLF neutralisé, aucun Bcc injecté', hasBcc, false);
expect('la requête reste acceptée', inj.status, 200);

server.close();
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} vérifications passées`);
process.exit(failed === 0 ? 0 : 1);
