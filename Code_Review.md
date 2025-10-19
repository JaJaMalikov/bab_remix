# 🧩 Code Review – SVG Animation Tool (React + TypeScript + Vite)

## 🏗️ Project Overview

Ce projet est une **application d’animation SVG avancée** (dans l’esprit d’Adobe Animate), construite avec **React + TypeScript + Vite**.  
Elle permet d’importer des pantins SVG (“puppets”), de les manipuler via des contrôles de transformation, de créer des keyframes et de lire les animations.

> **Taille du projet :** 73 fichiers TypeScript  
> **Architecture :** Contexts + Hooks + Components + Utils  
> **Langage :** TypeScript strict  
> **État global :** Très bon, mais non industrialisé (tests, découpage, doc)

---

## ✅ Points Forts

### 1. Architecture & Organisation
- Séparation claire des responsabilités : `context/`, `hooks/`, `components/`, `utils/`
- Contexts bien pensés : `AnimationContext` (état) + `UiContext` (UI Zustand)
- Utilisation judicieuse des patterns React : memoization, refs, portals
- Composants modulaires : timeline, inspector, layout bien isolés

### 2. Performance
- **LRU cache** pour les SVG et métadonnées
- **Recherche binaire** pour les keyframes (O(log n))
- Boucle d’animation via **requestAnimationFrame** avec correction de dérive
- Hooks unifiés pour éviter les conditions de course
- **Seuils de précision** pour réduire les keyframes inutiles

### 3. Qualité du Code
- TypeScript strict activé
- Interfaces exhaustives (`AnimationTrack`, `Keyframe`, `SceneItem`, etc.)
- Gestion d’erreurs correcte avec fallback
- Commentaires JSDoc clairs (souvent en français)

### 4. Expérience Utilisateur
- Pan/Zoom fluide avec la molette
- Drag & drop de ressources
- Sélection multiple (Cmd/Shift)
- Raccourcis clavier personnalisés
- Architecture “undo-friendly”
- Affichage temps réel des transformations
- Timeline avec segments de visibilité
- Système de variantes et d’attachements

---

## ⚠️ Problèmes et Recommandations

### 🟥 **Critiques (à corriger avant production)**

1. **Fichier inutile**  
   - `src/components/SvgScene.tsx.orig`  
   → Supprimer immédiatement (artefact de merge)

2. **Logs en production**  
   - 19 appels `console.log` détectés  
   → Créer `src/utils/logger.ts` :
     ```ts
     export const logger = {
       log: (...args: any[]) => import.meta.env.DEV && console.log(...args),
       error: (...args: any[]) => console.error(...args),
       warn: (...args: any[]) => console.warn(...args),
     };
     ```

3. **Type Safety incomplète**  
   - Types `any` / `unknown` détectés  
   → Créer des interfaces pour `metadata`, `group`, etc.

4. **Validation d’entrées manquante**  
   - Ex : `duration` non bornée  
   → Limiter à `1 ≤ duration ≤ 10000`

---

### 🟧 **À corriger dans le prochain sprint**

6. **Context trop volumineux**  
   - `AnimationContext.tsx` (742 lignes), `SvgScene.tsx` (404)  
   → Extraire la logique en modules :
     ```
     src/utils/keyframeHelpers.ts
     src/utils/playbackHelpers.ts
     ```

7. **Granularité d’erreur insuffisante**  
   - Ajouter des `ErrorBoundary` au niveau :
     - TimelineTrack
     - InspectorPanel
     - LibraryItem

8. **Magic Numbers**  
   - Ex: `const MIN_HEIGHT = 46`, `const width = offsetWidth - 200 - 150`  
   → Déplacer dans `constants.ts` avec nom explicite et commentaire

9. **Re-renders excessifs du Context**  
   - Découper en 2 providers :
     - `AnimationStateContext`
     - `AnimationActionsContext`

10. **DOM querySelector dans les boucles**  
    - Ex: `puppetRoot.querySelector(...)`  
    → Stocker les refs dans un `WeakMap<string, Element>`

---

### 🟩 **Améliorations et Dette Technique**

11. **Nommage incohérent**  
    - Mélange `pantin/membre` ↔ `puppet/member`  
    - Fichiers : `use-toast.ts` vs `useAnimation.ts`  
    → Choisir **anglais** pour uniformiser

12. **Ternaires imbriqués**  
    - Simplifier avec `if` ou une fonction `getActivePanel()`

13. **CSS.escape non sécurisé**  
    - Ajouter un polyfill `npm i css.escape`

14. **Couplage fort avec le DOM**  
    - Abstraire la manipulation SVG dans un `SvgDomService`

15. **Documentation manquante**  
    - Créer un dossier `docs/` :
      ```
      docs/
      ├── ARCHITECTURE.md
      ├── ANIMATION_SYSTEM.md
      ├── CONTRIBUTING.md
      ```

---

## 📊 Metrics Résumé

| Élément | Valeur |
|----------|--------|
| **Total fichiers** | 73 TypeScript |
| **Fichier le plus gros** | `AnimationContext.tsx` (742 lignes) |
| **Langage** | TypeScript strict |
| **Performance** | Excellente (cache, binary search, RAF) |
| **Maintenabilité** | 7/10 (fichiers monolithiques) |
| **Test coverage** | 0 % (à implémenter) |
| **Global grade** | **B+ (Très bon)** |

---

## 🚀 Priorité d’Action (Roadmap)

| Priorité | Action | Effort | Impact |
|-----------|---------|--------|--------|
| 🔴 | Supprimer `.orig`, logger, validation inputs | 1 h | 🔥 |
| 🔴 | Tests du moteur d’animation | 1 j | 🚀 |
| 🟠 | Découper `AnimationContext` / `SvgScene` | 1–2 j | 💪 |
| 🟠 | Créer doc + constants + polyfill CSS | 1 j | 🧠 |
| 🟢 | Uniformiser noms + cache DOM | 2–3 h | 🧹 |

---

## 🧭 Conclusion

Ce projet est **techniquement solide et bien architecturé**, avec une maîtrise claire de React, TypeScript et des problématiques d’animation SVG complexes.  
Tu es à **80 % d’un produit pro** : il te manque seulement les fondations “industrielles” — tests, documentation, et un peu de nettoyage structurel.

> 🎯 **Objectif réaliste :** Passer de “B+” à “A+” en deux semaines de refactoring ciblé.  
> Ensuite, tu peux fièrement le présenter comme une app d’animation complète et performante.

---
