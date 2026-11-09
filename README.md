# Désamorce!

Jeu de bombe à désamorcer, en mode portrait, joué au doigt dans le navigateur. Tout est fictif.

**Jouer :** https://passcool17.github.io/desamorce/

- Phaser 3 (CDN jsdelivr) + JavaScript simple, aucune étape de build.
- `logic.js` : génération des énigmes (solution d'abord, indices ensuite).
- `game.js` : scènes Phaser (Titre, Jeu, Fin), graphismes procéduraux, sons WebAudio.

## Tests

```sh
node test/logic.test.js                       # 5000 bombes, toutes solubles à partir des indices affichés
node test/e2e-cdp.mjs https://passcool17.github.io/desamorce/ /tmp   # partie complète dans Chrome headless + captures
```

Concept, contrôles et prochaines idées : [GAME.md](GAME.md).
