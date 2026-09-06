# Migration WordPress → Astro : scripts et vérifications

Ces scripts ont extrait le contenu du WordPress `cdegroupe.com` (Lightsail, thème Avada) et
l'ont converti en pages Astro **en préservant la mise en page** du page-builder. Ils sont
versionnés pour pouvoir rejouer la migration tant que la source existe, et pour documenter
comment le contenu actuel a été produit.

Ils s'exécutent depuis ce dossier (`cd _source && node <script>.mjs`), ou via
`npm run content:build` depuis la racine pour la chaîne de conversion.

## Données brutes (non versionnées)

| Chemin | Contenu | Comment le régénérer |
|---|---|---|
| `pages/` | les 24 URL téléchargées | boucle `curl` sur `urls.txt` |
| `uploads/` + `uploads.tar` | 676 Mo de médias WordPress | `ssh … 'sudo tar cf - -C /opt/bitnami/wordpress/wp-content uploads' > uploads.tar` |
| `mirror/` | miroir `wget` de référence | `wget --mirror --page-requisites --adjust-extension --convert-links --no-parent` |
| `db-cdegroupe-*.sql.gz` | dump de la base | `ssh … 'sudo wp db export --single-transaction --skip-lock-tables -'` |
| `extracted/`, `html/` | étapes intermédiaires | `node extract.mjs && node tohtml.mjs` |
| `fusion.css` | CSS compilé du thème (charte) | `curl` de l'URL `fusion-styles` de la page d'accueil |

⚠️ **Conserver `uploads.tar` et le dump SQL hors du dépôt et hors AWS** avant la coupure du
Lightsail : ce sont les seules archives complètes de la source.

## Chaîne de conversion

```sh
node extract.mjs         # HTML -> extracted/*.json (métadonnées, H1/H2, images)
node images.mjs          # copie dans public/media les seules images référencées
(cd .. && npm run optimize:images)   # variantes WebP + manifeste des dimensions
node tohtml.mjs          # HTML Avada -> html/*.html : sections, lignes, colonnes, largeurs,
                         #   fonds, séparateurs, carrousels, témoignage, formulaire (marqueur)
node build-content.mjs   # frontmatter + html/ -> src/content/pages/*.md
node gen-vercel.mjs      # redirections + en-têtes -> vercel.json
```

### Pourquoi du HTML et pas du Markdown

La première version convertissait tout en Markdown à plat. Résultat : la home et les pages
Réalisations, qui sont des compositions en colonnes (texte | liste, grilles 3×2, cartes en
2 colonnes avec carrousel), s'empilaient en une seule colonne — jusqu'à **4 fois** la hauteur
de l'original. `tohtml.mjs` conserve la structure Avada sous forme de HTML sémantique léger
(`.awb-section` / `.awb-row` / `.awb-col`, largeurs et espacements repris de l'inline) que
`src/styles/global.css` met en page. Le corps des fichiers `.md` est donc du HTML.

Les styles inline conservés sont ceux qui portent un choix de design : `font-size`, `color`,
`text-shadow`, `text-align`, `text-transform`, `font-weight`, `line-height`, `margin-top`,
`margin-bottom`, `letter-spacing`. Le reste du bruit Avada est jeté.

### Ce que le convertisseur corrige au passage

- une seule page sans aucun titre : le bandeau porte le `<h1>` (comme le slider WordPress) ;
- les pages sans `<h1>` : premier `<h2>` promu **en place**, avec la classe `as-h2` qui lui
  garde le rendu d'un H2 ;
- liens internes : relatifs, avec slash final, et pointés directement sur la page finale
  quand l'URL d'origine était une redirection ;
- `alt` lisibles à partir des noms de fichiers ;
- le libellé « Craster » recopié par erreur sous le logo DeAgostini (`build-content.mjs`).

## Vérification

| Script | Rôle |
|---|---|
| `parity.mjs` | title, description, canonical, H1 identiques à l'original |
| `content-diff.mjs` | **aucun mot du contenu perdu**, mot à mot, écarts justifiés un par un |
| `check-links.mjs` | aucun lien ni ressource en 404, aucune redirection morte |
| `seo-audit.mjs` | métadonnées, hiérarchie des titres, images, données structurées, maillage |
| `test-contact.mjs` | formulaire de bout en bout contre un SMTP factice |
| `shots.mjs` | captures pleine page WP et Astro (`ONLY=astro` pour ne refaire qu'un côté) |
| `compare.mjs` | composites côte à côte + score de différence pixel par page |
| `probe-vert.mjs <url>` | positions verticales élément par élément, WP contre Astro — l'outil qui a permis d'aligner les marges au pixel |

Les scripts qui comparent à l'original (`parity`, `content-diff`, `shots`, `probe-vert`)
n'ont d'objet que tant que le WordPress est en ligne.
