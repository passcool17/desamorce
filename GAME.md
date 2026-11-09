# Désamorce! — fiche du jeu

## Concept
Une bombe en gros plan, un chrono de **5:00**. La bombe a **4 faces**, chacune avec un module. Les indices de chaque module sont cachés sur les **autres** faces, comme dans une puzzle box. Chaque partie génère une nouvelle bombe.

| Face | Module | Indice nécessaire (et où il est) |
|---|---|---|
| 1 — Fils | Couper les fils dont la couleur correspond à un voyant **allumé** | Voyants : face 3 |
| 2 — Clavier | Code à 4 chiffres | Symboles : sous le panneau (face 3) + légende symbole→chiffre (débloquée par l'aiguille, face 4) |
| 3 — Panneau | Dévisser les 4 vis dans le bon ordre | Chiffres du n° de série : face 1 |
| 4 — Aiguille | Guider l'aiguille dans le labyrinthe jusqu'au drapeau sans toucher un mur | — (récompense : la légende du clavier) |

Chaîne logique : n° de série → vis → symboles ; aiguille → légende ; symboles + légende → code ; voyants → fils.

## Règles
- Chaque erreur (mauvais fil, mauvaise vis, mauvais code, mur touché) : **−30 s** et une croix.
- **3 erreurs** ou chrono à zéro : **BOUM**.
- Les 4 modules résolus : victoire, avec le temps restant.

## Contrôles
- **Glisser** à gauche/droite sur l'écran pour tourner la bombe; boutons **◀ ▶** en bas (aussi flèches du clavier sur ordinateur).
- **Toucher** un fil pour le couper, une vis pour la dévisser, les touches du clavier (EFF efface, OK valide).
- Aiguille : croix directionnelle ▲ ◀ ▼ ▶ (flèches ↑ ↓ du clavier sur la face Aiguille).

## État (v1, 2026-11-09)
- Jouable de bout en bout, généré aléatoirement, toujours soluble (vérifié sur 5000 bombes).
- Graphismes procéduraux, sons synthétisés (tic, coupe, erreur, victoire, explosion).
- Partie complète testée automatiquement dans Chrome headless (victoire et défaite).
- Pas encore testé sur un vrai téléphone.

## Prochaines idées
- Visuels Créa (bombe, fils, vis) et vraie musique de tension.
- Plus de types de modules (interrupteurs, fréquence radio, symboles à appuyer dans l'ordre) tirés au hasard.
- Niveaux de difficulté (chrono, nombre de modules, labyrinthe à murs invisibles).
- Meilleurs temps sauvegardés localement, mode « manuel » à deux joueurs (un lit, l'autre désamorce).
- Vibration du téléphone sur erreur.
