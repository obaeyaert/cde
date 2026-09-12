# Bascule DNS de cdegroupe.com vers Vercel

Procédure opérationnelle. Le site Astro est en production sur Vercel depuis le 07/09 ; il ne
reste qu'à faire pointer le domaine dessus. **Deux enregistrements changent, rien d'autre.**

- Zone à appliquer : [`dns/zone-vercel.txt`](dns/zone-vercel.txt)
- Zone de retour arrière : [`dns/zone-rollback-lightsail.txt`](dns/zone-rollback-lightsail.txt)

## Ce qu'il faut savoir avant

Le TTL est à **60 secondes** : la propagation comme le rollback prennent une minute.

Il y aura **1 à 3 minutes pendant lesquelles HTTPS peut échouer** sur `www`, le temps que Vercel
obtienne son certificat. C'est inévitable : Vercel refuse de l'émettre à l'avance tant que le
domaine ne pointe pas déjà chez lui (`http_pretest_domain_not_resolving_to_vercel_error`).
Choisir un moment creux.

`www` porte déjà un `MX` et deux `TXT`. Un CNAME y est donc **interdit** (RFC 1034 : un CNAME ne
peut pas cohabiter avec d'autres types sur le même nom). D'où le choix de deux enregistrements
`A`, qui ne touchent à rien d'autre.

## 1. Lancer la surveillance

Dans un terminal, **avant** de modifier quoi que ce soit :

```sh
cd ~/Code/perso/cde && npm run watch:dns
```

Une ligne toutes les 15 secondes. Le script s'arrête seul quand la bascule est complète.

## 2. Modifier la zone chez OVH

**https://www.ovh.com/manager/** → Web Cloud → Noms de domaine → `cdegroupe.com` → **Zone DNS**.

### Option 1 — éditeur texte (recommandé)

« Modifier en mode textuel », tout sélectionner, remplacer par le contenu de
[`dns/zone-vercel.txt`](dns/zone-vercel.txt), valider.

Si OVH refuse à cause du numéro de série du SOA, l'incrémenter de 1 (`2088938106` → `2088938107`).
En général OVH s'en charge.

### Option 2 — interface graphique

Quatre gestes, en commençant par `www` (c'est l'URL publique ; l'apex ne fait que rediriger
dessus, donc dans cet ordre il n'y a jamais d'état incohérent) :

| # | Geste | Détail |
|---|---|---|
| 1 | Modifier | ligne `www` type **A** → cible `216.150.1.1`, TTL 60 |
| 2 | Ajouter | type **A**, sous-domaine `www`, cible `216.150.16.1`, TTL 60 |
| 3 | Modifier | ligne **apex** type **A** (sous-domaine vide, affichée `cdegroupe.com`) → `216.150.1.1` |
| 4 | Ajouter | type **A**, sous-domaine **vide**, cible `216.150.16.1`, TTL 60 |

Deux lignes A par nom, c'est voulu : Vercel répond sur les deux.
Cliquer sur **« Appliquer la configuration »** si le bandeau apparaît.

Valeurs de repli si Vercel change ses IP : `76.76.21.21` sur les deux noms.

## 3. Ne toucher à rien d'autre

Toute la messagerie du domaine vit dans cette zone et n'a **aucun rapport** avec l'hébergement
du site. Laisser strictement intacts :

`MX 1 smtp.google.com` (apex et `www`) · SPF · DMARC · les deux `google-site-verification` ·
`google._domainkey` · `ovhmo3910032-selector1/2._domainkey` · les SRV `_imaps`, `_submission`,
`_autodiscover` · les CNAME `imap`, `pop3`, `smtp`, `mail`, `autoconfig`, `autodiscover`.

Le contrôle de l'étape 4 vérifie explicitement que MX et TXT sont toujours là.

## 4. Vérifier

```sh
npm run verify:dns
```

15 contrôles : où pointent les deux noms, MX et TXT intacts, certificat et sa couverture,
apex → `www` en 301, les 21 pages, la 404, un échantillon de redirections, et si la réponse
vient bien de Vercel.

Si HTTPS reste en échec au-delà de 5 minutes :
https://vercel.com/achille84-2184s-projects/cde/settings/domains — l'état d'émission y est
affiché, avec un bouton pour relancer.

## 5. Rollback

Recoller [`dns/zone-rollback-lightsail.txt`](dns/zone-rollback-lightsail.txt) : c'est la zone
d'origine, à l'identique. Effectif en 60 secondes. Le Lightsail reste allumé et fonctionnel —
**il ne doit pas être éteint avant 30 jours de production stable**.

## Après la bascule

- [ ] **Search Console** : soumettre `https://www.cdegroupe.com/sitemap-index.xml`, puis demander
      la validation des erreurs **5xx signalées le 06/09** (elles viennent de la panne WordPress,
      la bascule les règle).
- [ ] **Délivrabilité du formulaire** : vérifier qu'un message arrive bien dans
      `contact@cdegroupe.com` et regarder l'en-tête `Authentication-Results`. Si `dkim=pass`,
      rien à faire. Sinon, ajouter OVH au SPF :
      `v=spf1 include:_spf.google.com include:mx.ovh.com ~all`.
      L'envoi passe par `ssl0.ovh.net` alors que le SPF n'autorise que Google — situation
      antérieure à la migration, WordPress utilisait déjà ce SMTP.
- [ ] **Une fois le certificat Vercel émis** : supprimer les quatre TXT `_acme-challenge`,
      reliquats des défis Let's Encrypt du Lightsail.
- [ ] `ftp IN CNAME cdegroupe.com.` suivra l'apex vers Vercel et ne répondra plus en FTP. Sans
      conséquence, à supprimer au décommissionnement.
