# Migration cdegroupe.com — WordPress/Lightsail → Astro/Vercel

> État au 2026-09-12. Phases 1 à 5 terminées et vérifiées ; production Vercel en place.
> Reste la bascule DNS (2 enregistrements à changer chez OVH) puis le décommissionnement.

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
| Fidélité visuelle desktop (07/09, prod Vercel vs WP) | hauteurs à **±1,7 %** sur 21 pages (marques −3,6 %) |
| Fidélité visuelle mobile 390 px (07/09) | **±4,4 %**, contact +1 px |
| Redirections héritage WordPress (PR #3) | 76 règles 301 : shortlinks `/?p=`, `/wp-content/uploads/*`, index.php, feeds, archives ; 0 boucle |
| TTFB (07/09) | 253 ms (WordPress) → **67 ms** (Vercel) |
| Poids d'une page type | 2,2 Mo → **~125 Ko** |
| Médias | 676 Mo → **30 Mo** |

Rejouer : `npm run verify`, `npm run verify:visual` (+ `npm run verify:contact` avec `npm run dev` en cours).

---

## ⬜ Phase 6 — Déploiement et bascule

### ✅ Fait

- [x] Dépôt GitHub https://github.com/obaeyaert/cde, app Vercel installée, `git connect` actif :
      push sur une branche = préversion, merge dans `main` = production.
- [x] Projet Vercel `cde` (équipe `achille84-2184s-projects`), framework Astro, Node 24.
      **Forfait Pro** depuis le 12/09 — l'usage commercial est désormais couvert par les CGU.
- [x] Variables `SMTP_*` posées (Preview + Production). Mot de passe OVH actuel conservé,
      décision d'Olivier.
- [x] **Envoi réel testé** depuis Vercel le 06/09 : HTTP 200 en 4 s, les deux mails partis.
- [x] Recette complète le 07/09 : redirections, en-têtes, sitemap, canonicals, TTFB,
      fidélité visuelle desktop et mobile.
- [x] PR #1 (migration), #2 (setup Vercel), #3 (76 redirections héritage + fidélité mobile)
      mergées. Production = `main` c2ff74d.
- [x] Domaines `cdegroupe.com` et `www.cdegroupe.com` ajoutés au projet Vercel le 12/09,
      apex configuré pour rediriger vers `www` en 301. Sans effet tant que le DNS pointe
      sur le Lightsail.
- [x] TTL DNS : **déjà à 60 s**, rien à abaisser, la propagation sera quasi immédiate.

### ⬜ Bascule — à faire chez OVH (zone DNS de `cdegroupe.com`)

Deux enregistrements à modifier, **et rien d'autre** :

| Nom | Type actuel | Valeur actuelle | Nouveau type | Nouvelle valeur |
|---|---|---|---|---|
| `cdegroupe.com` (apex) | A | `35.181.237.158` | A | `216.150.1.1` **et** `216.150.16.1` |
| `www` | A | `35.181.237.158` | CNAME | `2ba8bcd097c37565.vercel-dns-017.com.` |

Valeurs de repli si besoin : apex `76.76.21.21`, www `cname.vercel-dns.com.`

- [ ] **Ne toucher ni aux MX (Google Workspace), ni aux TXT (SPF, DMARC, vérifications),
      ni au DKIM `google._domainkey`.** La messagerie ne doit pas bouger.
- [ ] Après changement : `npm run verify:dns` (15 contrôles : DNS, MX/TXT intacts,
      certificat, apex → www, 21 pages, 404, redirections, en-tête Vercel).
- [ ] Vérifier que Vercel a émis le certificat (quelques minutes après la propagation).
- [ ] Search Console : soumettre le sitemap, surveiller couverture et 404 pendant 2 semaines.

**Rollback** : remettre les deux enregistrements A sur `35.181.237.158`. Le Lightsail reste
allumé et fonctionnel, la propagation prend 60 s.

### ⬜ À traiter séparément — délivrabilité du formulaire

Le SPF du domaine est `v=spf1 include:_spf.google.com ~all` : il n'autorise que Google.
Or le formulaire envoie via `ssl0.ovh.net`. Les notifications partent donc en **softfail SPF**
(DMARC est en `p=none`, elles ne sont pas rejetées mais peuvent tomber en indésirables).

**Le problème est antérieur à la migration** — WordPress utilisait déjà ce SMTP. À corriger :

- [ ] Vérifier si les mails du formulaire arrivent en boîte de réception ou en spam.
- [ ] Si spam : ajouter OVH au SPF → `v=spf1 include:_spf.google.com include:mx.ovh.com ~all`
      (un seul `include` supplémentaire, la limite de 10 lookups est loin d'être atteinte).

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
5. **Ne pas toucher aux MX/TXT/DKIM** pendant la bascule : la messagerie de `cdegroupe.com`
   est sur Google Workspace et n'a rien à voir avec l'hébergement du site.
