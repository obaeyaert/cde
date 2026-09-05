import fs from 'node:fs';
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
const cfg = {
  redirects: raw.map(([source, destination]) => ({ source, destination, permanent: true })),
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
fs.writeFileSync('vercel.json', JSON.stringify(cfg, null, 2) + '\n');
console.log(cfg.redirects.length, 'redirections ecrites dans vercel.json');
