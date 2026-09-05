import * as cheerio from 'cheerio';
import fs from 'node:fs';

const $ = cheerio.load(fs.readFileSync('pages/marques-partenaires.html', 'utf8'));
const map = JSON.parse(fs.readFileSync('image-map.json', 'utf8'));
// Casse d'origine des marques que l'on doit deduire du nom de fichier.
const CASING = { deagostini: 'DeAgostini' };

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const toMedia = (u) => {
  const rel = (u ?? '').replace(/^https:\/\/www\.cdegroupe\.com\/wp-content\/uploads\//, '');
  return '/media/' + (map[rel] ?? rel.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1'));
};

const categories = [];
$('#content .fusion-builder-row.fusion-row').each((_, row) => {
  const $row = $(row);
  const heading = clean($row.find('h2').first().text());
  if (!heading) return;

  const intro = clean($row.find('h3').first().text());
  const brands = [];
  let group = '';

  $row.children('.fusion-layout-column').each((__, col) => {
    const $col = $(col);
    const img = $col.find('img').first();

    if (img.length) {
      // Le lien qui entoure le logo fait foi ; le lien-libelle qui suit peut avoir ete
      // mal recopie dans WordPress (cas DeAgostini/Craster).
      const imgLink = $col.find('a[href^="http"]')
        .filter((___, a) => !/cdegroupe\.com/.test($(a).attr('href') ?? '')).first();
      const url = (imgLink.attr('href') ?? '').trim().replace(/^<|>$/g, '') || null;
      const textLink = $col.find('a').filter((___, a) => clean($(a).text()).length > 0).first();
      const label = clean(textLink.text());
      const sameUrl = (v) => (v ?? '').trim().replace(/^<|>$/g, '').replace(/\/+$/, '').toLowerCase();
      const sameTarget = sameUrl(textLink.attr('href')) === sameUrl(url);

      const slug = (img.attr('data-src') || img.attr('src') || '').split('/').pop()
        .replace(/\.[a-z]+$/i, '');
      const squash = (v) => v.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
      // Un libelle est digne de confiance s'il pointe sur la meme cible que le logo
      // OU si on le retrouve dans le nom de fichier du logo.
      const labelMatchesLogo = label.length > 2 && squash(slug).includes(squash(label));
      const trusted = label && (sameTarget || labelMatchesLogo);

      const fromFile = slug.replace(/^logo-/, '').split('-').pop();
      const titleCase = (v) => CASING[v.toLowerCase()] ?? v.charAt(0).toUpperCase() + v.slice(1);

      if (label && !trusted) {
        console.warn(`  ! libelle incoherent ignore : "${label}" ne correspond pas au logo ${slug}`);
      }
      brands.push({
        name: trusted ? label : titleCase(fromFile),
        url,
        logo: toMedia(img.attr('data-src') || img.attr('src')),
        group: group || null,
      });
      return;
    }
    // Une colonne sans image qui ne porte qu'un titre court est un intertitre de rubrique.
    const sub = clean($col.find('h3').text());
    if (sub && sub !== intro && sub.length < 40) group = sub;
  });

  categories.push({ heading, intro: intro || null, brands });
});

fs.writeFileSync('../src/generated/brands.json', JSON.stringify(categories, null, 2));
let total = 0;
for (const c of categories) {
  total += c.brands.length;
  console.log(`${c.heading} — ${c.brands.length} marques`);
  console.log('   ', c.brands.slice(0, 4).map((b) => b.name).join(' | '));
}
console.log('\ntotal :', total, 'marques');
