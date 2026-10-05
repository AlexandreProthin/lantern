# Lantern — passage de relais après le Round 2
2026-10-05 Europe/Paris. Phase 2 : silhouette et règle responsive retenues ; dossier de clôture prêt. Les phases suivantes ne sont pas commencées.

## Choix utilisateur et filiation
- D0010 : r004-c02 — Flamme articulée, « 02 is the one ».
- D0012 : r005-c03, « r005-c03 » ; silhouette neutre sans yeux.
- D0013 : r006-c01, « ok » après recommandation explicite ; boucle élargie modérément.
- D0014 : r007-c01 à 16 px et r006-c01 à 24–256 px, « ok » après proposition de cette règle.
Ancêtres : r003-c08/r003-c03 → r004-c02 → r005-c03 → r006-c01 → r007-c01.
Autres variantes conservées, non sélectionnées ; ne pas inventer de rejet humain. Aucun nouveau choix n'est produit par la clôture documentaire.

## Sources retenues, chemins depuis projects/lantern
16 px : rounds/r007/sources/r007-c01-16.svg.
24/32/48 et app 64/128/256 px : rounds/r006/sources/r006-c01.svg.
Règle acceptée : rounds/r007/responsive-rules-v2-accepted.md.
Deux montants souples, flamme centrale asymétrique, assise compacte, attache de suspension. La boucle plus grande est limitée au 16 px. La silhouette sans yeux ne règle pas les détails futurs d'expression.
Monochrome avec contreforme transparente ; les couleurs des tests ne sont pas une palette approuvée. Rendre directement le SVG adapté à la taille ; ne pas fabriquer le 16 px en réduisant le PNG app.

## Preuves et limites
rounds/r007/evidence/comparison.png : tailles natives et agrandissements 3× nearest, deux polarités.
rounds/r007/evidence/responsive.png : combinaison retenue 16–256.
rounds/r007/evidence/stress.png : 16 px, flou 0,5 px et seuil diagnostique.
Méthode/versions : rounds/r007/evidence/method.md et renderer.json ; Sharp/librsvg, rendu 8× puis Lanczos3.
Critique : rounds/r007/evidence/critique.md. Amélioration d'ouverture constatée, surtout fond sombre. Le flou affaiblit encore la boucle et le cadre. Aucune réussite universelle ni validation participant/browser-DPI/centrage perceptif revendiquée.
Confusion goutte/cadenas plausible ; à revoir dans le contexte produit. L'acceptation des sources/règles ne transforme pas les tests non effectués en réussites.
rounds/r006/evidence/centering.json contient des centres d'encre, pas une mesure du centrage perceptif.
Écart ancien : PNG Pillow r005-c03 contreforme non identique au SVG. Preuves anciennes conservées ; r006/r007 comparaisons directement issues des SVG font référence.

## Clôture et reprise
Round 2 (r005–r007) clos documentairement après sélections/règle acceptées ; limites conservées. Pas de release, installation ou nouvelle phase implicite.
Lire AGENTS.md/RESUME.md puis STATE/REQUEST/LOG, contrat 2 et rubric 1. Point de reprise : rounds/r007/checkpoints/c004.md, STATE 18, demande 15 consommée. Prochain essai r008 seulement après nouvelle demande.
Prochaine étape de design proposée : phase 3, potentiel de caractère en poses fixes, uniquement après instruction utilisateur. Étudier expression minimale et attache/posture tout en gardant l'ancre favicon. Ne pas imposer yeux, membres ou espèce ; la sélection neutre sans yeux n'interdit pas leur étude.
Les possibilités historiques (pieds émergents, suspension/balancement/chute, vol par chauffe) restent des potentiels, pas une grammaire animée validée. Aucune animation à ce stade.
Si une future géométrie altère l'ancre, ouvrir une nouvelle version avec filiation, nommer les tests invalidés et retester 16/24/32/48 clair/sombre avant convergence.
