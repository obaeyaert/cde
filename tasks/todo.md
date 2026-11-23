# Mise à jour contenu + audit visibilité — demande CDE de novembre 2026

> Ouvert le 2026-11-23. Source : fil Gmail « ANNULE ET REMPLACE: Mise à jour du site internet CDE »
> (thread `1a1d5bb328f2b072`), réponses point par point de Marie-Carine le 16/11 = **spec validée**.
> Le mail du 13/11 annule celui du 9/11. Relance de la cliente le 23/11.
> Audit : `~/Downloads/Audit visibilité Google + IA — cdegroupe.com.html` (8/11/2026).
> Assets : Drive public `1yS_viSS6HwsV3W9EtphA-fgtwwipgKCw` (`Logos/`, `Photos Hôtels/<HÔTEL>/`),
> listable sans auth via `https://drive.google.com/embeddedfolderview?id=<id>`,
> téléchargeable via `https://drive.google.com/uc?export=download&id=<fileId>`.

## Organisation

Branche `feat/content-update-2026-11` depuis `main`, une PR par lot (preview Vercel envoyée à
Marie-Carine avant le merge). `verify:parity` et `verify:content` comparent au WordPress d'origine :
ils signaleront les écarts **voulus** sur les pages modifiées. Mettre à jour leurs exceptions plutôt
que les ignorer.

## Lot A — Infos société (audit point 5)

- [x] Mentions légales : `R.C.S. : Nevers B 390 582 757` → `R.C.S. : Lyon B 390 582 757`
- [x] Horaires « Du lundi au vendredi, de 9 h à 17 h » : page Contact + footer
- [x] Accueil : « cinq grandes familles » → « huit grandes familles » ; liste des 8 familles du menu
      (Produits d'accueil, Mobilier d'intérieur, Mobilier d'extérieur, Art de la table, Literie,
      Accessoires de salle de bain, Linge, Tissus d'ameublement) — ajouter Literie et Linge
- [x] Vérifier toute autre mention de nombre de familles (pages, meta, `site.tagline`)

## Lot B — Réalisations (hôtels)

Rendu des rubriques : les rubriques existantes sont **conservées**, sauf « Chambre » remplacée par une
ligne détaillée « Chambres : mobilier, literie, linge, accessoires de salle de bain, produits d'accueil »
(icône lit). Nouvelles rubriques : Buffet (icône utensils), Salle de réunion – mobilier (icône phone,
comme Arawak), Restaurant, Bar, Piscine, Plage.

- [ ] **Retirer tous les liens** vers les sites d'hôtels (h4 → texte simple) sur les 4 pages `nos-clients__*`
- [ ] Supprimer Cap Est Lagoon (carte + images inutilisées) ; rééquilibrer la grille 2 colonnes (`is-first`/`is-last`)
- [ ] Renommer Guanahani → « Le Guanahani Les Airelles »
- [ ] Guadeloupe : Créole Beach, Fleur d'Épée (+ Chambres détaillées, Buffet, Salle de réunion – mobilier) ;
      Arawak (+ Chambres détaillées) ; Salako (+ Chambres détaillées, Buffet)
- [ ] Martinique : Sainte-Luce (+ Buffet, Chambres détaillées) ; Carayou (+ Chambres détaillées)
- [ ] Saint-Martin : Porto Cupecoy → Chambres : linge, accessoires de salle de bain, produits d'accueil
- [ ] Réunion : Lux (Buffet ; Chambres : mobilier, literie, acc. SDB) ; Le Récif (Buffet ; Chambres : literie, acc. SDB) ;
      Tropic Appart (Chambres : literie, linge, acc. SDB, produits d'accueil) ; Papangue (Chambres : literie, linge)
- [ ] Nouveaux hôtels (photos Drive, recadrées 800×450 + variantes WebP via `npm run optimize:images`) :
  - [ ] Guadeloupe – Le Rayon Vert (4 photos) : Piscine ; Chambres : mobilier, linge
  - [ ] Martinique – Le Courbaril (2) : Chambres : linge, acc. SDB, produits d'accueil
  - [ ] Martinique – Le Simon (3) : Chambres : linge, acc. SDB, produits d'accueil
  - [ ] Martinique – Le Bambou (3) : Plage
  - [ ] Martinique – Karibea Valmenière (1 seule photo → image fixe, pas de slider) : Chambres : mobilier, literie, acc. SDB, produits d'accueil ; Restaurant ; Bar
  - [ ] Martinique – Karibea Squash (3) : idem Valmenière
- [ ] Texte alternatif sur toutes les images des pages Réalisations (« Hôtel X, Île – espace »)

## Lot C — Marques (`marques-partenaires.md`)

- [ ] Supprimer la rubrique « Divers »
- [ ] Petit matériel d'exploitation : + Garcia de Pou (garciadepou.com/fr/), Chilewich, Peugeot, Bartscher (bartscher.com/int/fr/). L2G abandonné
- [ ] Renommer « LINGE, TISSUS D'AMEUBLEMENT & LITERIE » → « LINGE, TISSUS, LITERIE & ACCESSOIRES HÉBERGEMENT » ;
      − Hilden ; + Deren (deren.fr), Artalys (artalys-france.fr), Caddie, Rubbermaid (vepabins.nl/fr), Technomax (technomax.it)
- [ ] Mobilier : − Manutti, − Gervasoni ; + Serralunga, Flexmob, Contral (contral.it/fr), Caneline (cane-line.fr), Pottery Pots (potterypots.com/fr-eu/)
- [ ] Luminaires : + Lucide (lucide.com/fr/)
- [ ] Matériel de buffet : + APS **en premier** (aps-germany.fr)
- [ ] Vaisselle : + Lebrun (lebrun.fr/shop-pro/)
- [ ] Accessoires SDB : + Creactive Paris (creactive-paris.fr)
- [ ] Bon Bistro → finediningandliving.eu/fdl_en/
- [ ] Nettoyer les paramètres de tracking des URL fournies (`gad_source`, `gbraid`, `srsltid`…)
- [ ] Logos Drive (`Logos/Logo <MARQUE>.*`) → format et gabarit des logos existants
- [ ] Liens morts relevés par l'audit (britop, talentisrl, sayl, matfer in-situ) : corriger si l'URL actuelle se trouve, sinon logo sans lien
- [ ] `alt="Logo <Marque>"` sur les 69 logos

## Lot D — Audit visibilité (points 1, 3, 4)

- [ ] **Point 1** — JSON-LD Organization dans `Base.astro`/`site.ts` : alternateName, legalName,
      description, foundingDate 1993-03-08, vatID, openingHoursSpecification (lun-ven 9-17), areaServed, knowsAbout.
      `sameAs` : LinkedIn CDE (connu) ; fiche Google à ajouter quand Marie-Carine l'aura (point 2, chez elle)
- [ ] **Point 3** — `public/llms.txt` (texte de l'audit, relu : marques citées vérifiées présentes sur le site,
      8 familles, pas de mention W4W)
- [ ] **Point 4** — titre d'accueil « CDE Groupe : équipement hôtelier, France et outre-mer » ;
      descriptions ≤ 155 car. sur **les 21 pages** (6 fournies par l'audit, 15 à rédiger) ;
      ajouter un contrôle de longueur dans `verify:seo`

## Lot E — Contrôle périodique des liens (validé par la cliente)

- [ ] Workflow GitHub Actions hebdomadaire : liens externes du site construit, rapport en issue si lien cassé
      (tolérer les 403 anti-bot des grands sites)

## Clôture

- [ ] `npm run check` + `npm run verify` + contrôle visuel des pages modifiées (desktop + 390 px)
- [ ] CHANGELOG daté
- [ ] Mail à Marie-Carine : lien de preview, récap, réponse sur le référencement
      (effets à 30 jours, revérification le 8/12)

---

# Migration cdegroupe.com — WordPress/Lightsail → Astro/Vercel

> **Bascule DNS faite le 12/09/2026 à 17h26.** Le site est en production sur Vercel.
> Reste le décommissionnement du Lightsail, à partir du 12/10/2026.

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

### ✅ Bascule — faite le 12/09/2026

Zone `docs/dns/zone-vercel.txt` appliquée chez OVH. Apex et `www` en A vers `216.150.1.1` et
`216.150.16.1` ; messagerie inchangée. Le certificat a mis **3 min 40 s** à être émis, pendant
lesquelles `www` renvoyait `ERR_CONNECTION_CLOSED` — fenêtre annoncée et sans autre conséquence.

Vérifié après bascule : **16/16 contrôles** (`npm run verify:dns`), les 21 pages en 200 (TTFB
~70 ms), apex → `www` en 301, redirections héritées, MX et TXT intacts, et **un envoi réel du
formulaire depuis `https://www.cdegroupe.com/`** (HTTP 200 en 2,8 s).

Vercel émet **un certificat par nom**. Le contrôle initial les confondait (`includes()` :
`cdegroupe.com` est une sous-chaîne de `www.cdegroupe.com`), ce qui a masqué l'absence de
certificat sur l'apex pendant quelques minutes — corrigé (PR #5).

#### Reste à faire

- [ ] **Search Console** : soumettre `https://www.cdegroupe.com/sitemap-index.xml` et demander la
      validation des erreurs **5xx du 06/09** (panne WordPress, réglée par la bascule).
- [ ] Vérifier qu'un message du formulaire arrive bien dans `contact@cdegroupe.com` (voir ci-dessous).
- [ ] Supprimer les quatre TXT `_acme-challenge` : reliquats Let's Encrypt du Lightsail, désormais
      sans objet (Vercel gère ses propres certificats).
- [ ] `ftp IN CNAME cdegroupe.com.` pointe maintenant sur Vercel et ne répond plus en FTP.
      Sans conséquence, à supprimer au décommissionnement.

### ⬜ À traiter séparément — délivrabilité du formulaire

Configuration constatée : la **réception** passe par Google Workspace (`MX smtp.google.com`),
l'**envoi** du formulaire par OVH (`SMTP_HOST=ssl0.ovh.net`, boîte `contact@cdegroupe.com`).

Le SPF est `v=spf1 include:_spf.google.com ~all` : il n'autorise que Google, donc les envois
via OVH sont en **softfail**. DMARC est en `p=none`, rien n'est rejeté ; et le domaine a des
clés DKIM OVH (`ovhmo3910032-selector1/2`) qui, si OVH signe les messages, suffisent à valider
DMARC par alignement DKIM. C'est probablement pourquoi les mails passent aujourd'hui.

**Antérieur à la migration** : WordPress utilisait déjà ce même SMTP.

- [ ] Vérifier qu'un mail du formulaire arrive bien dans `contact@cdegroupe.com`, et regarder
      l'en-tête `Authentication-Results` : si `dkim=pass`, rien à faire.
- [ ] Si `dkim=fail` ou mail en indésirables : ajouter OVH au SPF →
      `v=spf1 include:_spf.google.com include:mx.ovh.com ~all` (la limite de 10 lookups DNS
      reste très loin).

## ⬜ Phase 7 — Décommissionnement — **pas avant le 12/10/2026**

- [ ] **Attendre 30 jours** de production Vercel stable (bascule le 12/09).
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
