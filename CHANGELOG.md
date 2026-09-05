# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.0.0] — 2026-09-05

Reconstruction complète du site sur Astro, à partir du WordPress + Avada hébergé sur
Lightsail. Rendu reproduit à l'identique ; aucune modification n'a été faite sur le
WordPress, l'extraction s'est faite en lecture seule.

### Ajouté

- Socle Astro 7 en sortie statique, adapter Vercel, TypeScript strict.
- Les 21 pages en Markdown (`src/content/pages/`), schéma Zod sur le frontmatter.
- Reproduction de la charte Avada relevée dans le CSS du thème : Reem Kufi auto-hébergée
  (latin + latin-ext), `#2ba0a3` en couleur principale, `#24272d` pour l'en-tête et le pied.
- Menu à deux niveaux, ouvrable au clavier, replié en menu mobile sans JavaScript.
- Bandeau d'accueil reprenant le Fusion Slider (image, « C.D.E. », « Du concept à la réalisation »).
- Page `/marques-partenaires/` refaite en grille : 68 marques réparties en 6 rubriques,
  extraites en données structurées (`src/generated/brands.json`).
- Formulaire de contact : Vercel Function en runtime Node vers le SMTP OVH, reproduisant
  les deux mails de Contact Form 7. Honeypot, Turnstile optionnel, limitation de débit,
  neutralisation des CRLF contre l'injection d'en-têtes.
- Pipeline d'images : redimensionnement à 1600 px, variantes WebP 480/800/1600,
  manifeste des dimensions, plugin rehype posant `<picture>`, `srcset`, `sizes` et
  `width`/`height` sur tout le contenu Markdown.
- JSON-LD `Organization`, `WebSite`, `WebPage` et `BreadcrumbList`.
- En-têtes de sécurité et cache immuable sur `/media` et `/fonts` (`vercel.json`).
- Scripts de vérification : parité page à page avec l'ancien site, liens et ressources,
  formulaire de bout en bout via un SMTP factice.

### Modifié

- **39 redirections 301** reprises du plugin Redirection, portées dans `vercel.json`.
- Les entrées de menu qui pointaient sur une URL redirigée visent désormais la page réelle :
  un aller-retour réseau en moins par clic. Les redirections restent en filet de sécurité.

### Corrigé

Défauts hérités du WordPress, corrigés au passage :

- 6 pages sans aucun H1 (`/nos-clients/*`, `/marques-partenaires/`, `/contact/`,
  `/mentions-legales/`) : leur premier H2 a été promu, le texte affiché est inchangé.
- `/nos-clients/`, `/amenagement-et-equipement/` et `/materiel-hotelier/` figuraient dans le
  sitemap Yoast tout en étant redirigées en 301. Elles sont sorties du sitemap.
- Deux liens internes morts (`/mobilier-interieur`, `/mobilier-interieur-hotellerie`)
  pointés vers la bonne page, et couverts par une redirection.
- Vignette « DeAgostini » de la page marques : le libellé et le lien étaient ceux de
  « Craster », recopiés par erreur.
- Liens internes hérités sans slash final, qui seraient partis en 404 sous
  `trailingSlash: 'always'`.
- Médias encore référencés sur `/wp-content/uploads/` : remappés sur `/media/`.
- Favicon servi en 1000 × 1000 : icônes 32, 180 et 512 px générées.

### Supprimé

- WordPress et ses 24 extensions, dont trois greffons Google Analytics concurrents,
  W3 Total Cache, All-in-One WP Migration et le page-builder Fusion.
- 617 Mo de médias inutilisés (676 Mo → 30 Mo une fois triés et optimisés) : seules les
  216 images réellement référencées sont conservées.
- Métadonnées d'auteur et de date que le thème injectait dans le HTML de chaque page.

### Sécurité

- Le mot de passe SMTP de `contact@cdegroupe.com` était stocké **en clair** dans
  `wp_options`. Il doit être régénéré chez OVH ; le nouveau ne vit que dans les variables
  d'environnement Vercel.
- En-têtes ajoutés : HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`.

### Reste à faire

Bascule DNS et extinction du Lightsail : opérations manuelles, voir `tasks/todo.md`.
