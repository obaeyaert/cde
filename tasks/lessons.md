# Leçons

## 2026-11-23 — Relire le brouillon réel avant d'expliquer son contenu

« C'est quoi ce lien Google dans le mail ? » visait les liens `https://www.google.com/url?q=…`
de l'historique cité (Gmail réécrit les liens des messages qu'il cite), pas la fiche Google
mentionnée dans le texte. J'ai répondu de mémoire sur ce que j'avais rédigé.

**Règle** : quand Olivier interroge un élément d'un brouillon ou d'un fichier, relire l'objet
réel en entier (y compris l'historique cité d'un mail) avant de répondre, et citer l'extrait
visé. En cas de doute entre deux lectures, demander laquelle.

**Prévention** : un brouillon en réponse (`replyToMessageId`) embarque l'historique cité avec
ses liens réécrits par Gmail : le signaler en livrant le brouillon.

## 2026-11-23 — L'intégration Gmail réécrit toutes les URL des brouillons

Toute URL écrite par l'outil `create_draft` / `update_draft` (lien HTML, URL en clair, même
sans `https://`) est enregistrée sous forme de redirection `https://www.google.com/url?q=…`.
Olivier a voulu la nettoyer à la main et a cassé le lien (le suffixe `&source=gmail&ust=…`
est resté collé à l'adresse).

**Règle** : ne jamais mettre d'URL dans un brouillon Gmail créé par l'outil. Mettre un repère
`>>> COLLER LE LIEN … ICI <<<` et donner l'URL propre à Olivier pour qu'il la colle dans Gmail.
Relire le brouillon (`get_draft`) après chaque écriture.
