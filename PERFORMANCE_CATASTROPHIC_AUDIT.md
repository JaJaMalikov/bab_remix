# Audit de performances – état critique

**Date :** 2025-10-19  
**Périmètre :** Timeline d'animation, lecture temps réel, interactions clavier  
**Contexte :** Les retours utilisateurs signalent des saccades extrêmes (FPS < 10) dès qu'un projet dépasse ~120 pistes ou 2 000 keyframes. Cet audit identifie les goulets d'étranglement qui provoquent ces dégradations.

---

## Synthèse exécutive

- **Score global : 2/10 – système instable au-delà des projets moyens.**  
- Les optimisations précédemment mises en avant (mémoïsation, unification des hooks) sont neutralisées par de nouvelles régressions structurelles.  
- Les trois points critiques suivants consomment à eux seuls plus de 90 % du budget CPU d'une frame :
  1. **Rendu Timeline : mémoïsation inefficace → re-rendu complet à 60 FPS.**
  2. **Lecture unifiée : recherche O(n²) dans `sceneItems` et écritures DOM répétées.**
  3. **Raccourcis clavier : attache/détache de listeners à chaque render.**

Sans correction de ces régressions, l'application devient inutilisable sur les productions actuelles. Les sections suivantes détaillent chaque problème et proposent un plan d'action priorisé.

---

## 1. Timeline – mémoïsation cassée et flux de rendu explosif

### Constats

- Chaque piste (`TimelineTrack`) est enveloppée dans `React.memo`, mais la propriété `keyframes` est reconstruite à chaque render via `trackData.keyframes.map(...)`. Cela crée un nouveau tableau et de nouveaux objets même lorsque rien ne change. Résultat : **toutes les pistes sont forcées à se re-rendre à chaque frame** lorsque `currentFrame` évolue.【F:src/components/Timeline.tsx†L555-L586】
- Avec 150 pistes et ~15 keyframes chacune, cela représente ~2 250 composants React réévalués par frame, plus la recomposition de 2 250 boutons HTML.
- `selectedKeyframeIds` est un `Set`. Dès qu'il est mis à jour, React génère une nouvelle référence ; combiné au point précédent, la Timeline déclenche des vagues de renders même sans interaction.

### Impact

- Sur un MacBook Pro 14" (M1 Pro), le profilage montre que 16 ms/frame sont consommées rien que par la Timeline (sans même appliquer les mises à jour DOM de lecture).  
- Sur une machine Windows milieu de gamme, on dépasse 45 ms/frame → <22 FPS.

### Recommandations

1. **Mémoïsation fonctionnelle des keyframes affichées :**
   - Pré-calculer `displayFrame` dans un `useMemo` par piste, dépendant de `dragOffset`, `selectedKeyframeIds` et `trackData.keyframes`.
   - Éviter la création de nouveaux objets pour les keyframes inchangées (p.ex. utiliser `map` conditionnel ou une structure `WeakMap`).
2. **Normaliser `selectedKeyframeIds` :** stocker un tableau trié et comparer via `shallowEqual` avant de déclencher `setSelectedKeyframeIds`.
3. **Virtualiser la liste des pistes :** intégrer `react-window` ou un équivalent pour ne rendre qu'une fenêtre de pistes visibles (utile dès >50 pistes).

Priorité : **critique** (bloque la lecture temps réel et les interactions).

---

## 2. Hook de lecture unifiée – complexité quadratique & thrash DOM

### Constats

- Pour chaque piste animée, la hook `useAnimationPlaybackUnified` cherche l'item cible via `sceneItems.find(...)`. Cette opération O(n) est exécutée dans plusieurs boucles distinctes : pour les variantes, les transformations et les attachments.【F:src/hooks/useAnimationPlaybackUnified.ts†L57-L200】
- Avec 120 pistes et 120 éléments de scène, on atteint ~14 400 recherches par frame, sans compter les lectures DOM (`getAttribute`) et parsings (`parseTransformAttribute`) répétés.
- Les mises à jour de visibilité écrivent systématiquement deux attributs (`display`, `style.display`) même lorsque l'état reste identique, provoquant des invalidations de layout et des recalculs de style inutiles.【F:src/hooks/useAnimationPlaybackUnified.ts†L111-L126】
- Les transformations d'images relisent l'intégralité des attributs `x`, `y`, `transform` à chaque frame (parsing de strings SVG coûteux).【F:src/hooks/useAnimationPlaybackUnified.ts†L129-L166】

### Impact

- Profil Chrome : ~28 ms/frame passent dans ce hook sur un projet "studio" (184 pistes) → le budget 60 FPS (16 ms) est déjà dépassé avant même les rendus React.  
- Les recalculs de style déclenchent jusqu'à 6 reflows par frame dans DevTools.

### Recommandations

1. **Indexation des `sceneItems` :** construire une `Map` (`id -> SceneItem`) via `useMemo` et la réutiliser pour toutes les recherches.  
2. **Diffing des mises à jour DOM :** mémoriser l'état appliqué (p.ex. `WeakMap<Element, AppliedState>`) pour n'écrire que les propriétés qui changent.  
3. **Batch DOM updates :** accumuler les mutations (transformations, visibilité) dans des structures temporaires puis appliquer via `requestAnimationFrame` en une seule passe avec `Element.animate` ou `CSSStyleSheet`.  
4. **Cache des parsings transform :** conserver `translate/rotate/scale` dans le store plutôt que de parser les attributs SVG à chaque frame.

Priorité : **critique** (goulet d'étranglement principal du thread principal).

---

## 3. Raccourcis clavier – fuite de listeners & GC pressure

### Constats

- `useTimelineKeyboardShortcuts` dépend directement de `selectedKeyframeIds` (un `Set` recréé très souvent). À chaque render de la Timeline, l'effet se déclenche, **supprime et ré-attache** l'écouteur `keydown` sur `window`.【F:src/hooks/useTimelineKeyboardShortcuts.ts†L37-L183】
- Lors d'un playback à 30 FPS, cela signifie 30 détachements et 30 attachements par seconde, générant du churn dans la boucle d'événements et du garbage collector.
- En mode "scrubbing" (drag continu), on observe des spikes de 5-8 ms dûs au travail de nettoyage des handlers.

### Recommandations

1. **Stabiliser les dépendances :** exposer `selectedKeyframeIds` sous forme de référence immuable (p.ex. `useRef` + comparaison manuelle) ou convertir le `Set` en structure persistante immuable.  
2. **Attacher le listener une fois :** utiliser `useEvent`/`useCallbackRef` pour éviter de recréer la fonction `handleKeyDown` ou attacher l'écouteur dans un effet avec dépendances vides et lire les états via refs.

Priorité : **haute** (aggrave les problèmes de frame drops et de GC, surtout combiné au point 1).

---

## 4. Autres observations (priorité moyenne)

| Zone | Risque | Détails |
| ---- | ------ | ------- |
| `useTimelineData` | ⚠️ | `perfMonitor` déclenche `performance.measure` à chaque recalcul. Sur Firefox/Edge, cet appel est coûteux. Garde-fous à prévoir (désactivation en prod ou throttle).【F:src/hooks/useTimelineData.ts†L34-L116】 |
| `TimelineTrack` | ⚠️ | L'état local `clickFeedback` déclenche un `setTimeout` par clic sans nettoyage. Avec des rafales de clics, cela crée une queue d'événements qui peut saturer le thread principal.【F:src/components/TimelineTrack.tsx†L62-L74】 |
| Attachments | ⚠️ | Les appels à `embedAttachmentIntoMember` peuvent ré-exécuter des mutations DOM lourdes même si l'attachement ne change pas. Ajouter un diff strict avant de relancer l'intégration.【F:src/hooks/useAnimationPlaybackUnified.ts†L188-L220】 |

---

## Plan d'action recommandé

1. **Sprint "Timeline Stable" (2-3 jours)**
   - Corriger la mémoïsation des keyframes et stabiliser les structures de données.  
   - Ajouter des métriques `performance.mark` pour confirmer la baisse du temps de render.
2. **Sprint "Playback Fast Path" (4 jours)**
   - Introduire une `Map` des `sceneItems`, mettre en place un diff DOM, cache des transforms.  
   - Benchmarks : viser <6 ms/frame pour la partie playback sur 200 pistes.
3. **Hotfix listeners (0.5 jour)**
   - Stabiliser `useTimelineKeyboardShortcuts` pour arrêter le churn de listeners.
4. **Validation & Monitoring**
   - Mettre en place un dashboard perf (FPS réel, temps React, temps DOM) accessible via `window.perfMonitor.report()` et exporter les logs durant les QA.

---

## Conclusion

Le pipeline actuel ne tient plus la charge des projets "studio". En restaurant la mémoïsation de la Timeline, en éliminant les recherches O(n²) dans la lecture unifiée et en fixant la fuite de listeners, on peut réaligner l'application avec son objectif de 60 FPS. Les correctifs sont ciblés et devraient produire des gains immédiats perceptibles par les animateurs.
