# Timeline Tracks UI/UX Check-up

**Date:** 2025-10-19 (Initial) | 2025-10-20 (Final)
**Scope:** Timeline tracks interface, keyframes, visibility segments
**Status:** ✅ ✅ ✅ **TOUTES LES PHASES COMPLÉTÉES** | 🎉 Phase 1-2-3 + BONUS

---

## 🎯 Résumé des Implémentations (19 Oct 2025)

### ✅ Phase 1 - Fixes Critiques (COMPLÈTE)
- **Décalage vertical X/Y** : Keyframes Position X/Y décalées de ±4px pour éviter superposition
- **Ghost keyframes** : Feedback visuel pendant le drag avec keyframes fantômes en pointillés
- **Contraste visibility** : Segments visibles avec bordure + fond, segments cachés avec pattern diagonal

### ✅ Phase 2 - Améliorations UX (COMPLÈTE)
- **Visual feedback click** : Animation pulse-fade lors du clic sur la track de visibilité (300ms)
- **Radix Tooltip** : Remplacement des `title` natifs par Radix UI Tooltip avec positioning intelligent
  - Composant `src/components/ui/tooltip.tsx` créé
  - `TooltipProvider` ajouté dans `App.tsx` (delayDuration: 200ms)
  - Tooltips formatés avec séparateurs visuels dans `TimelineTrack.tsx`
- **Keyboard shortcuts** : Raccourcis clavier complets implémentés
  - Hook `useTimelineKeyboardShortcuts.ts` créé et intégré dans Timeline
  - Delete : Suppression des keyframes sélectionnées
  - Ctrl+D : Duplication (+1 frame)
  - Ctrl+A : Sélection de toutes les keyframes
  - ← / → : Nudge ±1 frame
  - Shift+← / Shift+→ : Nudge ±10 frames
- **Selection badge** : Badge avec compteur affiché dans le label du track

### 🎁 BONUS - Aide aux Raccourcis
- **Dialog raccourcis clavier** : Icône ? dans la sidebar
  - Composant `src/components/ui/dialog.tsx` créé
  - Composant `KeyboardShortcutsDialog.tsx` avec tous les raccourcis documentés
  - Accessible via l'icône help en bas de la sidebar

### ✅ Phase 3 - Améliorations Avancées (COMPLÈTE)
- **Context Menu** : Menu contextuel sur clic droit sur les keyframes
  - Composant `src/components/ui/context-menu.tsx` créé
  - Actions : Copy Value, Paste Value, Duplicate, Delete
  - Raccourcis affichés dans le menu
  - Paste désactivé si aucune valeur copiée
  - Delete avec style destructive (rouge)
- **Accessibilité améliorée** : Visibility track accessible
  - `role="button"` et `tabIndex={0}` pour navigation clavier
  - `aria-label` descriptif pour screen readers
  - Support Enter et Espace pour toggle visibility

### 📋 Prochaines Étapes (Optionnel)
- **Snap to grid** : Magnétisme lors du drag (Bonus)

---

## Vue d'ensemble

L'UI de la Timeline est globalement **bien conçue** avec une architecture solide et des patterns modernes. Voici le check-up détaillé avec les améliorations identifiées.

---

## 1. Structure Actuelle

### Composants
- **TimelineTrack.tsx** - Component principal (180 lignes)
- **TimelineRuler.tsx** - Ruler avec graduations
- **Timeline.tsx** - Container principal avec contrôles
- **globals.css** - Styles Timeline

### Features Implémentées ✅
- ✅ Keyframes avec couleurs par type (position X/Y, rotation, visibility)
- ✅ Segments de visibilité (visible/hidden)
- ✅ Playhead indicator
- ✅ Sélection multiple de keyframes
- ✅ Drag & drop de keyframes
- ✅ Duplication avec Alt
- ✅ Tooltips informatifs
- ✅ Zoom de la timeline
- ✅ Scroll horizontal synchronisé
- ✅ Responsive design

---

## 2. Problèmes Identifiés

### 🔴 Critiques

#### 2.1 Keyframes Position X/Y Superposés
**Problème:** Quand X et Y ont des keyframes au même frame, ils se superposent et deviennent difficiles à cliquer.

**Localisation:** `TimelineTrack.tsx:105-151`

```typescript
// Actuellement: tous les keyframes au même niveau vertical
{keyframes.map((keyframe) => {
  const left = keyframe.displayFrame * pixelsPerFrame;
  // ...
  return (
    <button
      style={{ left }}  // Même position pour X et Y au même frame!
      // ...
    />
  );
})}
```

**Impact:**
- ❌ Impossible de sélectionner keyframe X si Y est au-dessus
- ❌ Confusion visuelle
- ❌ Mauvaise UX pour animations complexes

**Solution Recommandée:**
```typescript
// Décalage vertical basé sur le type
const getVerticalOffset = (type: string, axis?: string) => {
  if (type === "position") {
    return axis === "x" ? "-2px" : "2px";  // X en haut, Y en bas
  }
  if (type === "rotation") return "0px";
  if (type === "visibility") return "0px";
  return "0px";
};

<button
  style={{
    left,
    top: `calc(50% + ${getVerticalOffset(keyframe.type, keyframe.axis)})`
  }}
/>
```

---

#### 2.2 Pas de Visual Feedback pour Drag en Cours
**Problème:** Pendant le drag, aucun feedback visuel n'indique où les keyframes vont être déposées.

**Localisation:** `TimelineTrack.tsx:131-150`

**Impact:**
- ❌ Utilisateur ne sait pas où il dépose
- ❌ Difficile de viser une frame précise
- ❌ Pas d'indication si hors limites

**Solution Recommandée:**
```typescript
// Ajouter ghost keyframes pendant le drag
{dragOffset !== 0 && keyframes
  .filter(kf => selectedKeyframes.has(kf.id))
  .map(kf => {
    const targetFrame = clamp(kf.frame + dragOffset, 0, maxFrameIndex);
    return (
      <div
        key={`ghost-${kf.id}`}
        className="timeline-keyframe-ghost"
        style={{ left: targetFrame * pixelsPerFrame }}
      />
    );
  })
}
```

**CSS:**
```css
.timeline-keyframe-ghost {
  @apply absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45;
  @apply border-2 border-dashed border-[hsl(var(--primary))];
  background: transparent;
  opacity: 0.6;
  pointer-events: none;
}
```

---

### 🟡 Moyennes

#### 2.3 Visibilité des Segments Peu Claire
**Problème:** Les segments de visibilité (visible/hidden) manquent de contraste.

**Localisation:** `globals.css` - `.timeline-track-segment`

**Actuel:**
```css
.timeline-track-segment.is-visible {
  @apply bg-[hsl(var(--timeline-visible)/0.25)];
}
.timeline-track-segment.is-hidden {
  @apply bg-transparent;
}
```

**Impact:**
- ⚠️ Difficile de voir la différence visible/hidden
- ⚠️ Pas assez de contraste
- ⚠️ Confusion pour nouveaux utilisateurs

**Solution Recommandée:**
```css
.timeline-track-segment.is-visible {
  @apply bg-[hsl(var(--timeline-visible)/0.4)];
  border-top: 2px solid hsl(var(--timeline-visible)/0.6);
}
.timeline-track-segment.is-hidden {
  @apply bg-[hsl(var(--destructive)/0.15)];
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    hsl(var(--destructive)/0.1) 4px,
    hsl(var(--destructive)/0.1) 8px
  );
}
```

---

#### 2.4 Pas de Feedback Visuel pour Click sur Visibility Track
**Problème:** Click sur visibility track ne donne pas de feedback immédiat.

**Localisation:** `TimelineTrack.tsx:78-80`

```typescript
<div
  className="timeline-track-visibility"
  onClick={handleVisibilityClick}  // Pas de feedback visuel
>
```

**Solution Recommandée:**
```typescript
const [clickFeedback, setClickFeedback] = useState<number | null>(null);

const handleVisibilityClick = (e: React.MouseEvent<HTMLDivElement>) => {
  // ... existing logic

  // Visual feedback
  setClickFeedback(frame);
  setTimeout(() => setClickFeedback(null), 300);
};

// Dans le render
{clickFeedback !== null && (
  <div
    className="timeline-visibility-click-feedback"
    style={{ left: `${(clickFeedback / duration) * 100}%` }}
  />
)}
```

**CSS:**
```css
.timeline-visibility-click-feedback {
  @apply absolute top-0 bottom-0 w-0.5 bg-[hsl(var(--primary))];
  animation: pulse-fade 300ms ease-out;
}

@keyframes pulse-fade {
  0% { opacity: 1; transform: scaleY(1); }
  100% { opacity: 0; transform: scaleY(1.2); }
}
```

---

### 🟢 Mineures

#### 2.5 Tooltips Peuvent Être Tronqués
**Problème:** Tooltips longs (ex: "Position X • 123.45 • Frame 567") peuvent sortir de l'écran.

**Localisation:** `TimelineTrack.tsx:124-128`

**Solution:** Utiliser Radix UI Tooltip pour positioning intelligent

---

#### 2.6 Pas d'Indication de Nombre de Keyframes Sélectionnées
**Problème:** Lors de sélection multiple, pas de compteur.

**Solution:**
```typescript
// Dans TimelineTrack
const selectedCount = keyframes.filter(kf =>
  selectedKeyframes.has(kf.id)
).length;

{selectedCount > 1 && (
  <div className="timeline-selection-badge">
    {selectedCount} keyframes
  </div>
)}
```

---

#### 2.7 Zoom N'est Pas Persisté
**Problème:** Le niveau de zoom se reset à chaque rechargement.

**Solution:** Sauvegarder dans localStorage via Zustand persist

---

## 3. Améliorations UX Recommandées

### 3.1 Keyboard Shortcuts
**Manquant:** Pas de raccourcis pour Timeline

**Recommandé:**
- `Delete` - Supprimer keyframes sélectionnées
- `Ctrl+D` - Dupliquer keyframes sélectionnées
- `Ctrl+A` - Sélectionner toutes les keyframes du track
- `←` `→` - Nudge keyframes (±1 frame)
- `Shift+←` `Shift+→` - Nudge keyframes (±10 frames)
- `Home` - Aller à frame 0
- `End` - Aller à dernière frame

---

### 3.2 Context Menu
**Manquant:** Pas de menu contextuel sur les keyframes

**Recommandé:**
- Delete keyframe(s)
- Duplicate keyframe(s)
- Copy value
- Paste value
- Set easing curve (préparation pour futures easings)

---

### 3.3 Multi-Track Selection
**Manquant:** Impossible de sélectionner keyframes across multiple tracks

**Recommandé:**
- Drag box selection
- Shift+Click pour range selection

---

### 3.4 Visual Easing Indication
**Manquant:** Pas d'indication visuelle des easings entre keyframes

**Recommandé:**
```css
.timeline-keyframe[data-easing="easeInOut"] {
  /* Couleur différente ou icône */
}
```

---

### 3.5 Snap to Grid/Keyframes
**Manquant:** Pas de snapping pendant le drag

**Recommandé:**
- Snap to keyframes of other properties
- Snap to frame grid
- Toggle avec `Ctrl` pressed

---

## 4. Problèmes de Performance

### ✅ Déjà Optimisé
- ✅ React.memo sur TimelineTrack
- ✅ Memoization custom comparison
- ✅ Playhead update via inline style
- ✅ RAF batching pour playback

### Aucun problème de performance identifié! 🎉

---

## 5. Accessibilité

### ✅ Bon
- ✅ Boutons avec `type="button"`
- ✅ `aria-pressed` sur keyframes sélectionnées
- ✅ Tooltips via `title`
- ✅ Focus-visible styles

### 🟡 À Améliorer
- ⚠️ Pas de `aria-label` sur visibility track
- ⚠️ Pas de keyboard navigation entre keyframes
- ⚠️ Pas d'annonce screen reader pour sélection

**Recommandé:**
```typescript
<div
  className="timeline-track-visibility"
  onClick={handleVisibilityClick}
  role="button"
  tabIndex={0}
  aria-label={`Visibility track for ${name}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      // Toggle visibility at current frame
    }
  }}
>
```

---

## 6. Responsive Design

### ✅ Déjà Implémenté
- ✅ Media queries pour mobile
- ✅ Labels qui s'adaptent
- ✅ Scroll horizontal géré

### 🟡 À Améliorer
- ⚠️ Keyframes trop petits sur mobile (2.5px → min 8px touch target)
- ⚠️ Pas de pinch-to-zoom sur mobile

---

## 7. Plan d'Action Priorisé

### Phase 1 - Critiques (2-3h) ✅ COMPLÉTÉE
1. ✅ **Décalage vertical keyframes X/Y**
2. ✅ **Ghost keyframes pendant drag**
3. ✅ **Meilleur contraste visibility segments**

### Phase 2 - Moyennes (2h) ✅ COMPLÉTÉE
4. ✅ **Visual feedback click visibility track** - Ajouté avec animation pulse-fade
5. ✅ **Radix Tooltip pour meilleurs tooltips** - Implémenté avec positioning intelligent
6. ✅ **Keyboard shortcuts essentiels** - Hook dédié avec Delete, Arrows, Ctrl+D, Ctrl+A
7. ✅ **Selection badge** - Compteur affiché dans le label du track
8. ✅ **BONUS: Dialog aide raccourcis** - Icône ? dans sidebar avec documentation complète

### Phase 3 - Améliorations (3h) ✅ COMPLÉTÉE
9. ✅ **Context menu** - Menu sur clic droit avec Copy/Paste/Duplicate/Delete
10. ✅ **Accessibilité visibility track** - aria-label + keyboard support
11. ⏳ **Snap to grid** - Bonus (optionnel)

---

## 8. Implémentation Immédiate

Les 3 fixes critiques peuvent être implémentés maintenant sans breaking changes.

### Code Changes Nécessaires:
1. **TimelineTrack.tsx** - Ajouter vertical offset pour keyframes
2. **TimelineTrack.tsx** - Ajouter ghost keyframes render
3. **globals.css** - Améliorer styles visibility segments

**Effort total:** ~2 heures
**Impact:** Amélioration significative de l'UX
**Risk:** Très faible (changements CSS principalement)

---

## Conclusion

### Score UI/UX Global: **8/10**

**Points Forts:**
- ✅ Architecture solide
- ✅ Features complètes
- ✅ Performant
- ✅ Code maintenable

**Points d'Amélioration:**
- 🔴 Keyframes superposés (critique)
- 🔴 Feedback visuel drag (critique)
- 🟡 Contraste visibility (moyen)
- 🟢 Keyboard shortcuts (bonus)

**Recommandation:** Implémenter Phase 1 (fixes critiques) immédiatement. Phases 2-3 peuvent attendre feedback utilisateurs.
