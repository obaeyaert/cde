/**
 * Assemble les pages de la collection Astro : frontmatter (métadonnées relevées sur le
 * WordPress) + corps HTML produit par tohtml.mjs, qui préserve la mise en page Avada.
 */
import fs from 'node:fs';

const idx = JSON.parse(fs.readFileSync('extracted/_index.json', 'utf8'));
const dest = '../src/content/pages';
fs.mkdirSync(dest, { recursive: true });

// Caractères de remplacement (U+FFFD double-encodé) présents dans la source WordPress :
// une corruption d'encodage, pas un choix rédactionnel. On restitue la lettre attendue.
const MOJIBAKE = [
  [/Contact ï¿½ partir/g, 'Contact à partir'],
  [/mentions lï¿½gales/g, 'mentions légales'],
];

// Erreur de saisie côté WordPress : la vignette DeAgostini portait le libellé de Craster.
const CONTENT_FIXES = {
  'marques-partenaires': [
    // le libellé-lien qui suit le logo DeAgostini pointait sur Craster : on vise la bonne marque
    [/(deagostini(?:(?!<a href)[\s\S])*?<a href=")http:\/\/www\.craster\.com\/("[^>]*>)Craster(<\/a>)/, '$1https://www.deagostini-inox.it/$2DeAgostini$3'],
  ],
};

// Aperçu de partage : la home prend l'image de son bandeau, la page marques le logo CDE.
const OG_OVERRIDES = {
  index: '/media/2015/02/slideshow-accueil.jpg',
  'marques-partenaires': '/media/2026/07/cde-logo2-white.png',
};

const y = (s) => `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// on repart d'un dossier propre : une page retirée de la source ne doit pas survivre ici
for (const f of fs.readdirSync(dest)) if (f.endsWith('.md')) fs.unlinkSync(`${dest}/${f}`);

let n = 0;
for (const m of idx) {
  if (m.redirect) continue;
  let html = fs.readFileSync(`html/${m.slug}.html`, 'utf8');
  for (const [from, to] of MOJIBAKE) html = html.replace(from, to);
  html = html.replace('<!--CONTACT_FORM-->', fs.readFileSync('contact-form.html', 'utf8').trim());

  const slugPath = m.url.replace(/^\//, '').replace(/\/$/, '') || 'index';
  for (const [from, to] of CONTENT_FIXES[slugPath] ?? []) html = html.replace(from, to);

  const firstImage = html.match(/<img src="(\/media\/[^"]+)"/)?.[1];
  const og = OG_OVERRIDES[slugPath] ?? firstImage ?? '/media/2026/07/cde-logo2-white.png';

  const fm = [
    '---',
    `title: ${y(m.title.replace(/\s*-\s*CDE Groupe\s*$/, ''))}`,
    `metaTitle: ${y(m.title)}`,
    `description: ${y(m.description)}`,
    `slug: ${y(slugPath)}`,
    `canonical: ${y(m.canonical)}`,
    `ogImage: ${y(og)}`,
    `wpId: ${m.bodyId ?? 'null'}`,
    '---',
  ].join('\n');

  fs.writeFileSync(`${dest}/${slugPath.replace(/\//g, '__')}.md`, `${fm}\n\n${html}\n`);
  n++;
}
console.log(n, 'pages écrites dans src/content/pages');
