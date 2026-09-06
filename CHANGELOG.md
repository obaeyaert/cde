# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.1.0] — 2026-09-06

Repasse de fidélité : le site était loin d'être identique. La conversion Markdown à plat
avait aplati toute la mise en page du page-builder.

### Modifié

- **Conversion refaite** (`_source/tohtml.mjs`) : le HTML Avada devient du HTML sémantique
  qui conserve sections, lignes, colonnes et leurs largeurs, fonds, séparateurs, carrousels et
  témoignage. La home passe de 12 998 px à 5 575 px de haut (original : 5 636), la page
  Les Antilles de 31 398 px à 7 557 px (original : 7 549).
- Charte reprise des **styles calculés** de l'original (`getComputedStyle`), non plus des
  variables de thème : interlignage 34 px, H1 40/30 px inline, H3 22 px, H4 18 px, séparateur
  170 × 3 px, ombre d'image `3px 3px 7px`, colonne de pied de page 570 px, titre de widget en
  Montserrat, en-tête 138 px avec logo 237 px, surlignage blanc de la rubrique active,
  chevrons, en-tête collant au défilement.
- Bandeaux de tête : accueil `100vh − 111px` (mesuré 789 px), mentions légales 400 px avec le
  slider « About » retrouvé en base, titre en `<h1>` comme sur l'original.
- Page marques : la grille sur mesure (cartes, logos grisés) est remplacée par la conversion
  générique — rangées de 6 logos en couleur, comme l'original.
- Formulaire de contact injecté **à sa position d'origine** (colonne gauche, 65 %), champs de
  40 px gris sans bordure, bouton « ENVOYER » 45 px.
- Fil d'ariane visible retiré : le thème d'origine n'en affiche pas (il reste en JSON-LD).
- Téléphone retiré de l'en-tête (absent de l'original).

### Corrigé

- **Police** : Google Fonts servait les sous-ensembles dans un ordre que j'avais mal étiqueté —
  le fichier « latin » était le latin-ext, le navigateur retombait sur Arial. Mesuré à
  514 px pour la même phrase des deux côtés désormais.
- Deux `width:` inline par colonne Avada : le second (`calc()`, gouttières déduites) fait foi.
- Bordures de colonne inline (filets des titres de section) honorées.
- Séparateurs à deux filets : 8 px de haut comme l'original.
- Séparateurs et blocs de texte cachés derrière une classe `fusion-clearfix` retrouvés.
- Ligne enveloppée dans `fusion-fullwidth-center-content` (bandeau marques) retrouvée ; la
  section est centrée verticalement sur `100vh − en-tête`.
- Marges du thème rétablies : `.67em` autour du H1, `1em` sous le H2, 20 px sous chaque
  paragraphe, `margin-bottom:-15px` inline sous les H2 de section.
- Libellé « Craster » en double sous le logo DeAgostini.

### Ajouté

- `npm run verify:visual` : captures WP/Astro côte à côte et score de différence pixel.
- `_source/probe-vert.mjs` : positions verticales élément par élément, des deux côtés.
- `npm run content:build` : rejoue la conversion.

### Supprimé

- Pipeline Markdown (`tomd.mjs`, plugin rehype, `@astrojs/markdown-remark`, `turndown`).
- Page `marques-partenaires` sur mesure et `brands.json`.

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
