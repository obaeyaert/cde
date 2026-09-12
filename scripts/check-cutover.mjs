/**
 * Contrôle de la bascule DNS vers Vercel, à lancer avant, pendant et après.
 *
 *   node scripts/check-cutover.mjs
 *
 * Vérifie, sans rien modifier :
 *  - où pointent l'apex et le www, et depuis quel serveur le site répond ;
 *  - que le certificat couvre bien les deux noms ;
 *  - que l'apex redirige vers www en 301, comme le faisait WordPress ;
 *  - que les 21 pages, la 404 et un échantillon de redirections répondent correctement ;
 *  - que les MX et les TXT sont intacts (la messagerie ne doit pas bouger).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const APEX = 'cdegroupe.com';
const WWW = `www.${APEX}`;

/* IP et CNAME attendus côté Vercel (relevés via l'API des domaines). */
const VERCEL_A = new Set(['216.150.1.1', '216.150.16.1', '76.76.21.21']);
const VERCEL_CNAME = /vercel-dns/;

const ok = (b) => (b ? '[32mOK[0m   ' : '[31mKO[0m   ');
const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${ok(pass)} ${label}${detail ? ` — ${detail}` : ''}`);
};

const dig = async (name, type) => {
  const { stdout } = await run('dig', ['+short', name, type]).catch(() => ({ stdout: '' }));
  return stdout.trim().split('\n').filter(Boolean);
};

const head = async (url, { redirect = 'manual' } = {}) => {
  const res = await fetch(url, { redirect, headers: { 'User-Agent': 'cde-cutover-check' } }).catch(() => null);
  return res && { status: res.status, location: res.headers.get('location'), server: res.headers.get('server'), xVercel: res.headers.get('x-vercel-id') };
};

const cert = (host) =>
  new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10_000 }, () => {
      const c = socket.getPeerCertificate();
      socket.end();
      resolve({ subject: c.subject?.CN, alt: c.subjectaltname, issuer: c.issuer?.O, until: c.valid_to });
    });
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => { socket.destroy(); resolve(null); });
  });

console.log('\nDNS');
const apexA = await dig(APEX, 'A');
const wwwAll = [...(await dig(WWW, 'CNAME')), ...(await dig(WWW, 'A'))];
const apexOnVercel = apexA.some((v) => VERCEL_A.has(v));
const wwwOnVercel = wwwAll.some((v) => VERCEL_CNAME.test(v) || VERCEL_A.has(v));
check(`apex ${APEX}`, apexOnVercel, apexA.join(' ') || 'aucune réponse');
check(`${WWW}`, wwwOnVercel, wwwAll.join(' ') || 'aucune réponse');
if (!apexOnVercel || !wwwOnVercel) console.log('       (bascule non faite ou non propagée — le reste teste encore l\'ancien serveur)');

console.log('\nMessagerie — doit rester intacte');
const mx = await dig(APEX, 'MX');
const txt = await dig(APEX, 'TXT');
check('MX présents', mx.length > 0, mx.join(' ') || 'AUCUN — la réception de mail est cassée');
check('SPF / vérifications TXT présents', txt.length > 0, `${txt.length} enregistrement(s)`);

console.log('\nHTTPS');
const c = await cert(WWW);
check('certificat servi sur www', !!c, c ? `${c.issuer} jusqu'au ${c.until}` : 'injoignable');
check('certificat couvre apex et www', !!c?.alt?.includes(APEX) && !!c?.alt?.includes(WWW), c?.alt ?? '');

console.log('\nRedirection apex vers www');
const apexRes = await head(`https://${APEX}/`);
check('apex répond 301 vers www', apexRes?.status === 301 && (apexRes.location ?? '').includes(WWW), `${apexRes?.status} -> ${apexRes?.location ?? ''}`);

console.log('\nPages');
const urls = fs.readFileSync(path.join(ROOT, '_source/urls.txt'), 'utf8').trim().split('\n');
let pagesOk = 0;
let redirected = 0;
for (const u of urls) {
  const r = await head(`https://${WWW}${u}`);
  if (r?.status === 200) pagesOk++;
  else if (r?.status === 301) redirected++;
}
check(`${urls.length} URL du sitemap`, pagesOk + redirected === urls.length, `${pagesOk} en 200, ${redirected} en 301`);
const notFound = await head(`https://${WWW}/page-qui-nexiste-pas/`);
check('404 sur une URL inconnue', notFound?.status === 404, String(notFound?.status));

console.log('\nRedirections héritées de WordPress');
const sample = [
  ['/nos-clients/', '/nos-clients/les-antilles/'],
  ['/linge-hotel/', '/materiel-hotelier/linge-hotel/'],
  ['/index.php', '/'],
  ['/wp-content/uploads/2020/04/CDE-Groupe_linge.jpg', '/media/2020/04/CDE-Groupe_linge.jpg'],
  ['/contact', '/contact/'],
];
for (const [from, to] of sample) {
  const r = await head(`https://${WWW}${from}`);
  const target = (r?.location ?? '').replace(`https://${WWW}`, '');
  check(`301 ${from}`, r?.status === 301 && target === to, `${r?.status} -> ${target}`);
}

console.log('\nServi par');
const home = await head(`https://${WWW}/`, { redirect: 'follow' });
check('la réponse vient de Vercel', !!home?.xVercel, home?.xVercel ?? `server: ${home?.server ?? '?'}`);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} contrôles passés\n`);
process.exit(failed === 0 ? 0 : 1);
