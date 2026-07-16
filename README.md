# Grand Oral Finder

Application participative qui estime la spécialité pivot probable d’une commission du Grand oral à partir de déclarations concordantes. Le produit ne prétend pas connaître la question choisie par le jury et refuse d’afficher une tendance lorsque les données sont trop faibles ou ambiguës.

## Stack

- Next.js 16 et React 19 pour l’application web ;
- Hono et oRPC pour l’API typée ;
- Drizzle ORM et SQLite/libSQL pour la base ;
- TanStack Form, Zod et les composants shadcn/ui ;
- Bun, Turborepo et Biome.

L’ancienne application PHP reste archivée dans `legacy/php`. Ses données historiques ne sont pas importées dans la nouvelle base.

## Démarrage local

```bash
bun install
```

Copier les exemples d’environnement si les fichiers locaux n’existent pas :

```text
apps/server/.env.example -> apps/server/.env
apps/web/.env.example    -> apps/web/.env
```

Créer la base locale et appliquer les migrations :

```bash
bun run db:migrate
```

Lancer le web et l’API :

```bash
bun run dev
```

- Web : <http://localhost:3001>
- API : <http://localhost:3000>

## Base de données

En développement, `DATABASE_URL=file:./packages/db/local.db` crée un fichier SQLite ignoré par Git. Les commandes locales sont lancées depuis la racine du monorepo afin que ce chemin reste stable. En production, le compose utilise `file:/data/grand-oral.db` sur un volume persistant.

```bash
bun run db:generate  # générer une migration après un changement de schéma
bun run db:migrate   # appliquer les migrations
bun run db:studio    # ouvrir Drizzle Studio
```

Drizzle Studio est une interface locale de développement. Il ne doit pas être exposé publiquement en production.

Pour remplir la base locale avec les états de démonstration, voir [docs/test-scenarios.md](docs/test-scenarios.md) :

```bash
bun run db:seed:test
```

## Logique de rapprochement

Une recherche ne compare que les déclarations ayant les mêmes éléments :

1. centre d’examen (UAI) ;
2. session et voie ;
3. jour de passage ;
4. origine du code, officielle ou partagée ;
5. code de commission normalisé.

La déclaration courante est exclue de son propre calcul. Une tendance requiert au moins quatre autres contributions et deux voix d’écart. Les niveaux de confiance tiennent ensuite compte du nombre de pairs, du taux de présence de la spécialité dominante, de la marge et des déclarations incohérentes.

La voie technologique est enregistrable, mais ne produit pas de pronostic : son organisation peut utiliser une spécialité pivot ou deux spécialistes selon le paramétrage académique.

Le détail et les justifications sont dans [docs/matching-methodology.md](docs/matching-methodology.md).

## Accès et anti-abus

L’application ne demande ni compte, ni email, ni mot de passe. La première contribution génère une clé de récupération aléatoire de 160 bits :

- la clé brute reste dans le navigateur et peut être copiée vers un autre appareil ;
- seul son hash SHA-256 est stocké dans SQLite ;
- cette clé est obligatoire pour lire, modifier ou supprimer la déclaration ;
- aucune récupération par email n’est possible si la clé est perdue.

Une estimation n’est renvoyée qu’après création ou modification de la contribution concernée. Il n’existe pas d’endpoint public permettant d’énumérer librement les groupes. Les résultats sont des agrégats de la cohorte exacte et restent insuffisants sous quatre autres contributions.

Les garde-fous persistants sont :

- une déclaration par navigateur et par session d’examen ;
- trois créations maximum par empreinte IP sur 24 heures ;
- douze modifications maximum par déclaration sur 24 heures ;
- au moins cinq secondes entre deux modifications.

Les événements de création pseudonymisés sont conservés sept jours puis purgés automatiquement. Ils permettent au quota de rester effectif même si une déclaration est supprimée.

Une unicité stricte par IP n’est volontairement pas utilisée : plusieurs candidats peuvent partager l’IP d’un lycée, d’un foyer ou d’un opérateur mobile. L’IP n’est jamais stockée en clair ; une empreinte HMAC-SHA-256 est calculée avec `IP_HASH_SECRET`. Le jeton aléatoire du navigateur est lui aussi stocké uniquement sous forme de hash.

## Données externes

La recherche d’établissements utilise l’[Annuaire de l’Éducation nationale](https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/). Les réponses sont mises en cache en mémoire pendant 30 minutes ; les établissements déjà sélectionnés servent de repli local si le service public est momentanément indisponible.

## Vérifications

```bash
bun test
bun run check-types
bun run build
```

## Docker et Dokploy

Le compose local `docker-compose.yml` démarre `web` et `server` avec des ports publiés sur la machine. Le compose de production `compose.yaml` est destiné à Dokploy et regroupe trois services sous une seule application Compose :

- `web`, le frontend Next.js sur le port interne 3001 ;
- `server`, l’API Hono/oRPC sur le port interne 3000 ;
- `drizzle-gateway`, l’interface d’administration protégée sur le port interne 4983.

Le serveur applique les migrations Drizzle avant de démarrer. SQLite et la configuration de Drizzle Gateway utilisent des volumes persistants distincts. Aucun port hôte n’est publié par le compose de production : Dokploy et Traefik assurent seuls le routage public.

```bash
bun run docker:up
bun run docker:logs
bun run docker:down
```

En production :

- monter un volume persistant sur `/data` ;
- fournir un `IP_HASH_SECRET` aléatoire d’au moins 32 caractères ;
- fournir un `DRIZZLE_GATEWAY_MASTERPASS` fort et ne pas exposer Gateway sans contrôle d’accès ;
- renseigner les URL publiques réelles dans `CORS_ORIGIN` et `NEXT_PUBLIC_SERVER_URL` ;
- sauvegarder régulièrement le volume SQLite avec une stratégie cohérente avec le journal WAL.

Dans Dokploy, `NEXT_PUBLIC_SERVER_URL` doit être disponible pendant le build du service web, car Next.js l’intègre au bundle client. Ne conservez pas la valeur locale par défaut de `IP_HASH_SECRET` en production.

Dokploy ne propose pas de sous-dossiers de services dans un projet. La hiérarchie recommandée est `Websites` → `production` → un Compose par site. Le Compose joue donc le rôle d’unité de regroupement pour tous les services propres à Grand Oral Finder.
