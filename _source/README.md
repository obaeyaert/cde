# Scripts de migration WordPress → Astro

Ces scripts ont servi à extraire le contenu du WordPress `cdegroupe.com` (Lightsail,
thème Avada) et à le convertir en contenu Astro. Ils sont conservés pour pouvoir
**rejouer la migration** tant que la source existe, et pour documenter comment le
contenu actuel a été produit.

Ils s'exécutent depuis ce dossier (`cd _source && node <script>.mjs`).

## Données brutes (non versionnées)

Elles ne sont pas dans Git — trop volumineuses, et reproductibles depuis la source :

| Chemin | Contenu | Comment le régénérer |
|---|---|---|
| `pages/` | les 24 URL téléchargées | boucle `curl` sur `urls.txt` |
| `uploads/` | 676 Mo de médias WordPress | `ssh … 'sudo tar cf - -C /opt/bitnami/wordpress/wp-content uploads' > uploads.tar` |
| `mirror/` | miroir `wget` de référence | `wget --mirror --page-requisites --adjust-extension --convert-links --no-parent` |
| `db-cdegroupe-*.sql.gz` | dump de la base | `ssh … 'sudo wp db export --single-transaction --skip-lock-tables -'` |
| `extracted/`, `markdown/` | étapes intermédiaires | `node extract.mjs && node tomd.mjs` |

⚠️ **Conserver `uploads.tar` et le dump SQL hors du dépôt et hors AWS** avant la coupure
du Lightsail : ce sont les seules archives complètes de la source.

## Enchaînement

```sh
node extract.mjs         # HTML -> extracted/*.json (métadonnées, contenu, images)
node tomd.mjs            # extracted -> markdown/ (contenu nettoyé, liens normalisés)
node images.mjs          # trie les images réellement utilisées -> public/media
node build-content.mjs   # markdown + métadonnées -> src/content/pages/*.md
node extract-brands.mjs  # page marques -> src/generated/brands.json
node gen-vercel.mjs      # redirections + en-têtes -> vercel.json
```

Puis, depuis la racine : `npm run optimize:images && npm run build && npm run verify`.

## Vérification

| Script | Rôle |
|---|---|
| `parity.mjs` | compare chaque page générée à l'originale (title, description, canonical, H1, volume de texte) |
| `check-links.mjs` | aucun lien interne ni ressource en 404, aucune redirection morte |
| `test-contact.mjs` | formulaire de bout en bout via un SMTP factice (validation, honeypot, 2 mails, injection d'en-tête) |
| `fake-smtp.mjs` | SMTP de test autonome sur le port 2525 |

`parity.mjs` a besoin de `extracted/` : il ne fonctionne que tant que la source WordPress
a été extraite. Une fois le Lightsail éteint, il n'a plus d'objet — `check-links.mjs` et
`test-contact.mjs`, si.
