import { SMTPServer } from 'smtp-server';
import fs from 'node:fs';

const received = [];
const server = new SMTPServer({
  disabledCommands: ['STARTTLS'],
  onAuth(auth, session, callback) {
    callback(null, { user: auth.username });
  },
  onData(stream, session, callback) {
    let raw = '';
    stream.on('data', (c) => (raw += c));
    stream.on('end', () => {
      received.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
      fs.writeFileSync('_source/smtp-received.json', JSON.stringify(received, null, 2));
      callback();
    });
  },
});

server.listen(2525, '127.0.0.1', () => console.log('fake smtp on 2525'));
