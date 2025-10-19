import type { ReactNode, SetStateAction } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PuppetMetadata {
  id: string;
  source: string;
  variantGroups: Array<{
    group: string;
    defaultVariantId: string | null;
    variants: Array<{
      targetMemberId: string | null;
      name: string | null;
      isDefault: boolean;
      isBehindParent?: boolean;
    }>;
  }>;
}

export interface SceneItem {
  id: string;
  type: "puppet" | "image";
  label: string;
  el: Element;
  metadata?: PuppetMetadata;
}

export interface UiState {
  selectedPuppet: SVGElement | null;
  setSelectedPuppet: (g: SVGElement | null) => void;

  selectedLimb: string;
  setSelectedLimb: (id: string) => void;

  angle: number;
  setAngle: (deg: number) => void;

  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  showTimeline: boolean;
  setShowTimeline: (value: SetStateAction<boolean>) => void;
  timelineHeight: number;
  setTimelineHeight: (value: SetStateAction<number>) => void;
  showLibrary: boolean;
  setShowLibrary: (value: SetStateAction<boolean>) => void;
  showInspector: boolean;
  setShowInspector: (value: SetStateAction<boolean>) => void;
  showLayers: boolean;
  setShowLayers: (value: SetStateAction<boolean>) => void;
  showToolbar: boolean;
  setShowToolbar: (value: SetStateAction<boolean>) => void;
  showTracks: boolean;
  setShowTracks: (value: SetStateAction<boolean>) => void;

  sceneItems: SceneItem[];
  addSceneItem: (item: SceneItem) => void;
  removeSceneItem: (id: string) => void;
  updateSceneItemLabel: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  fitInView?: () => void;
  setFitInView: (fn: (() => void) | undefined) => void;
  importAsset?: (asset: {
    name: string;
    type: "pantin" | "objet" | "decor";
    path: string;
  }) => void;
  setImportAsset: (
    fn:
      | ((asset: {
          name: string;
          type: "pantin" | "objet" | "decor";
          path: string;
        }) => void)
      | undefined,
  ) => void;
}

type LayoutState = Pick<
  UiState,
  | "showTimeline"
  | "timelineHeight"
  | "showLibrary"
  | "showInspector"
  | "showLayers"
  | "showToolbar"
  | "showTracks"
>;

const LAYOUT_STORAGE_KEY = "ui:layout";
const NUMBERED_LABEL_SUFFIX = / \(\d+\)$/;

const createBaseState = () => ({
  selectedPuppet: null as UiState["selectedPuppet"],
  selectedLimb: "",
  angle: 0,
  selectedItemId: null as UiState["selectedItemId"],
  showTimeline: true,
  timelineHeight: 160,
  showLibrary: true,
  showInspector: true,
  showLayers: false,
  showToolbar: true,
  showTracks: false,
  sceneItems: [] as SceneItem[],
  fitInView: undefined as UiState["fitInView"],
  importAsset: undefined as UiState["importAsset"],
});

const applySetStateAction = <T,>(
  value: SetStateAction<T>,
  previous: T,
): T => (typeof value === "function" ? (value as (prev: T) => T)(previous) : value);

const deriveUniqueLabel = (existing: SceneItem[], desiredLabel: string) => {
  const normalizedBase = desiredLabel.replace(NUMBERED_LABEL_SUFFIX, "");
  const candidates = new Set(existing.map((item) => item.label));
  if (!candidates.has(desiredLabel)) {
    return desiredLabel;
  }

  let suffix = 2;
  while (candidates.has(`${normalizedBase} (${suffix})`)) {
    suffix += 1;
  }
  return `${normalizedBase} (${suffix})`;
};

const reorderSceneItems = (
  items: SceneItem[],
  id: string,
  direction: 1 | -1,
): SceneItem[] => {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return items;
  }

  const targetIndex = Math.min(Math.max(index + direction, 0), items.length - 1);
  if (targetIndex === index) {
    return items;
  }

  const currentItem = items[index];
  const parent = currentItem.el.parentNode;
  if (!parent) {
    return items;
  }

  if (direction > 0) {
    const nextSibling = currentItem.el.nextSibling;
    if (!nextSibling) {
      return items;
    }
    parent.insertBefore(currentItem.el, nextSibling.nextSibling);
  } else {
    const previousSibling = currentItem.el.previousSibling;
    if (!previousSibling) {
      return items;
    }
    parent.insertBefore(currentItem.el, previousSibling);
  }

  const updated = [...items];
  const [moved] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, moved);
  return updated;
};

/**
 * Store Zustand pour l'état global de l'interface utilisateur.
 * Gère la sélection, la visibilité des panneaux, et les éléments de la scène.
 * L'état de la mise en page est persisté dans le localStorage.
 */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      ...createBaseState(),
      selectedPuppet: null,
      setSelectedPuppet: (g) => set({ selectedPuppet: g }),

      setSelectedLimb: (id) => set({ selectedLimb: id }),

      setAngle: (deg) => set({ angle: deg }),

      setSelectedItemId: (id) => set({ selectedItemId: id }),

      setShowTimeline: (value) =>
        set((state) => ({ showTimeline: applySetStateAction(value, state.showTimeline) })),
      setTimelineHeight: (value) =>
        set((state) => ({
          timelineHeight: applySetStateAction(value, state.timelineHeight),
        })),
      setShowLibrary: (value) =>
        set((state) => ({ showLibrary: applySetStateAction(value, state.showLibrary) })),
      setShowInspector: (value) =>
        set((state) => ({ showInspector: applySetStateAction(value, state.showInspector) })),
      setShowLayers: (value) =>
        set((state) => ({ showLayers: applySetStateAction(value, state.showLayers) })),
      setShowToolbar: (value) =>
        set((state) => ({ showToolbar: applySetStateAction(value, state.showToolbar) })),
      setShowTracks: (value) =>
        set((state) => ({ showTracks: applySetStateAction(value, state.showTracks) })),

      addSceneItem: (item) =>
        set((state) => {
          const existing = state.sceneItems.filter((i) => i.id !== item.id);
          const nextLabel = deriveUniqueLabel(existing, item.label);
          return { sceneItems: [...existing, { ...item, label: nextLabel }] };
        }),
      removeSceneItem: (id) =>
        set((state) => ({ sceneItems: state.sceneItems.filter((item) => item.id !== id) })),
      updateSceneItemLabel: (id, label) =>
        set((state) => ({
          sceneItems: state.sceneItems.map((item) =>
            item.id === id ? { ...item, label } : item,
          ),
        })),
      bringForward: (id) =>
        set((state) => ({ sceneItems: reorderSceneItems(state.sceneItems, id, 1) })),
      sendBackward: (id) =>
        set((state) => ({ sceneItems: reorderSceneItems(state.sceneItems, id, -1) })),

      setFitInView: (fn) =>
        set((state) => (state.fitInView === fn ? state : { fitInView: fn })),
      setImportAsset: (fn) =>
        set((state) => (state.importAsset === fn ? state : { importAsset: fn })),
    }),
    {
      name: LAYOUT_STORAGE_KEY,
      partialize: (state) => ({
          showTimeline: state.showTimeline,
          timelineHeight: state.timelineHeight,
          showLibrary: state.showLibrary,
          showInspector: state.showInspector,
          showLayers: state.showLayers,
          showToolbar: state.showToolbar,
          showTracks: state.showTracks,
        }) as Partial<UiState>,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as LayoutState | undefined) ?? {}),
      }),
    },
  ),
);

/**
 * Composant wrapper pour le contexte UI. Actuellement un simple passthrough.
 */
export const UiProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

/**
 * Réinitialise l'état de l'interface utilisateur à ses valeurs par défaut.
 */
export const resetUiState = () => {
  useUi.setState(createBaseState());
};

