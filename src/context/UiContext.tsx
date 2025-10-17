import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  readFromLocalStorage,
  writeToLocalStorage,
} from "../hooks/useLocalStorage";

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

  // Selected scene item (for Inspector)
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  // Panels & layout
  showTimeline: boolean;
  setShowTimeline: Dispatch<SetStateAction<boolean>>;
  timelineHeight: number;
  setTimelineHeight: Dispatch<SetStateAction<number>>;
  showLibrary: boolean;
  setShowLibrary: Dispatch<SetStateAction<boolean>>;
  showInspector: boolean;
  setShowInspector: Dispatch<SetStateAction<boolean>>;
  showLayers: boolean;
  setShowLayers: Dispatch<SetStateAction<boolean>>;
  showToolbar: boolean;
  setShowToolbar: Dispatch<SetStateAction<boolean>>;
  showTracks: boolean;
  setShowTracks: Dispatch<SetStateAction<boolean>>;

  // Scene items for Layers panel
  sceneItems: SceneItem[];
  addSceneItem: (item: SceneItem) => void;
  removeSceneItem: (id: string) => void;
  updateSceneItemLabel: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Scene helpers injected by SvgScene
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

const Ctx = createContext<UiState | null>(null);

const NUMBERED_LABEL_SUFFIX = / \(\d+\)$/;

const LAYOUT_STORAGE_KEY = "ui:layout";

type LayoutState = {
  showTimeline: boolean;
  timelineHeight: number;
  showLibrary: boolean;
  showInspector: boolean;
  showLayers: boolean;
  showToolbar: boolean;
  showTracks: boolean;
};

type LayoutStateSetters = {
  [K in keyof LayoutState]: Dispatch<SetStateAction<LayoutState[K]>>;
};

type BooleanLayoutKey = {
  [K in keyof LayoutState]: LayoutState[K] extends boolean ? K : never;
}[keyof LayoutState];

type NumberLayoutKey = {
  [K in keyof LayoutState]: LayoutState[K] extends number ? K : never;
}[keyof LayoutState];

const booleanLayoutKeys: BooleanLayoutKey[] = [
  "showTimeline",
  "showLibrary",
  "showInspector",
  "showLayers",
  "showToolbar",
  "showTracks",
];

const numberLayoutKeys: NumberLayoutKey[] = ["timelineHeight"];

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

type UiProviderProps = { children: ReactNode };

export const UiProvider = ({ children }: UiProviderProps) => {
  const [selectedPuppet, setSelectedPuppet] = useState<SVGElement | null>(
    null,
  );
  const [selectedLimb, setSelectedLimb] = useState<string>("");
  const [angle, setAngle] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);
  const [timelineHeight, setTimelineHeight] = useState<number>(160);
  const [showLibrary, setShowLibrary] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showTracks, setShowTracks] = useState<boolean>(false);
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([]);
  const [, setHelpersVersion] = useState(0);
  const fitInViewRef = useRef<UiState["fitInView"]>(undefined);
  const importAssetRef = useRef<UiState["importAsset"]>(undefined);

  const layoutSetters = useMemo<LayoutStateSetters>(
    () => ({
      showTimeline: setShowTimeline,
      timelineHeight: setTimelineHeight,
      showLibrary: setShowLibrary,
      showInspector: setShowInspector,
      showLayers: setShowLayers,
      showToolbar: setShowToolbar,
      showTracks: setShowTracks,
    }),
    [
      setShowTimeline,
      setTimelineHeight,
      setShowLibrary,
      setShowInspector,
      setShowLayers,
      setShowToolbar,
      setShowTracks,
    ],
  );

  const layoutValues = useMemo<LayoutState>(
    () => ({
      showTimeline,
      timelineHeight,
      showLibrary,
      showInspector,
      showLayers,
      showToolbar,
      showTracks,
    }),
    [
      showTimeline,
      timelineHeight,
      showLibrary,
      showInspector,
      showLayers,
      showToolbar,
      showTracks,
    ],
  );

  const addSceneItem = useCallback<UiState["addSceneItem"]>((item) => {
    setSceneItems((prev) => {
      const existing = prev.filter((i) => i.id !== item.id);
      const nextLabel = deriveUniqueLabel(existing, item.label);
      return [...existing, { ...item, label: nextLabel }];
    });
  }, []);

  const removeSceneItem = useCallback<UiState["removeSceneItem"]>((id) => {
    setSceneItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateSceneItemLabel = useCallback<UiState["updateSceneItemLabel"]>(
    (id, label) => {
      setSceneItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, label } : i)),
      );
    },
    [],
  );

  const reorderSceneItem = useCallback((id: string, direction: 1 | -1) => {
    setSceneItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) {
        return prev;
      }

      const targetIndex = Math.min(
        Math.max(index + direction, 0),
        prev.length - 1,
      );
      if (targetIndex === index) {
        return prev;
      }

      const currentItem = prev[index];
      const parent = currentItem.el.parentNode;
      if (!parent) {
        return prev;
      }

      if (direction > 0) {
        const nextSibling = currentItem.el.nextSibling;
        if (!nextSibling) {
          return prev;
        }
        parent.insertBefore(currentItem.el, nextSibling.nextSibling);
      } else {
        const previousSibling = currentItem.el.previousSibling;
        if (!previousSibling) {
          return prev;
        }
        parent.insertBefore(currentItem.el, previousSibling);
      }

      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  }, []);

  const bringForward = useCallback<UiState["bringForward"]>(
    (id) => {
      reorderSceneItem(id, 1);
    },
    [reorderSceneItem],
  );

  const sendBackward = useCallback<UiState["sendBackward"]>(
    (id) => {
      reorderSceneItem(id, -1);
    },
    [reorderSceneItem],
  );

  const setFitInView = useCallback<UiState["setFitInView"]>(
    (fn) => {
      const next = fn ?? undefined;
      if (fitInViewRef.current === next) {
        return;
      }
      fitInViewRef.current = next;
      setHelpersVersion((version) => version + 1);
    },
    [setHelpersVersion],
  );

  const setImportAsset = useCallback<UiState["setImportAsset"]>(
    (fn) => {
      const next = fn ?? undefined;
      if (importAssetRef.current === next) {
        return;
      }
      importAssetRef.current = next;
      setHelpersVersion((version) => version + 1);
    },
    [setHelpersVersion],
  );

  const fitInView = fitInViewRef.current;
  const importAsset = importAssetRef.current;

  // load persisted UI layout
  useEffect(() => {
    const parsed = readFromLocalStorage<
      Partial<Record<keyof LayoutState, unknown>>
    >(LAYOUT_STORAGE_KEY, {});

    booleanLayoutKeys.forEach((key) => {
      const candidate = parsed[key];
      if (typeof candidate === "boolean") {
        layoutSetters[key](candidate);
      }
    });

    numberLayoutKeys.forEach((key) => {
      const candidate = parsed[key];
      if (typeof candidate === "number") {
        layoutSetters[key](candidate);
      }
    });
  }, [layoutSetters]);

  // Persist layout changes
  useEffect(() => {
    writeToLocalStorage(LAYOUT_STORAGE_KEY, layoutValues);
  }, [layoutValues]);

  const value = useMemo(
    () => ({
      selectedPuppet,
      setSelectedPuppet,
      selectedLimb,
      setSelectedLimb,
      angle,
      setAngle,
      selectedItemId,
      setSelectedItemId,
      showTimeline,
      setShowTimeline,
      timelineHeight,
      setTimelineHeight,
      showLibrary,
      setShowLibrary,
      showInspector,
      setShowInspector,
      showLayers,
      setShowLayers,
      showToolbar,
      setShowToolbar,
      showTracks,
      setShowTracks,
      sceneItems,
      addSceneItem,
      removeSceneItem,
      updateSceneItemLabel,
      bringForward,
      sendBackward,
      fitInView,
      setFitInView,
      importAsset,
      setImportAsset,
    }),
    [
      selectedPuppet,
      selectedLimb,
      angle,
      selectedItemId,
      showTimeline,
      timelineHeight,
      showLibrary,
      showInspector,
      showLayers,
      showToolbar,
      showTracks,
      sceneItems,
      addSceneItem,
      removeSceneItem,
      updateSceneItemLabel,
      bringForward,
      sendBackward,
      fitInView,
      setFitInView,
      importAsset,
      setImportAsset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
};
