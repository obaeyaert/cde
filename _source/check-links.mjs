/**
 * Vérifie que chaque lien interne du site généré aboutit : soit une page construite,
 * soit une redirection déclarée dans vercel.json. Contrôle aussi les fichiers référencés.
 */
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const DIST = '.vercel/output/static';
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

// Les chemins sont encodes dans le HTML ; le disque porte les accents litteraux.
const onDisk = (url) => {
  const rel = decodeURIComponent(url).replace(/^\//, '');
  return fs.existsSync(path.join(DIST, rel));
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

const pages = new Set(
  walk(DIST)
    .filter((f) => f.endsWith('index.html'))
    .map((f) => '/' + path.relative(DIST, path.dirname(f)).split(path.sep).join('/') + '/')
    .map((u) => (u === '//' ? '/' : u)),
);

const redirects = new Set(vercel.redirects.map((r) => r.source));
const redirectTargets = new Map(vercel.redirects.map((r) => [r.source, r.destination]));

const broken = [];
const danglingRedirects = [];

for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const from = '/' + path.relative(DIST, file).split(path.sep).join('/');
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (!href.startsWith('/') || href.startsWith('//')) return;
    const clean = href.split('#')[0].split('?')[0];
    if (clean === '') return;

    if (pages.has(clean) || redirects.has(clean)) return;
    // fichier statique (média, police, robots…)
    if (onDisk(clean)) return;
    broken.push({ from, href });
  });

  // toutes les ressources référencées doivent exister sur le disque
  $('img[src], source[srcset], link[href], script[src]').each((_, el) => {
    const raw = $(el).attr('src') ?? $(el).attr('srcset') ?? $(el).attr('href') ?? '';
    const url = raw.split(',')[0].trim().split(' ')[0];
    if (!url.startsWith('/media/') && !url.startsWith('/fonts/')) return;
    if (!onDisk(url)) broken.push({ from, href: url });
  });
}

// une redirection doit pointer vers une page qui existe
for (const [source, destination] of redirectTargets) {
  if (destination.startsWith('http')) continue;
  if (!pages.has(destination) && !redirects.has(destination)) {
    danglingRedirects.push(`${source} -> ${destination}`);
  }
}

console.log('pages générées      :', pages.size);
console.log('redirections        :', redirects.size);
console.log('liens/ressources KO :', broken.length);
for (const b of broken.slice(0, 20)) console.log(`  ! ${b.from} -> ${b.href}`);
console.log('redirections mortes :', danglingRedirects.length);
for (const d of danglingRedirects) console.log(`  ! ${d}`);

process.exit(broken.length === 0 && danglingRedirects.length === 0 ? 0 : 1);
