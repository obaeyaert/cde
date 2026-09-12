# Lightsail : sécuriser puis décommissionner

Le site est en production sur Vercel depuis le 12/09/2026. L'instance Lightsail
`35.181.237.158` ne sert plus qu'au rollback, jusqu'au **12/10/2026**.

Console : **https://lightsail.aws.amazon.com/** (région Paris, `eu-west-3`).

## Ce qui n'est pas possible

**Downscaler l'instance.** Elle est en nano (512 Mo / 20 Go), le plus petit plan Lightsail —
il n'y a rien en dessous. Lightsail ne permet de toute façon que de passer à un plan **plus
grand**, jamais l'inverse.

**Arrêter l'instance pour payer moins.** Contrairement à EC2, Lightsail facture le plan tant
que l'instance existe, allumée ou éteinte. Un `Stop` ne fait économiser aucun euro — mais il
reste le meilleur geste pour la sécurité, voir l'étape 1.

---

## Étape 0 — mettre les archives à l'abri (prérequis)

`_source/uploads.tar` (671 Mo) et `_source/db-cdegroupe-20260905.sql.gz` (4 Mo) sont les seules
copies complètes de la source. Elles ne sont **ni dans Git ni ailleurs que sur le poste**.

Avant toute opération destructive, les copier sur un disque externe ou un stockage tiers
(hors AWS, pour ne pas dépendre de ce qu'on décommissionne) :

```sh
cp ~/Code/perso/cde/_source/uploads.tar \
   ~/Code/perso/cde/_source/db-cdegroupe-20260905.sql.gz \
   /media/olivier/<disque>/archives-cdegroupe/
```

---

## Étape 1 — arrêter l'instance (recommandé)

Aujourd'hui `https://35.181.237.158/wp-login.php` répond **200** : la page de connexion d'un
WordPress sur PHP 8.1 et Debian 11, tous deux en fin de vie, avec 24 extensions que plus
personne ne met à jour. Sa base contient **en clair** le mot de passe SMTP de
`contact@cdegroupe.com` : une compromission permettrait d'envoyer du courrier depuis le domaine.

Une instance arrêtée ne répond plus à rien — ni HTTP, ni SSH. C'est plus radical que de fermer
des ports, et tout aussi réversible.

1. Console Lightsail → onglet **Instances**.
2. Menu **⋮** sur la vignette de l'instance (ou ouvrir l'instance, bouton **Stop** en haut).
3. **Stop**, puis confirmer.
4. Attendre le statut **Stopped** (environ une minute).

L'IP statique **reste attachée et réservée** pendant l'arrêt, et n'est pas facturée en plus.
Le coût du plan, lui, continue de courir : l'arrêt ne fait pas économiser, il sécurise.

Vérification depuis le poste — la première doit échouer, la seconde rester en 200 :

```sh
curl -m 10 -o /dev/null -w '%{http_code}\n' https://35.181.237.158/    # doit échouer
curl -m 10 -o /dev/null -w '%{http_code}\n' https://www.cdegroupe.com/ # doit rester 200
```

**Rollback** : bouton **Start**, compter une à deux minutes le temps qu'Apache et MariaDB
remontent, puis appliquer `docs/dns/zone-rollback-lightsail.txt` chez OVH. Au total trois à
quatre minutes.

> Attention au redémarrage : l'instance a 512 Mo et php-fpm y lance six workers. C'est
> exactement ce qui avait tué MariaDB le 27/08. Après un `Start`, vérifier que le site répond
> avant de repointer le DNS.

### Variante : garder l'instance allumée mais fermer les ports

Si l'on préfère pouvoir consulter l'ancien site à tout moment, on peut la laisser tourner et
restreindre le pare-feu : Instance → **Networking** → **IPv4 Firewall** → supprimer les règles
**HTTP (80)** et **HTTPS (443)**, garder **SSH (22)** (idéalement restreint à son IP via
« Restrict to IP address », `curl -s ifconfig.me` donne l'adresse). Rollback en 30 secondes,
mais la machine reste allumée et joignable en SSH.

## Étape 2 — économiser (optionnel) : snapshot puis suppression

Gain réel : environ **4,60 $/mois**. Le stockage d'un snapshot coûte 0,05 $/Go/mois, soit ~0,40 $
pour les 8 Go utilisés, contre ~5 $ pour l'instance. En contrepartie, le rollback passe de
**une minute** (changer le DNS) à **une quinzaine de minutes** (restaurer le snapshot, obtenir
une IP, adapter la zone).

Tant que la période de rétention court, ce n'est pas le geste à faire en premier : l'étape 1
traite le vrai risque, gratuitement, et garde un rollback de trois minutes.

Un snapshot se crée aussi bien sur une instance arrêtée que démarrée.

### 2a. Créer le snapshot

1. Instance → onglet **Snapshots**.
2. **Create snapshot**, le nommer par exemple `cde-wordpress-final-2026-09-12`.
3. Attendre le statut **Available** (10 à 20 minutes pour 20 Go). Ne rien supprimer avant.

### 2b. Traiter l'IP statique

L'IP `35.181.237.158` a survécu au redémarrage du 05/09 : c'est donc une **IP statique attachée**.

- Dans **Networking**, une IP statique non attachée à une instance est **facturée** par AWS
  (mécanisme anti-rétention). La garder détachée n'a aucun intérêt.
- Le rollback n'a **pas besoin de cette IP précise** : il consistera à restaurer le snapshot,
  qui recevra une nouvelle adresse, puis à adapter `docs/dns/zone-rollback-lightsail.txt`
  en y remplaçant `35.181.237.158`.
- Donc : **libérer l'IP statique** (Networking → l'IP → **Delete**) au moment de supprimer
  l'instance.

### 2c. Supprimer l'instance

1. Instance → menu **⋮** en haut à droite → **Delete**.
2. Confirmer. Le snapshot, lui, est conservé.

### 2d. Si un rollback devient nécessaire

1. Snapshots → le snapshot → **Create new instance**.
2. Choisir la région `eu-west-3`, le plan nano.
3. Relever la nouvelle IP publique.
4. Reprendre `docs/dns/zone-rollback-lightsail.txt` en remplaçant `35.181.237.158` par cette
   nouvelle IP, puis l'appliquer chez OVH.

---

## Étape 3 — le 12/10/2026, fin de la rétention

- [ ] Confirmer que Vercel n'a pas eu d'incident depuis un mois.
- [ ] Archives vérifiées hors AWS (étape 0).
- [ ] Supprimer l'instance **et** le snapshot **et** l'IP statique.
- [ ] Supprimer `ftp IN CNAME cdegroupe.com.` de la zone OVH : il pointe désormais sur Vercel
      et ne répond plus en FTP.
- [ ] Supprimer les quatre TXT `_acme-challenge` (défis Let's Encrypt du Lightsail).
- [ ] La boîte OVH `contact@cdegroupe.com` **reste en service** : le formulaire s'en sert.
