# cdegroupe.com

Site vitrine de **CDE Groupe** (Comptoir Distribution Exportation) — équipement hôtelier.
Astro en statique, déployé sur Vercel. Migré depuis WordPress + thème Avada.

## Pourquoi cette migration

Le site tournait sur une Lightsail **512 Mo**. Le 27/08/2026, l'OOM killer a tué `mysqld` :
six workers php-fpm à ~100 Mo face à 472 Mo de RAM. Le site est resté hors ligne jusqu'à un
redémarrage manuel. Le problème était structurel, pas accidentel.

Le site est un pur vitrine : 21 pages, aucun article, aucun compte utilisateur, un seul
formulaire. Rien ne justifiait un WordPress.

| | WordPress (Lightsail) | Astro (Vercel) |
|---|---|---|
| Page type, tout compris | ~2,2 Mo (hors images) | **122 Ko** |
| CSS | 1 426 Ko | 9 Ko |
| JS | 718 Ko | 2 Ko |
| Médias stockés | 676 Mo | 30 Mo (sources + variantes WebP) |
| Serveur à maintenir | oui, PHP 8.1 et Debian 11 en fin de vie | aucun |

## Démarrer

```sh
npm install
npm run dev          # http://localhost:4321 — aucune configuration nécessaire
```

Pas besoin de `.env` pour travailler : sans SMTP configuré, le formulaire **affiche les
mails dans les logs du serveur** au lieu d'échouer.

### Le serveur de dev tourne en arrière-plan

Astro 7 détache le serveur : `npm run dev` rend la main et **les logs ne s'affichent pas
dans ton terminal**. D'où :

| Commande | Rôle |
|---|---|
| `npm run dev` | démarre sur le port **4321**, fixe (il échoue plutôt que de glisser sur 4322) |
| `npm run dev:logs` | **les logs du serveur** — c'est là que sortent les erreurs et les mails |
| `npm run dev:status` | serveur en cours ? sur quel port ? |
| `npm run dev:stop` | l'arrête |
| `npm run dev:restart` | stop + start |

Le port est volontairement strict : sinon Astro se rabat silencieusement sur le port
suivant quand un serveur d'une session précédente traîne, et on débugge sans le savoir
une version périmée. Si le démarrage échoue sur « port in use » : `npm run dev:stop`.

Le rechargement à chaud fonctionne sur tout, y compris le Markdown de `src/content/pages/`.

### Tester le formulaire

Trois niveaux, du plus simple au plus proche du réel :

```sh
# 1. Rien à configurer — les deux mails s'affichent dans npm run dev:logs
npm run dev

# 2. Vraie boîte SMTP locale : teste nodemailer, l'authentification et l'encodage
npm run dev:mail          # dans un autre terminal, écoute sur 127.0.0.1:2525
#    puis .env : SMTP_HOST=127.0.0.1  SMTP_PORT=2525  SMTP_USER=dev  SMTP_PASS=dev

# 3. Suite complète (validation, honeypot, 2 mails, injection d'en-tête)
npm run verify:contact    # nécessite npm run dev et le .env du point 2
```

Aucun mail ne part vers l'extérieur dans ces trois modes.

> `npm run preview` ne fonctionne pas avec l'adapter Vercel : utiliser `npm run dev`,
> ou `vercel dev` pour approcher l'environnement de production.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run build` | build de production (sortie `.vercel/output/`) |
| `npm run check` | types Astro/TypeScript |
| `npm run optimize:images` | réencode `public/media`, génère les variantes WebP et le manifeste des dimensions |
| `npm run verify` | build + liens + parité + contenu + SEO |
| `npm run verify:links` | aucun lien ni ressource en 404, aucune redirection morte |
| `npm run verify:parity` | métadonnées identiques à l'ancien site |
| `npm run verify:content` | **aucun mot du contenu perdu** face au WordPress |
| `npm run verify:seo` | métadonnées, titres, images, données structurées, maillage |
| `npm run verify:contact` | formulaire de bout en bout |

## Architecture

```
src/
  content/pages/      les 21 pages en Markdown + frontmatter (titre, meta, canonical)
  content.config.ts   schéma Zod de la collection
  pages/
    [...slug].astro   rend toutes les pages depuis la collection
    marques-partenaires/  page à part : grille des 68 logos partenaires
    api/contact.ts    endpoint du formulaire (Vercel Function, runtime Node)
  components/         Header, Footer, Hero, ContactForm
  layouts/Base.astro  <head>, SEO, JSON-LD (Organization, WebSite, WebPage, BreadcrumbList)
  data/site.ts        coordonnées et menu
  generated/          produits par les scripts — ne pas éditer à la main
scripts/
  optimize-images.mjs images : redimensionnement, WebP, manifeste des dimensions
  rehype-picture.mjs  transforme les <img> Markdown en <picture> responsive
_source/              scripts de migration + données brutes (voir _source/README.md)
```

### Modifier le contenu

Un fichier Markdown par page dans `src/content/pages/`. Le frontmatter porte le SEO
(`metaTitle`, `description`, `canonical`) ; `heading` est le H1 affiché. Le `slug` détermine
l'URL — **le changer casse le référencement**, il faut alors ajouter une redirection dans
`_source/gen-vercel.mjs` puis relancer `node _source/gen-vercel.mjs`.

### Images

Déposer l'original dans `public/media/<année>/<mois>/`, puis `npm run optimize:images`.
Le script produit les variantes WebP (480/800/1600) et les dimensions ; le plugin rehype
pose `srcset`, `sizes`, `width` et `height` automatiquement. Aucune balise à écrire à la main.

### Formulaire de contact

`src/pages/api/contact.ts`, runtime **Node** (le runtime Edge ne fait pas de TCP sortant,
donc pas de SMTP). Il reproduit les deux mails de Contact Form 7 : notification à
`contact@cdegroupe.com` avec `Reply-To` de l'expéditeur, et accusé de réception.

Protections : honeypot, Turnstile si les clés sont renseignées, limitation de débit,
neutralisation des CRLF pour empêcher l'injection d'en-têtes.

## Variables d'environnement (Vercel)

| Variable | Obligatoire | Note |
|---|---|---|
| `SMTP_USER`, `SMTP_PASS` | oui | boîte OVH `contact@cdegroupe.com` |
| `SMTP_HOST`, `SMTP_PORT` | non | par défaut `ssl0.ovh.net:465` |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | non | sans elles, seul le honeypot protège |

> ⚠️ Le mot de passe SMTP présent dans l'ancienne base WordPress (`wp_options`, en clair)
> est compromis. En générer un nouveau chez OVH et ne le mettre que dans Vercel.

## SEO

- Les 21 URL sont conservées à l'identique.
- **39 redirections 301** dans `vercel.json`, générées depuis le plugin Redirection.
- `/nos-clients/`, `/amenagement-et-equipement/` et `/materiel-hotelier/` restent des 301 :
  elles n'ont jamais eu de contenu propre. Elles étaient à la fois dans le sitemap Yoast
  **et** redirigées — incohérence corrigée, elles sont désormais hors sitemap.
- 6 pages n'avaient aucun H1 : leur premier H2 a été promu. Le texte affiché est inchangé.
- Deux liens internes étaient déjà morts côté WordPress (`/mobilier-interieur`,
  `/mobilier-interieur-hotellerie`) : réparés, et couverts par une redirection.
- `og:image` est propre à chaque page (WordPress servait le logo partout), avec dimensions
  et `og:image:alt` ; les balises Twitter sont complètes.
- Une page 404 utile, en `noindex, follow`, qui renvoie vers les rubriques.
- Les `alt` étaient des noms de fichiers (`Karibea-Beach-Resort-Gosier-bar`) : rendus
  lisibles mécaniquement, sans rien inventer.
- Hiérarchie des titres continue (un H5 isolé créait un saut H3 → H5).

### Ce qui n'a volontairement pas été touché

Le contenu rédactionnel reste celui du client. `npm run verify:seo` signale donc encore :

- **18 meta descriptions de plus de 160 caractères** — elles seront tronquées dans les
  résultats de recherche. Ce sont les descriptions Yoast d'origine : les raccourcir est une
  décision éditoriale, pas technique.
- **2 titles courts** (`Contact`, `Marques` — 20 caractères) : même raison.

`npm run verify:content` garantit qu'aucun mot du contenu n'a bougé : 21/21 pages.

## Déploiement

Projet Vercel branché sur ce dépôt, preset Astro, sortie `.vercel/output/`. `vercel.json`
porte les redirections, les en-têtes de sécurité (HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) et le cache immuable sur
`/media` et `/fonts`.

**La bascule DNS et l'extinction du Lightsail restent des opérations manuelles.**
Voir `tasks/todo.md`.
