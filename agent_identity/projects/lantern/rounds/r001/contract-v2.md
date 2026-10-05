# Contrat de design — Lantern
Version : 2 ; statut : prêt pour revue utilisateur, validation globale à venir.
Les intentions utilisateur ci-dessous sont explicites ; les critères d'évaluation sont
des propositions de l'agent. Aucune forme, palette ou métaphore visuelle n'est choisie.
Sources U : answers-01.md et answers-02.md ; R : sources/README.md ; PS/RS/GV/PQ : spécifications copiées
sous rounds/r001/sources/agent_wiki/specs/. Tous ces chemins sont relatifs à r001.

| ID | Clause et statut de la source | Condition d'évaluation proposée |
|---|---|---|
| C01 | Couvrir favicon, identité d'app et compagnon animé. Exigence initiale utilisateur. | Comparer les trois usages côte à côte ; invariants reconnaissables et simplifications documentées. |
| C02 | Servir un espace de pensée avec l'IA où l'utilisateur apprend et raisonne activement. Fait produit R/PS. | Les choix se justifient par ce rôle et restent pertinents au-delà de Learn. |
| C03 | Évoquer la curiosité. Intention U. | L'utilisateur juge l'identité invitante à explorer. |
| C04 | Évoquer la rigueur. Intention U. | La présence paraît attentive et fiable, compatible avec un travail exigeant. |
| C05 | Évoquer l'ouverture d'esprit. Intention U. | La présence paraît réceptive à des pistes et points de vue divers. |
| C06 | Éviter le repoussant et l'élitisme. Limites U. | L'utilisateur peut identifier et éliminer ce qui crée rejet ou distance sociale/intellectuelle. |
| C07 | Être un guide sympathique, mignon, intelligent, expressif et joueur, sans être perturbateur. Intention U confirmée. | Jugement utilisateur sur ces qualités ; la retenue contextuelle ne supprime pas le potentiel expressif. |
| C08 | Garder le même compagnon entre les rooms, avec des adaptations légères. Décision U. | Comparaison inter-room : même identité reconnaissable ; variations subordonnées aux invariants. |
| C09 | Être toujours disponible et pouvoir se faire oublier, immobile ou masqué par l'utilisateur. Décision U. | Vérifier les états visible, immobile et masqué ; le retour reste accessible et ne s'impose pas spontanément. Ce dernier détail est un critère agent proposé. |
| C10 | Rester calme lorsque le contexte l'exige, notamment pendant l'apprentissage, tout en rendant l'usage plaisant et captivant ailleurs. Limite U. | Simulation lecture/réflexion : posture immobile possible, sans geste décoratif attirant l'attention ; transitions exactes à définir en motion grammar. |
| C11 | Être en accord avec l'esprit de Lantern. Intention U. | Le lien au produit est explicable ; aucune obligation ou interdiction de littéralité déduite. |
| C12 | S'intégrer au cadre sombre chaleureux actuel et aux accents de room. Contexte PS/RS. | Tester Learn et au moins un autre contexte d'accent avant intégration ; aucune nouvelle palette choisie ici. |
| C13 | Prévoir une version statique et un comportement avec mouvement réduit. Contexte GV-100–103. | L'identité et toute information utile restent lisibles sans animation. |
| C14 | Distinguer identité disponible maintenant et intégration comportementale future. Intention U. | L'icône fonctionne seule ; potentiel compagnon documenté sans prétendre les interactions déjà implémentées. |


## Base pratique proposée par l'agent — à valider avec le contrat
- Favicon : tester 16, 24, 32 et 48 px à taille réelle ; prévoir simplification optique
  plutôt que demander tous les détails du compagnon dans 16 px.
- Marque d'app : tester aussi 64, 128 et 256 px ; garder une source éditable et des
  exports transparents. Formats de livraison et dimensions du compagnon seront fixés
  avec l'implémentation en phase 6 (sans bloquer l'exploration des territoires).
- Tester fond sombre et fond clair, ainsi qu'une version monochrome, pour robustesse.
  Cela ne demande pas l'implémentation d'un thème clair dans l'app.
- Priorités : aucun compromis sur concentration/contrôle utilisateur, continuité du
  compagnon et reconnaissance à petite taille ; départager ensuite par personnalité,
  justesse pour Lantern et potentiel expressif. Pas de somme de scores automatique.
- Ne pas figer palette, géométrie, accessoires, anatomie ou degré de littéralité avant
  exploration ; aucune décision actuelle ne l'exige.

## Revue des scénarios
Voir rounds/r001/scenarios-v1.md : analyse sur papier, pas de test visuel réalisé.
Les trois clarifications de questions-02.md sont résolues par answers-02.md.
La validation globale du contrat et de sa base pratique est encore attendue.
Le détail des déclencheurs, de la réapparition après masquage et des formats d'animation
est différé aux phases caractère/mouvement/système ; aucune fonctionnalité implémentée.
