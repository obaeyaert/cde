/**
 * Audit SEO du site généré. Ne juge que ce qui est vérifiable mécaniquement :
 * unicité et longueur des métadonnées, structure des titres, images, données
 * structurées, maillage interne.
 */
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const DIST = '.vercel/output/static';
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

const pages = walk(DIST)
  .filter((f) => f.endsWith('index.html'))
  .map((f) => ({ url: '/' + path.relative(DIST, path.dirname(f)).split(path.sep).join('/') + '/', file: f }))
  .map((p) => ({ ...p, url: p.url === '//' ? '/' : p.url }))
  .sort((a, b) => a.url.localeCompare(b.url));

const issues = [];
const add = (url, level, what) => issues.push({ url, level, what });

const titles = new Map();
const descriptions = new Map();
const inboundLinks = new Map(pages.map((p) => [p.url, 0]));

for (const { url, file } of pages) {
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));

  const title = $('title').text().trim();
  const desc = ($('meta[name=description]').attr('content') ?? '').trim();
  const canonical = $('link[rel=canonical]').attr('href') ?? '';

  if (!title) add(url, 'ERREUR', 'title absent');
  else {
    if (title.length > 60) add(url, 'avert', `title de ${title.length} caractères (>60, tronqué dans les SERP)`);
    if (title.length < 25) add(url, 'avert', `title de ${title.length} caractères (court)`);
    titles.set(title, [...(titles.get(title) ?? []), url]);
  }

  if (!desc) add(url, 'ERREUR', 'meta description absente');
  else {
    if (desc.length > 160) add(url, 'avert', `description de ${desc.length} caractères (>160)`);
    if (desc.length < 70) add(url, 'avert', `description de ${desc.length} caractères (courte)`);
    descriptions.set(desc, [...(descriptions.get(desc) ?? []), url]);
  }

  if (!canonical) add(url, 'ERREUR', 'canonical absent');

  // Structure des titres
  const h1 = $('main h1');
  if (h1.length === 0) add(url, 'ERREUR', 'aucun H1');
  if (h1.length > 1) add(url, 'ERREUR', `${h1.length} H1`);

  const levels = $('main h1, main h2, main h3, main h4, main h5, main h6')
    .map((_, e) => Number(e.tagName[1]))
    .get();
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      add(url, 'avert', `saut de niveau H${levels[i - 1]} → H${levels[i]}`);
      break;
    }
  }

  // Images
  $('main img').each((_, e) => {
    const alt = $(e).attr('alt');
    const src = $(e).attr('src') ?? '';
    if (alt === undefined) add(url, 'ERREUR', `img sans attribut alt : ${src.split('/').pop()}`);
    else if (alt.trim() === '') {
      // alt vide = décoratif, légitime pour le bandeau
    } else if (/^(cde-|dsc|img_|photo|image|logo-)/i.test(alt) || /\.(jpe?g|png|webp)$/i.test(alt) || alt.split('-').length > 4) {
      add(url, 'avert', `alt peu descriptif : "${alt.slice(0, 60)}"`);
    }
    if (!$(e).attr('width') || !$(e).attr('height')) {
      add(url, 'avert', `img sans dimensions : ${src.split('/').pop()}`);
    }
  });

  // Open Graph / Twitter
  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:locale']) {
    if (!$(`meta[property="${prop}"]`).attr('content')) add(url, 'avert', `${prop} absent`);
  }
  if (!$('meta[name="twitter:card"]').attr('content')) add(url, 'avert', 'twitter:card absent');

  // Données structurées
  const ld = $('script[type="application/ld+json"]');
  if (ld.length === 0) add(url, 'avert', 'aucun JSON-LD');
  else {
    try {
      const graph = JSON.parse(ld.first().text())['@graph'] ?? [];
      const types = graph.map((n) => n['@type']);
      if (url !== '/' && !types.includes('BreadcrumbList')) add(url, 'avert', 'BreadcrumbList absent');
      if (!types.includes('WebPage')) add(url, 'avert', 'WebPage absent du graphe');
    } catch {
      add(url, 'ERREUR', 'JSON-LD illisible');
    }
  }

  // Langue
  if (!$('html').attr('lang')) add(url, 'ERREUR', 'attribut lang absent');

  // Maillage interne entrant
  $('a[href^="/"]').each((_, a) => {
    const href = ($(a).attr('href') ?? '').split('#')[0];
    if (inboundLinks.has(href) && href !== url) inboundLinks.set(href, inboundLinks.get(href) + 1);
  });

  // Liens externes
  $('a[href^="http"]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (/cdegroupe\.com/.test(href)) add(url, 'avert', `lien interne écrit en absolu : ${href}`);
    else if ($(a).attr('target') === '_blank' && !/noopener/.test($(a).attr('rel') ?? '')) {
      add(url, 'avert', `target=_blank sans rel=noopener : ${href}`);
    }
  });
}

// Unicité
for (const [title, urls] of titles) if (urls.length > 1) add(urls.join(', '), 'ERREUR', `title dupliqué : "${title}"`);
for (const [desc, urls] of descriptions) if (urls.length > 1) add(urls.join(', '), 'ERREUR', `description dupliquée : "${desc.slice(0, 50)}…"`);

// Pages orphelines
for (const [url, n] of inboundLinks) {
  if (n === 0 && url !== '/') add(url, 'avert', 'page orpheline : aucun lien interne ne pointe vers elle');
}

// Fichiers attendus
for (const f of ['robots.txt', 'sitemap-index.xml', '404.html']) {
  if (!fs.existsSync(path.join(DIST, f))) add('(site)', 'ERREUR', `${f} absent`);
}

const errors = issues.filter((i) => i.level === 'ERREUR');
const warnings = issues.filter((i) => i.level === 'avert');

console.log(`${pages.length} pages auditées\n`);
const show = (list, label) => {
  if (list.length === 0) return console.log(`${label} : aucun`);
  console.log(`${label} : ${list.length}`);
  const grouped = new Map();
  for (const i of list) grouped.set(i.what, [...(grouped.get(i.what) ?? []), i.url]);
  for (const [what, urls] of grouped) {
    console.log(`  • ${what}`);
    console.log(`      ${urls.length > 3 ? `${urls.slice(0, 3).join(', ')} … (+${urls.length - 3})` : urls.join(', ')}`);
  }
};
show(errors, 'ERREURS');
console.log();
show(warnings, 'Avertissements');

process.exit(errors.length === 0 ? 0 : 1);
