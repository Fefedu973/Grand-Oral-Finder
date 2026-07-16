# Méthode de rapprochement

## Ce qui est établi

Le ministère indique que le candidat présente deux questions et que le jury en choisit une. En voie générale, ces questions peuvent être liées chacune à une spécialité ou être transversales aux deux spécialités.

L’aide officielle de l’application IMAG’IN décrit, pour le baccalauréat général, des commissions comportant sauf exception une spécialité pivot fournie par Cyclades. Un examinateur est compétent dans cette spécialité et le second est généralement un intervenant généraliste ou un spécialiste d’une autre discipline.

Sources :

- [Déroulement du Grand oral](https://www.education.gouv.fr/reussir-au-lycee/baccalaureat-comment-se-passe-le-grand-oral-100028)
- [Présentation du Grand oral sur Éduscol](https://eduscol.education.gouv.fr/5661/presentation-du-grand-oral)
- [Affectation collective des commissions dans IMAG’IN](https://si2d.ac-montpellier.fr/imagin/ressources/imagin/aide/AffectationCollectiveForm.html)
- [Paramétrage du Grand oral technologique dans IMAG’IN](https://si2d.ac-montpellier.fr/imagin/ressources/imagin/aide/ParamsAffectationGO.html)

## Hypothèse exploitée

Si plusieurs candidats réellement affectés à la même commission déclarent des paires de spécialités différentes, la spécialité présente dans une forte majorité de ces paires est un indice sur la spécialité pivot de la commission.

Cette hypothèse ne permet pas de connaître la question choisie :

- le jury reste libre de choisir l’une des deux questions ;
- une question peut être transversale ;
- une commission peut être modifiée ou un juré remplacé ;
- une déclaration peut être erronée ;
- le numéro de commission peut être absent de certaines convocations.

## Clé de regroupement

Les codes ne sont pas supposés uniques à l’échelle nationale. Une cohorte est donc identifiée par :

```text
centre UAI
+ année de session
+ voie et série
+ jour de passage
+ origine du code
+ code normalisé
```

L’heure est conservée pour l’utilisateur, mais n’entre pas dans le score. Le code est normalisé en majuscules, sans espaces ni séparateurs, et un préfixe `COM` éventuel est retiré.

Les codes officiels et les codes partagés ne sont jamais mélangés, même si leur texte est identique.

## Score

Pour chacune des deux spécialités du candidat, le moteur compte le nombre de pairs dont la paire contient cette spécialité. Une déclaration ne peut compter qu’une fois par spécialité.

Le moteur calcule ensuite :

- `sampleSize` : nombre d’autres candidats du groupe ;
- `support` : nombre et proportion de pairs contenant chaque spécialité ;
- `margin` : différence entre les deux supports ;
- `outlierCount` : pairs ne partageant aucune des deux spécialités du candidat.

La déclaration qui déclenche le calcul est exclue. Cela empêche une contribution de créer seule sa propre confirmation.

## Décision

Le moteur ne produit aucune tendance avec moins de quatre pairs. Il reste également silencieux si la spécialité dominante possède moins de quatre soutiens, moins de 50 % de couverture ou moins de deux voix d’écart. Ce seuil réduit également le risque d’inférer les réponses d’un très petit groupe.

Lorsqu’une tendance existe :

| Niveau | Conditions principales |
| --- | --- |
| Faible | Seuil minimal satisfait |
| Modéré | Au moins 4 pairs, 70 % de couverture, marge relative de 35 %, au plus 25 % d’incohérences |
| Plus solide | Au moins 6 pairs, 80 % de couverture, marge relative de 50 %, au plus 15 % d’incohérences |

Ces seuils sont volontairement conservateurs. Ils ne constituent pas une probabilité statistique calibrée. Le libellé « confiance » décrit uniquement la cohérence des données disponibles.

## Voie technologique

IMAG’IN permet selon les académies une commission avec spécialité pivot et généraliste, ou deux spécialistes. Les deux questions technologiques s’appuient par ailleurs sur l’étude approfondie ou le projet. La version actuelle ne produit donc aucun pronostic pour cette voie au lieu d’appliquer abusivement le modèle de la voie générale.

## Validation future

Après chaque session, un échantillon volontaire peut comparer l’estimation affichée à la spécialité effectivement représentée dans le jury, sans enregistrer la note ni la question personnelle. Ces retours permettraient de mesurer :

- précision par niveau de confiance ;
- fréquence des changements de jury ;
- stabilité des codes selon les académies ;
- pertinence du regroupement par jour ;
- seuils à relever ou abaisser.

Sans cette calibration, le produit doit continuer à employer les termes « indice » et « spécialité pivot probable », jamais « certitude » ou « probabilité de tomber sur un sujet ».

## Contrôle d’accès

Le résultat n’est pas disponible par une recherche publique indépendante. Il est calculé uniquement après la création ou la mise à jour d’une déclaration pour la cohorte exacte. La clé privée de la déclaration autorise ses lectures et mutations ultérieures ; la base n’en conserve que le hash.

Le mécanisme limite le spam, mais ne prouve pas l’identité scolaire du déclarant. Un utilisateur peut toujours fournir de fausses informations. Les limites par navigateur et par empreinte IP, le seuil de quatre pairs et l’absence de données brutes rendent cette attaque plus coûteuse et moins informative sans collecter d’identité civile.
