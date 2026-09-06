# Migration cdegroupe.com — WordPress/Lightsail → Astro/Vercel

> État au 2026-09-06. Phases 1 à 5 **terminées et vérifiées** (repasse de fidélité visuelle faite).
> Restent la bascule DNS et le décommissionnement : opérations manuelles.

## Contexte

Site vitrine **CDE Groupe** — équipement hôtelier. WordPress 7.0.4 + Avada sur une
Lightsail nano 512 Mo. L'OOM killer tue `mysqld` (panne du 27/08/2026, site down jusqu'au
redémarrage manuel du 05/09). Problème structurel : il se reproduira.

**Décisions actées** : contenu versionné dans le dépôt (pas de CMS), reproduction fidèle du
design, formulaire via Vercel Function Node → SMTP OVH conservé.

**Accès serveur** (lecture seule tant que la bascule n'est pas faite) :
```sh
ssh -i <clé Lightsail> bitnami@<IP de l'instance>   # coordonnées hors dépôt public
# clé en chmod 600 ; racine WP : /opt/bitnami/wordpress
```

---

## ✅ Phases 1 à 5 — terminées

- [x] **Extraction** (la source est sauvegardée) : 24 URL, miroir `wget`, 676 Mo d'uploads
      (`_source/uploads.tar`), dump SQL (`_source/db-cdegroupe-20260905.sql.gz`, 4 Mo).
- [x] **Socle Astro** : Astro 7 statique, adapter Vercel, TypeScript strict, Content
      Collections, sitemap, Reem Kufi auto-hébergée.
- [x] **Intégration** : header 2 niveaux, footer, bandeau d'accueil, 21 pages, page marques
      en grille (68 logos), charte relevée sur le CSS Avada.
- [x] **Formulaire** : Vercel Function Node → SMTP OVH, deux mails reproduits, honeypot,
      Turnstile optionnel, limitation de débit, protection contre l'injection d'en-têtes.
- [x] **SEO** : 39 redirections 301, sitemap à 21 URL, JSON-LD, en-têtes de sécurité.

### Vérifications passées

| Contrôle | Résultat |
|---|---|
| Parité avec l'ancien site (21 pages) | **0 écart** — title, description, canonical, H1, volume de texte |
| Liens internes et ressources | **0 lien mort**, 0 redirection morte |
| Formulaire de bout en bout | **11/11** — validation, honeypot, 2 mails, Reply-To, injection d'en-tête |
| Fidélité visuelle (06/09) | hauteurs à **±1,1 %** sur 21 pages ; 2–3 % de pixels différents (texte), 6–9 % (photos) |
| Poids d'une page type | 2,2 Mo → **~125 Ko** |
| Médias | 676 Mo → **30 Mo** |

Rejouer : `npm run verify`, `npm run verify:visual` (+ `npm run verify:contact` avec `npm run dev` en cours).

---

## ⬜ Phase 6 — Déploiement et bascule

- [x] Dépôt poussé sur GitHub : https://github.com/obaeyaert/cde (`main` vide + branche
      `feat/migration-wordpress-to-astro`). PR à ouvrir/merger à la main.
- [x] Préversion anonyme testée le 06/09 (pages, 301, 404, en-têtes, cache, API) :
      `npx vercel deploy --temporary --yes`.
- [x] Projet Vercel `cde` créé et lié (`npx vercel link`), framework Astro, Node 24.
      Préversion : https://cde-roan-six.vercel.app (06/09). `SMTP_HOST/PORT/USER` posés.
- [ ] Installer l'app GitHub de Vercel sur `obaeyaert` (Settings → Git du projet), puis
      `npx vercel git connect` : chaque push sur la branche = préversion, merge dans `main` = prod.
- [ ] **Régénérer le mot de passe SMTP OVH** de `contact@cdegroupe.com` — l'ancien est en
      clair dans `wp_options` et a été exposé en console le 05/09. Le nouveau ne va que dans
      les variables d'environnement Vercel (scopes Preview et Production).
- [ ] Recette sur la préversion : 21 pages + 404, mobile, quelques 301, **un envoi réel de
      formulaire reçu dans la boîte**.
- [ ] **Abaisser le TTL DNS à 300 s au moins 24 h avant la bascule.**
- [ ] Ajouter `cdegroupe.com` et `www.cdegroupe.com` dans Vercel, laisser émettre le certificat ;
      configurer la redirection apex → `www` (comportement actuel).
- [ ] Merger la PR → production Vercel. Basculer les enregistrements DNS. **Ne pas éteindre le
      Lightsail** : le rollback consiste à revenir sur l'IP de l'instance.
- [ ] Contrôler la propagation, le HTTPS, puis remonter le TTL.
- [ ] Search Console : soumettre le sitemap, surveiller couverture et 404 pendant 2 semaines.

## ⬜ Phase 7 — Décommissionnement

- [ ] **Attendre 30 jours** de production Vercel stable.
- [ ] Mettre `_source/uploads.tar` et le dump SQL à l'abri, **hors du dépôt et hors AWS**.
- [ ] Snapshot final du Lightsail, puis suppression de l'instance.
- [ ] Vérifier qu'aucun autre service ne pointe sur l'IP de l'instance Lightsail.
- [ ] La boîte mail OVH reste en service : le formulaire s'en sert toujours.

---

## Points de vigilance

1. **Ne pas éteindre le Lightsail avant 30 jours** de production stable. C'est le rollback.
2. **Le SMTP depuis du serverless** est le seul point qui peut se comporter autrement en
   production qu'en local (cold start, timeouts). Le test de bout en bout passe contre un
   SMTP factice : il faut **un envoi réel vérifié dans la boîte** avant la bascule DNS.
   Si l'OVH s'avère instable depuis Vercel, plan B : l'API HTTP de Resend, le reste du
   code ne bouge pas.
3. **`_source/uploads.tar` et le dump SQL ne sont pas dans Git** (676 Mo). Ce sont les
   seules archives complètes de la source : les copier ailleurs avant la coupure.
4. Le contenu WordPress reste extractible tant que l'instance tourne — `_source/README.md`
   documente comment rejouer toute la chaîne.
