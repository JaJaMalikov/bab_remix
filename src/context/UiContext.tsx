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
  type: 'puppet' | 'image';
  label: string;
  el: Element;
  metadata?: PuppetMetadata;
}

export interface UiState {
  selectedPuppet: SVGGElement | null;
  setSelectedPuppet: (g: SVGGElement | null) => void;

  limbIds: string[];
  setLimbIds: (ids: string[]) => void;

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
  importAsset?: (asset: { name: string; type: 'pantin' | 'objet' | 'decor'; path: string }) => void;
  setImportAsset: (fn: ((asset: { name: string; type: 'pantin' | 'objet' | 'decor'; path: string }) => void) | undefined) => void;
}

const Ctx = createContext<UiState | null>(null);

const NUMBERED_LABEL_SUFFIX = / \(\d+\)$/;

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
  const [selectedPuppet, setSelectedPuppet] = useState<SVGGElement | null>(null);
  const [limbIds, setLimbIds] = useState<string[]>([]);
  const [selectedLimb, setSelectedLimb] = useState<string>("");
  const [angle, setAngle] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);
  const [timelineHeight, setTimelineHeight] = useState<number>(200);
  const [showLibrary, setShowLibrary] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showTracks, setShowTracks] = useState<boolean>(false);
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([]);
  const [, setHelpersVersion] = useState(0);
  const fitInViewRef = useRef<UiState['fitInView']>(undefined);
  const importAssetRef = useRef<UiState['importAsset']>(undefined);

  const addSceneItem = useCallback<UiState['addSceneItem']>((item) => {
    setSceneItems((prev) => {
      const existing = prev.filter((i) => i.id !== item.id);
      const nextLabel = deriveUniqueLabel(existing, item.label);
      return [...existing, { ...item, label: nextLabel }];
    });
  }, []);

  const removeSceneItem = useCallback<UiState['removeSceneItem']>((id) => {
    setSceneItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateSceneItemLabel = useCallback<UiState['updateSceneItemLabel']>((id, label) => {
    setSceneItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)));
  }, []);

  const reorderSceneItem = useCallback((id: string, direction: 1 | -1) => {
    setSceneItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) {
        return prev;
      }

      const targetIndex = Math.min(Math.max(index + direction, 0), prev.length - 1);
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

  const bringForward = useCallback<UiState['bringForward']>((id) => {
    reorderSceneItem(id, 1);
  }, [reorderSceneItem]);

  const sendBackward = useCallback<UiState['sendBackward']>((id) => {
    reorderSceneItem(id, -1);
  }, [reorderSceneItem]);

  const setFitInView = useCallback<UiState['setFitInView']>((fn) => {
    const next = fn ?? undefined;
    if (fitInViewRef.current === next) {
      return;
    }
    fitInViewRef.current = next;
    setHelpersVersion((version) => version + 1);
  }, [setHelpersVersion]);

  const setImportAsset = useCallback<UiState['setImportAsset']>((fn) => {
    const next = fn ?? undefined;
    if (importAssetRef.current === next) {
      return;
    }
    importAssetRef.current = next;
    setHelpersVersion((version) => version + 1);
  }, [setHelpersVersion]);

  const fitInView = fitInViewRef.current;
  const importAsset = importAssetRef.current;

  // load persisted UI layout
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ui:layout');
      if (raw) {
        const v = JSON.parse(raw) as any;
        if (typeof v?.showTimeline === 'boolean') setShowTimeline(v.showTimeline);
        if (typeof v?.timelineHeight === 'number') setTimelineHeight(v.timelineHeight);
        if (typeof v?.showLibrary === 'boolean') setShowLibrary(v.showLibrary);
        if (typeof v?.showInspector === 'boolean') setShowInspector(v.showInspector);
        if (typeof v?.showLayers === 'boolean') setShowLayers(v.showLayers);
        if (typeof v?.showToolbar === 'boolean') setShowToolbar(v.showToolbar);
        if (typeof v?.showTracks === 'boolean') setShowTracks(v.showTracks);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const v = {
        showTimeline,
        timelineHeight,
        showLibrary,
        showInspector,
        showLayers,
        showToolbar,
        showTracks,
      };
      localStorage.setItem('ui:layout', JSON.stringify(v));
    } catch {}
  }, [showTimeline, timelineHeight, showLibrary, showInspector, showLayers, showToolbar, showTracks]);

  const value = useMemo(
    () => ({
      selectedPuppet,
      setSelectedPuppet,
      limbIds,
      setLimbIds,
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
      limbIds,
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
