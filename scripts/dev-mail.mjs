/**
 * Boîte aux lettres de développement : un SMTP local qui n'envoie rien et affiche
 * dans le terminal tout ce qu'il reçoit.
 *
 *   npm run dev:mail
 *   puis, dans .env :  SMTP_HOST=127.0.0.1  SMTP_PORT=2525
 *                      SMTP_USER et SMTP_PASS peuvent contenir n'importe quoi.
 *
 * Sans SMTP configuré du tout, l'endpoint affiche déjà les mails dans les logs du
 * serveur de dev. Ce serveur-ci est utile pour tester le vrai chemin réseau (nodemailer,
 * authentification, encodage) sans écrire à personne.
 */
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

const PORT = Number(process.env.MAIL_PORT ?? 2525);
let count = 0;

const server = new SMTPServer({
  disabledCommands: ['STARTTLS'],
  onAuth: (auth, session, callback) => callback(null, { user: auth.username }),
  onData(stream, session, callback) {
    let raw = '';
    stream.on('data', (chunk) => (raw += chunk));
    stream.on('end', async () => {
      count += 1;
      try {
        const mail = await simpleParser(raw);
        console.log(`\n┌─ mail #${count} — ${new Date().toLocaleTimeString('fr-FR')}`);
        console.log(`│  De      : ${mail.from?.text ?? '?'}`);
        console.log(`│  À       : ${mail.to?.text ?? '?'}`);
        if (mail.replyTo?.text) console.log(`│  Reply-To: ${mail.replyTo.text}`);
        console.log(`│  Objet   : ${mail.subject ?? '?'}`);
        console.log('│');
        for (const line of (mail.text ?? '').trimEnd().split('\n')) console.log(`│  ${line}`);
        console.log('└─');
      } catch {
        console.log(`\n┌─ mail #${count} (illisible, brut)\n${raw}\n└─`);
      }
      callback();
    });
  },
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est déjà pris. Un autre dev:mail tourne peut-être déjà.`);
    process.exit(1);
  }
  console.error(error);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Boîte de développement à l'écoute sur 127.0.0.1:${PORT}`);
  console.log('Aucun mail ne quitte cette machine. Ctrl+C pour arrêter.\n');
});
