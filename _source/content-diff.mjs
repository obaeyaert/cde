/**
 * Garantit que le texte visible n'a pas bougé entre le WordPress d'origine et le site
 * généré. Compare mot à mot, en ignorant ce qui est volontairement supprimé (métadonnées
 * d'auteur et de date injectées par le thème) ou ajouté (formulaire, fil d'ariane, bandeau).
 */
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const DIST = '.vercel/output/static';
const idx = JSON.parse(fs.readFileSync('_source/extracted/_index.json', 'utf8'));

/* cheerio.text() colle les nœuds voisins ("Marques" + "NOS" -> "marquesnos").
   On passe donc par le HTML, en remplaçant chaque balise par une espace. */
const textOf = ($, selector) =>
  ($(selector).html() ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39|#8217);/g, '’');

const words = (s) =>
  s.replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFC')
    .match(/[\p{L}\p{N}’'-]+/gu) ?? [];

/* Mots que le thème WordPress injectait et qui disparaissent volontairement. */
const REMOVED = /^(admin_comptoir|accueil admin_comptoir|\d{4}-\d{2}-\d{2}t[\d:+-]+)$/;

/* Écarts assumés, page par page : correction d'une erreur de saisie du WordPress.
   La vignette DeAgostini y portait le libellé et le lien de Craster. */
const ACCEPTED = { '/marques-partenaires/': new Set(['craster']) };

/* Blocs que le site ajoute et qui n'existaient pas dans le contenu WordPress. */
const ADDED_SELECTORS = ['.breadcrumb', '.hero', '.contact-form'];

let mismatches = 0;
const rows = [];

for (const m of idx) {
  if (m.redirect) continue;

  const file = path.join(DIST, m.url === '/' ? 'index.html' : path.join(m.url.replace(/^\//, ''), 'index.html'));
  const $new = cheerio.load(fs.readFileSync(file, 'utf8'));
  for (const sel of ADDED_SELECTORS) $new(sel).remove();

  const srcFile = path.join('_source/pages', (m.slug === '__home__' ? '__home__' : m.slug) + '.html');
  const $old = cheerio.load(fs.readFileSync(srcFile, 'utf8'));
  $old('#content .rich-snippet-hidden, #content .fusion-meta-info, #content form, #content .wpcf7').remove();

  const wNew = words(textOf($new, 'main'));
  const wOld = words(textOf($old, '#content'));

  const count = (list) => {
    const c = new Map();
    for (const w of list) c.set(w, (c.get(w) ?? 0) + 1);
    return c;
  };
  const cNew = count(wNew);
  const cOld = count(wOld);

  const missing = [];
  for (const [w, n] of cOld) {
    const delta = n - (cNew.get(w) ?? 0);
    if (delta > 0 && !REMOVED.test(w) && !ACCEPTED[m.url]?.has(w)) missing.push(`${w}×${delta}`);
  }

  if (missing.length > 0) mismatches++;
  rows.push({ url: m.url, old: wOld.length, new: wNew.length, missing });
}

console.log('URL'.padEnd(58), 'mots wp'.padStart(8), 'mots astro'.padStart(11), '  perdus');
for (const r of rows) {
  console.log(
    r.url.padEnd(58),
    String(r.old).padStart(8),
    String(r.new).padStart(11),
    '  ' + (r.missing.length === 0 ? 'aucun' : r.missing.slice(0, 6).join(' ')),
  );
}
console.log(`\n${rows.length - mismatches}/${rows.length} pages sans perte de contenu`);
process.exit(mismatches === 0 ? 0 : 1);
