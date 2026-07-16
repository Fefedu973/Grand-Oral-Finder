# Scénarios de démonstration

Le seed local est idempotent et remplace uniquement les déclarations dont les identifiants sont réservés aux démonstrations.

```bash
bun run db:seed:test
```

Il refuse de s’exécuter en production ou sur une URL qui ne contient pas `local.db`, sauf dérogation explicite `ALLOW_TEST_SEED=1`.

## Clés de récupération

```text
Indice fort  : GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAB
Ambigu       : GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAC
Insuffisant  : GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAD
Non supporté : GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAE
```

Importez ces clés dans « Mes déclarations » pour tester la lecture, la modification et la suppression sans compte.

## Contributions et résultats

| État | Centre | Jour | Origine | Code | Voie | Paire à saisir |
| --- | --- | --- | --- | --- | --- | --- |
| Indice fort | Aux Lazaristes Fourvière | 24/06/2026 | Officielle | 0421 | Générale | Mathématiques / Physique-chimie |
| Ambigu | Aux Lazaristes Croix-Rousse | 25/06/2026 | Officielle | 0577 | Générale | Mathématiques / Physique-chimie |
| Insuffisant | Louis-le-Grand | 26/06/2026 | Officielle | 0999 | Générale | Mathématiques / Physique-chimie |
| Non supporté | Victor Hugo Paris | 27/06/2026 | Partagée | T004 | STMG | Management / Droit-économie |

La soumission du formulaire crée une déclaration et affiche immédiatement l’état correspondant. Utilisez une base locale réinitialisée avant de répéter les scénarios, car les créations sont volontairement limitées par navigateur et par empreinte IP.
