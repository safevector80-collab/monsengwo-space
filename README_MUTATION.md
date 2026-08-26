# Monsengwo Space V2 — remplacement direct

Cette édition conserve l’architecture de production : HTML, CSS, JavaScript natif, Supabase JS, Supabase Auth et PostgreSQL. Les URLs existantes restent valides sur GitHub Pages.

## Ordre obligatoire

1. Télécharger une sauvegarde du dépôt GitHub et exporter les quatre tables Supabase.
2. Dans Supabase SQL Editor, exécuter `supabase/migrations/001_mutation_v2_non_destructive.sql`.
3. Exécuter `supabase/verification/verify_mutation_v2.sql`. Les totaux attendus avant nouvelle activité sont : 7 activités, 2 inscriptions, 1 profil et 1 programme. `normalisation_incomplete` et `doublons_reels` doivent valoir 0.
4. Envoyer le contenu du projet sur une branche `v2-test` du dépôt GitHub.
5. Tester l’inscription, la connexion comité, l’affichage des activités, le programme, l’archivage et la gestion des profils.
6. Fusionner `v2-test` vers `main` seulement après validation.

## Configuration

`js/supabaseClient.js` conserve la clé publique existante. Une clé `service_role` ne doit jamais être ajoutée au dépôt ou au navigateur.

## Changements de données

- Les tables existantes et leurs lignes ne sont pas recréées.
- Les colonnes V2 sont ajoutées avec des valeurs par défaut compatibles.
- La normalisation nom/classe devient automatique par trigger.
- L’inscription passe par `register_inscription_v2`, qui verrouille l’activité et empêche le dépassement de capacité.
- Les suppressions courantes deviennent des archivages.
- Les actions sensibles sont consignées dans `audit_logs`.
- Les profils désactivés perdent immédiatement leurs droits.

## Retour arrière

Le script `supabase/rollback/rollback_v2_before_production.sql` est uniquement destiné à un test sans nouvelles données V2. Après une utilisation réelle, restaurer la sauvegarde plutôt que supprimer les colonnes.

## Déploiement GitHub Pages

Les fichiers doivent rester à la racine du dépôt : `index.html`, `activites.html`, `inscription.html`, `programme.html`, `merci.html`, puis `admin`, `assets`, `js` et `supabase`. Aucun `npm install` ni build n’est requis.
