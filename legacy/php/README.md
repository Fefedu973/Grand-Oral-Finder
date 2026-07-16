# Grand Oral Finder

Migration conteneurisée de l'application historique `v3/go-finder`.

## Sécurité de la migration

- Aucun identifiant de base de données n'est stocké dans Git.
- La préproduction est en lecture seule et masque les contacts par défaut.
- Les sauvegardes SQL et tabulaires restent hors du dépôt.
- Le service web écoute sur le port interne `8080` et la base n'est pas exposée.

## Développement

```bash
cp .env.example .env
docker compose up --build
```

Importer ensuite une sauvegarde vérifiée dans le service `database`. N'activez
`APP_ACCEPT_SUBMISSIONS` et `SHOW_CONTACTS` qu'après validation explicite du
cadre de publication et de la conservation des données personnelles.

Un test destructif limité à un projet Compose jetable restaure une sauvegarde,
vérifie les 1 338 lignes attendues et teste le parcours HTTP en lecture seule :

```bash
sudo ./scripts/integration-test.sh /chemin/vers/grand-oral.sql.gz
```
