import fs from 'node:fs';
import path from 'node:path';

// Chemins ancres sur le script : le generateur ecrit toujours le vercel.json de la racine,
// quel que soit le repertoire courant.
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Les redirections relevees dans le plugin Redirection (wp_redirection_items, status=enabled)
const raw = [
  ['/nos-clients/', '/nos-clients/les-antilles/'],
  ['/author/admin_comptoir/', '/'],
  ['/equipement-hotel-caraibes/', '/amenagement-et-equipement/equipement-hotel-caraibes/'],
  ['/equipement-hotel-france/', '/amenagement-et-equipement/equipement-hotel-france/'],
  ['/equipement-hotel-ocean-indien/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/equipement-hotel-afrique/', '/amenagement-et-equipement/equipement-hotel-afrique/'],
  ['/equipement-hotel-polynesie-francaise/', '/amenagement-et-equipement/equipement-hotel-polynesie-francaise/'],
  ['/zones-de-livraisons/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/zones-de-livraison/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/linge-hotel/', '/materiel-hotelier/linge-hotel/'],
  ['/produit-d-accueil-hotel/', '/materiel-hotelier/produit-d-accueil-hotel/'],
  ['/art-de-la-table/', '/materiel-hotelier/art-de-la-table/'],
  ['/mobilier-interieur-hotel/', '/materiel-hotelier/mobilier-interieur-hotel/'],
  ['/mobilier-exterieur-hotellerie/', '/materiel-hotelier/mobilier-exterieur-hotellerie/'],
  ['/accessoire-de-salle-de-bain-hotel/', '/materiel-hotelier/accessoire-de-salle-de-bain-hotel/'],
  ['/tissu-d-ameublement-hotel/', '/materiel-hotelier/tissu-d-ameublement-hotel/'],
  ['/literie-hotel/', '/materiel-hotelier/literie-hotel/'],
  ['/zones-de-livraisons/equipement-hotel-caraibes/', '/amenagement-et-equipement/equipement-hotel-caraibes/'],
  ['/zones-de-livraisons/equipement-hotel-france/', '/amenagement-et-equipement/equipement-hotel-france/'],
  ['/zones-de-livraisons/equipement-hotel-ocean-indien/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/zones-de-livraisons/equipement-hotel-afrique/', '/amenagement-et-equipement/equipement-hotel-afrique/'],
  ['/zones-de-livraisons/equipement-hotel-polynesie-francaise/', '/amenagement-et-equipement/equipement-hotel-polynesie-francaise/'],
  ['/amenagement-et-equipement/dans-les-caraibes/', '/amenagement-et-equipement/equipement-hotel-caraibes/'],
  ['/amenagement-et-equipement/en-afrique/', '/amenagement-et-equipement/equipement-hotel-afrique/'],
  ['/amenagement-et-equipement/dans-l-ocean-indien/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/amenagement-et-equipement/en-polynesie-francaise/', '/amenagement-et-equipement/equipement-hotel-polynesie-francaise/'],
  ['/amenagement-et-equipement/en-france/', '/amenagement-et-equipement/equipement-hotel-france/'],
  ['/materiel-hotelier/', '/materiel-hotelier/linge-hotel/'],
  ['/amenagement-et-equipement/', '/amenagement-et-equipement/equipement-hotel-ocean-indien/'],
  ['/element_category/columns/', '/'],
  ['/element_category/elements/', '/'],
  ['/element_category/sections/', '/'],
  ['/faq-items/', '/'],
  // liens deja casses dans le WordPress d origine : ces URL peuvent etre indexees
  ['/mobilier-interieur/', '/materiel-hotelier/mobilier-interieur-hotel/'],
  ['/mobilier-interieur-hotellerie/', '/materiel-hotelier/mobilier-interieur-hotel/'],
  // anciens points d entree WordPress devenus sans objet
  ['/wp-admin', '/'],
  ['/wp-login.php', '/'],
  ['/feed/', '/'],
  ['/author/:slug*', '/'],
];
// Shortlinks WordPress /?p=<ID> : WP les redirigeait en 301 vers l'URL lisible. Sans cette
// regle, un vieux lien /?p=1246 atterrirait sur la home.
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, '_source/extracted/_index.json'), 'utf8')).filter((m) => !m.redirect && m.bodyId);
const shortlinks = pages.map((m) => ({
  source: '/',
  has: [{ type: 'query', key: 'p', value: String(m.bodyId) }],
  destination: m.url,
  statusCode: 301,
}));

// Heritage WordPress : tout ce qui pouvait etre indexe ou mis en favori et qui n'existe plus.
const legacy = [
  // medias : les anciennes URL d'images (Google Images, liens externes) suivent vers /media ;
  // les vignettes generees par WP (-300x200) remontent vers l'original conserve
  { source: '/wp-content/uploads/:dir*/:name-:w(\\d+)x:h(\\d+).:ext(jpe?g|png|gif|webp)', destination: '/media/:dir*/:name.:ext' },
  { source: '/wp-content/uploads/:path*', destination: '/media/:path*' },
  // points d'entree techniques
  { source: '/index.php', destination: '/' },
  { source: '/index.php/:path*', destination: '/:path*' },
  { source: '/favicon.ico', destination: '/favicon-32.png' },
  { source: '/xmlrpc.php', destination: '/' },
  // flux, archives et contenus du theme qui n'ont jamais eu de page propre
  { source: '/:path*/feed/', destination: '/:path*/' },
  { source: '/page/:n(\\d+)/', destination: '/' },
  { source: '/category/:path*', destination: '/' },
  { source: '/tag/:path*', destination: '/' },
  { source: '/slide/:path*', destination: '/' },
  { source: '/element_category/:path*', destination: '/' },
  { source: '/faq-items/:path*', destination: '/' },
  { source: '/fusion_element/:path*', destination: '/' },
  { source: '/portfolio/:path*', destination: '/' },
].map((r) => ({ ...r, statusCode: 301 }));

// Slash final : l'adaptateur Astro repond 308, l'original 301. En dernier, hors API et hors
// fichiers (dernier segment sans point).
const trailingSlash = { source: '/:path((?!api/)(?:[^/]+/)*[^/.]+)', destination: '/:path/', statusCode: 301 };

const cfg = {
  // statusCode explicite : "permanent: true" donne un 308 chez Vercel, l'original repond 301
  redirects: [
    ...raw.map(([source, destination]) => ({ source, destination, statusCode: 301 })),
    ...shortlinks,
    ...legacy,
    trailingSlash,
  ],
  headers: [
    { source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]},
    { source: '/fonts/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ],
};
fs.writeFileSync(path.join(ROOT, 'vercel.json'), JSON.stringify(cfg, null, 2) + '\n');
console.log(cfg.redirects.length, 'redirections ecrites dans vercel.json');
