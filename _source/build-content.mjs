import fs from 'node:fs';
const idx = JSON.parse(fs.readFileSync('extracted/_index.json','utf8'));
const map = JSON.parse(fs.readFileSync('image-map.json','utf8'));
// Liens deja casses dans le WordPress d'origine (404 en production aujourd'hui).
// On les repare vers la page reellement visee, deduite du libelle du lien.
const BROKEN_LINKS = {
  '/mobilier-interieur/': '/materiel-hotelier/mobilier-interieur-hotel/',
  '/mobilier-interieur-hotellerie/': '/materiel-hotelier/mobilier-interieur-hotel/',
};

// Caracteres de remplacement (U+FFFD double-encode) presents dans la source WordPress :
// une corruption d'encodage, pas un choix redactionnel. On restitue la lettre attendue.
const MOJIBAKE = [
  [/Contact \u00ef\u00bf\u00bd partir/g, 'Contact \u00e0 partir'],
  [/mentions l\u00ef\u00bf\u00bdgales/g, 'mentions l\u00e9gales'],
];

const dest = '../src/content/pages';
fs.mkdirSync(dest, {recursive:true});
const y = s => `"${String(s ?? '').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;
let n = 0;
for (const m of idx) {
  if (m.redirect) continue;
  let md = fs.readFileSync(`markdown/${m.slug}.md`,'utf8');
  // thumbnails -> originaux, et on retire les dimensions du fragment
  md = md.replace(/\(\/media\/([^)#]+)(#\d+x\d+)?\)/g, (_,p) => `(/media/${map[p] ?? p})`);
  for (const [from, to] of Object.entries(BROKEN_LINKS)) md = md.split(`](${from})`).join(`](${to})`);
  for (const [from, to] of MOJIBAKE) md = md.replace(from, to);
  // Le titre principal vient du frontmatter : on le retire du corps pour eviter le doublon.
  // 7 pages WordPress n'avaient aucun H1 : on promeut leur premier H2, le texte affiche
  // est inchange, seul le niveau de titre l'est.
  let h1 = m.h1?.[0] ?? null;
  let promoted = false;
  if (!h1) {
    const first = md.split('\n').find((l) => /^##\s/.test(l));
    if (first) {
      h1 = first.replace(/^##\s+/, '').replace(/[*_]/g, '').trim();
      promoted = true;
    } else {
      h1 = m.title.replace(/\s*-\s*CDE Groupe\s*$/, '');
    }
  }
  if (h1) {
    const marker = promoted ? '##' : '#';
    const re = new RegExp(`^${marker}\\s`);
    let removed = false;
    md = md.split('\n').filter((l) => {
      if (removed || !re.test(l)) return true;
      const text = l.replace(/^#+\s+/, '').replace(/[*_]/g, '').trim();
      if (text !== h1.trim()) return true;
      removed = true;
      return false;
    }).join('\n').trim();
  }
  const slugPath = m.url.replace(/^\//,'').replace(/\/$/,'') || 'index';
  const fm = [
    '---',
    `title: ${y(m.title.replace(/\s*-\s*CDE Groupe\s*$/,''))}`,
    `metaTitle: ${y(m.title)}`,
    `description: ${y(m.description)}`,
    `slug: ${y(slugPath)}`,
    `canonical: ${y(m.canonical)}`,
    h1 ? `heading: ${y(h1)}` : null,
    (() => {
      // Cas particuliers : la home partage l'image de son bandeau, et la page marques
      // le logo CDE plutot que le logo de la premiere marque venue.
      const OVERRIDES = {
        index: '/media/2015/02/slideshow-accueil.jpg',
        'marques-partenaires': '/media/2026/07/cde-logo2-white.png',
      };
      const firstImage = OVERRIDES[slugPath] ?? md.match(/!\[[^\]]*\]\((\/media\/[^)\s]+)\)/)?.[1];
      const og = firstImage ?? m.ogImage?.replace('https://www.cdegroupe.com/wp-content/uploads/', '/media/');
      return og ? `ogImage: ${y(og)}` : null;
    })(),
    `wpId: ${m.bodyId ?? 'null'}`,
    '---'
  ].filter(Boolean).join('\n');
  fs.writeFileSync(`${dest}/${slugPath.replace(/\//g,'__')}.md`, fm + '\n\n' + md + '\n');
  n++;
}
console.log(n, 'pages écrites dans src/content/pages');
