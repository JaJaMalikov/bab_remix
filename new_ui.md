# Nouvelle Interface Utilisateur - BaB Remix

## 🎨 Refactoring complet du Design System


### Architecture & Design System
- **Tailwind CSS** configuré avec thème dark personnalisé
- **Radix-UI** pour les composants accessibles (Dropdown, Tabs, Slider, etc.)
- **CVA (Class Variance Authority)** pour les variants de composants
- Utilitaires **clsx** + **tailwind-merge** pour la composition de classes

### Composants UI
- ✅ Button (avec variants)
- ✅ Input
- ✅ Label
- ✅ Card
- ✅ Slider
- ✅ Switch
- ✅ Tabs
- ✅ DropdownMenu
- ✅ ScrollArea
- ✅ Separator
- ✅ Icons (SVG)

### Nouvelle architecture Layout
- ✅ **Sidebar** style VSCode avec icônes et tooltips
- ✅ **SidePanel** attaché (plus de panels flottants)
- ✅ **AppLayout** principal avec sidebar + scene + timeline
- ✅ Layout responsive adapté à l'espace

### Composants applicatifs refactorisés
- ✅ **MenuBar** avec dropdowns Radix-UI
- ✅ **LibraryPanel** avec tabs et assets en grid
- ✅ **InspectorPanel** simplifié avec Cards
- ✅ **LayersPanel** liste des éléments cliquables
- ✅ **TimelineBar** contrôles de lecture simplifiés



## 📁 Structure des fichiers

```
src/
├── components/
│   ├── ui/                    # Composants design system
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── icons.tsx
│   │   └── ...
│   ├── layout/                # Composants de layout
│   │   ├── sidebar.tsx        # Sidebar avec icônes
│   │   ├── side-panel.tsx     # Panel attaché
│   │   └── app-layout.tsx     # Layout principal
│   ├── features/              # Composants métier
│   │   ├── menu-bar.tsx
│   │   ├── library-panel.tsx
│   │   ├── inspector-panel.tsx
│   │   ├── layers-panel.tsx
│   │   └── timeline-bar.tsx
│   └── [anciens composants]   # À nettoyer progressivement
├── lib/
│   └── utils.ts               # Fonction cn() pour Tailwind
└── styles/
    └── globals.css            # Directives Tailwind + base styles
```

## 🎯 Utilisation de la Sidebar

### Icônes disponibles
- 📚 **Library** (Ctrl+L) - Bibliothèque d'assets
- 🔍 **Inspector** (Ctrl+I) - Propriétés des éléments
- 📋 **Layers** (Ctrl+G) - Liste des calques

### Fonctionnement
- Cliquer sur une icône ouvre/ferme le panel
- Un seul panel visible à la fois
- Le panel reste attaché à la sidebar
- Largeur personnalisée par panel

## 🔧 


1. **Inspector avancé** : Ajouter les contrôles de transformation (rotation, scale, etc.)
2. **Timeline complète** : Ajouter les tracks, keyframes visuels, scrubbing
3. **Layers avancé** : Drag & drop pour réordonner, visibilité, verrouillage
4. **Raccourcis clavier** : Vérifier que tous fonctionnent avec la nouvelle UI
5. **Nettoyer** : Supprimer les anciens composants (`src/components/*.tsx` inutilisés)
6. **Supprimer** : `public/style.css` (remplacé par Tailwind)

## 💡 Avantages de la nouvelle UI

- ✅ **Plus d'espace** pour la scène (plus de panels flottants)
- ✅ **Navigation claire** avec la sidebar type VSCode
- ✅ **Design moderne** avec Tailwind + Radix-UI
- ✅ **Accessible** grâce à Radix-UI (keyboard nav, ARIA)
- ✅ **Maintenable** avec design system cohérent
- ✅ **Performance** optimisée avec composants légers

