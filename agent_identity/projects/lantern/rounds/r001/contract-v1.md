# Contrat de design — Lantern
Version : 1 ; statut : brouillon agent fondé sur les sources, validation globale à venir.
Les intentions utilisateur ci-dessous sont explicites ; les critères d'évaluation sont
des propositions de l'agent. Aucune forme, palette ou métaphore visuelle n'est choisie.
Sources U : answers-01.md ; R : sources/README.md ; PS/RS/GV/PQ : spécifications copiées
sous rounds/r001/sources/agent_wiki/specs/. Tous ces chemins sont relatifs à r001.

| ID | Clause et statut de la source | Condition d'évaluation proposée |
|---|---|---|
| C01 | Couvrir favicon, identité d'app et compagnon animé. Exigence initiale utilisateur. | Comparer les trois usages côte à côte ; invariants reconnaissables et simplifications documentées. |
| C02 | Servir un espace de pensée avec l'IA où l'utilisateur apprend et raisonne activement. Fait produit R/PS. | Les choix se justifient par ce rôle et restent pertinents au-delà de Learn. |
| C03 | Évoquer la curiosité. Intention U. | L'utilisateur juge l'identité invitante à explorer. |
| C04 | Évoquer la rigueur. Intention U. | La présence paraît attentive et fiable, compatible avec un travail exigeant. |
| C05 | Évoquer l'ouverture d'esprit. Intention U. | La présence paraît réceptive à des pistes et points de vue divers. |
| C06 | Éviter le repoussant et l'élitisme. Limites U. | L'utilisateur peut identifier et éliminer ce qui crée rejet ou distance sociale/intellectuelle. |
| C07 | Être un guide discret, sympathique, mignon et intelligent, prêt à aider. Intention U. | Jugement utilisateur sur ces qualités et exemples d'attitude ; degré de mignon à préciser. |
| C08 | Assurer une continuité de compagnie à travers les rooms. Intention U. | Reconnaissance et continuité lors d'un changement de room ; ampleur des variations à préciser. |
| C09 | Rendre l'usage plaisant, divertissant et captivant au rythme de l'app. Intention U. | Comparer accueil, attente et apprentissage ; les comportements conviennent à chaque contexte. |
| C10 | Préserver la concentration, notamment pendant l'apprentissage. Limite U, cohérente avec PS-42/RS-33. | Simulation ultérieure de lecture/réflexion : pas de sollicitation perturbatrice ; critères précis à définir. |
| C11 | Être en accord avec l'esprit de Lantern. Intention U. | Le lien au produit est explicable ; aucune obligation ou interdiction de littéralité déduite. |
| C12 | S'intégrer au cadre sombre chaleureux actuel et aux accents de room. Contexte PS/RS. | Tester Learn et au moins un autre contexte d'accent avant intégration ; aucune nouvelle palette choisie ici. |
| C13 | Prévoir une version statique et un comportement avec mouvement réduit. Contexte GV-100–103. | L'identité et toute information utile restent lisibles sans animation. |
| C14 | Distinguer identité disponible maintenant et intégration comportementale future. Intention U. | L'icône fonctionne seule ; potentiel compagnon documenté sans prétendre les interactions déjà implémentées. |

## Points encore ouverts
Trois premières clarifications : rounds/r001/questions-02.md.
Plus tard dans cette phase : dimensions/exports, comportement détaillé si nécessaire,
couverture clair/monochrome et priorités d'évaluation. Aucun score ni poids approuvé.
« Toujours présent » ne devient pas automatiquement « toujours animé » ni « impossible à masquer ».
Mignon + rigoureux et captivant + discret sont des équilibres à tester, pas des contradictions
à résoudre en supprimant une qualité demandée. Conserver les deux côtés.
