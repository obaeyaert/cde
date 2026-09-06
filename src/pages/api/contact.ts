import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { site } from '../../data/site';

/* Endpoint dynamique : Vercel Function en runtime Node (le SMTP a besoin d'un socket TCP,
   ce que le runtime Edge ne permet pas). */
export const prerender = false;

const MAX = { name: 120, email: 180, subject: 180, message: 5000 } as const;

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

/* Anti-header-injection : un CRLF dans un champ réinjecté en en-tête permettrait
   d'ajouter des destinataires. */
const oneLine = (value: string, max: number) =>
  value.replace(/[\r\n]+/g, ' ').trim().slice(0, max);

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

/* Limitation de débit en mémoire. Volontairement simple : sur du serverless, chaque instance
   a son propre compteur — c'est un garde-fou contre les rafales, pas une protection forte.
   La vraie barrière anti-robot est Turnstile. */
const hits = new Map<string, number[]>();
const RATE = { windowMs: 10 * 60_000, max: 5 } as const;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE.max;
}

async function turnstileOk(token: string | null, ip: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // non configuré : on ne bloque pas
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';

  if (rateLimited(ip)) {
    return json(429, 'Trop de tentatives. Merci de réessayer dans quelques minutes.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, 'Requête invalide.');
  }

  // Piège à robots : rempli => on renvoie un succès sans rien envoyer.
  if (String(form.get('company-website') ?? '').trim() !== '') {
    return json(200, 'Merci pour votre message. Il a été envoyé.');
  }

  if (!(await turnstileOk(form.get('cf-turnstile-response') as string | null, ip))) {
    return json(400, 'La vérification anti-robot a échoué. Merci de réessayer.');
  }

  const name = oneLine(String(form.get('your-name') ?? ''), MAX.name);
  const email = oneLine(String(form.get('your-email') ?? ''), MAX.email);
  const subject = oneLine(String(form.get('your-subject') ?? ''), MAX.subject);
  const message = String(form.get('your-message') ?? '').trim().slice(0, MAX.message);

  if (!name || !email || !message) {
    return json(400, 'Un ou plusieurs champs contiennent une erreur. Veuillez vérifier et essayer à nouveau.');
  }
  if (!isEmail(email)) {
    return json(400, 'L’adresse e-mail n’est pas valide.');
  }

  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;

  // En développement sans identifiants, on écrit les mails dans la console plutôt que
  // d'échouer : on peut travailler sur le formulaire sans compte SMTP sous la main.
  // En production, l'absence d'identifiants reste une erreur.
  const useConsole = !user || !pass;
  if (useConsole && !import.meta.env.DEV) {
    console.error('[contact] SMTP_USER / SMTP_PASS absents de l’environnement');
    return json(500, 'Une erreur s’est produite lors de l’envoi de votre message. Veuillez essayer à nouveau plus tard.');
  }

  const port = Number(import.meta.env.SMTP_PORT ?? 465);
  const transporter = useConsole
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: import.meta.env.SMTP_HOST ?? 'ssl0.ovh.net',
        port,
        secure: port === 465, // SSL implicite sur le 465, STARTTLS sinon
        auth: { user: user!, pass: pass! },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });

  /** Envoie, ou affiche le mail en clair quand aucun SMTP n'est configuré. */
  const deliver = async (label: string, mail: Mail.Options) => {
    const info = await transporter.sendMail(mail);
    if (!useConsole) return;
    console.info(
      [
        '',
        `┌─ ${label}`,
        `│  De      : ${mail.from}`,
        `│  À       : ${mail.to}`,
        mail.replyTo ? `│  Reply-To: ${mail.replyTo}` : null,
        `│  Objet   : ${mail.subject}`,
        '│',
        ...String(mail.text ?? '').split('\n').map((l) => `│  ${l}`),
        '└─',
      ].filter(Boolean).join('\n'),
    );
    return info;
  };

  if (useConsole) {
    console.warn(
      '[contact] SMTP non configuré : les mails sont affichés ici et ne partent nulle part.\n' +
        '          Renseigner SMTP_USER / SMTP_PASS dans .env pour un envoi réel,\n' +
        '          ou lancer `npm run dev:mail` puis pointer SMTP_HOST=127.0.0.1 SMTP_PORT=2525.',
    );
  }

  const displaySubject = subject || 'Message depuis le site';
  const signature = `Cet e-mail a été envoyé via le formulaire de contact de CDE (${site.url})`;

  try {
    // 1. Notification interne — reprend le gabarit de Contact Form 7
    await deliver('notification interne', {
      from: `"CDE" <${site.email}>`,
      to: site.email,
      replyTo: `"${name}" <${email}>`,
      subject: `CDE "${displaySubject}"`,
      text: `De : ${name} <${email}>\nObjet : ${displaySubject}\n\nCorps du message :\n${message}\n\n-- \n${signature}`,
      html:
        `<p>De : ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br>Objet : ${escapeHtml(displaySubject)}</p>` +
        `<p>Corps du message :<br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` +
        `<hr><p>${escapeHtml(signature)}</p>`,
    });

    // 2. Accusé de réception à l'expéditeur. Un échec ici ne doit pas faire échouer la demande :
    //    le message est déjà arrivé chez CDE.
    try {
      await deliver('accusé de réception', {
        from: `"CDE" <${site.email}>`,
        to: email,
        subject: `CDE "${displaySubject}"`,
        text: `Corps du message :\n${message}\n\n-- \n${signature}`,
        html:
          `<p>Corps du message :<br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` +
          `<hr><p>${escapeHtml(signature)}</p>`,
      });
    } catch (error) {
      console.warn('[contact] accusé de réception non envoyé :', error);
    }

    return json(200, 'Merci pour votre message. Il a été envoyé.');
  } catch (error) {
    console.error('[contact] échec SMTP :', error);
    return json(502, 'Une erreur s’est produite lors de l’envoi de votre message. Veuillez essayer à nouveau plus tard.');
  }
};

export const GET: APIRoute = () => json(405, 'Méthode non autorisée.');
