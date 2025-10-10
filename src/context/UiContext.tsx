import React, { createContext, useContext, useMemo, useState } from "react";

export interface PuppetMetadata {
  id: string;
  source: string;
  variantGroups: Array<{
    group: string;
    defaultVariantId: string | null;
    variants: Array<{
      id: string;
      targetMemberId: string | null;
      memberId: string | null;
      name: string | null;
      isDefault: boolean;
      isBehindParent?: boolean;
      side?: string | null;
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
  setShowTimeline: (v: boolean) => void;
  timelineHeight: number;
  setTimelineHeight: (px: number) => void;
  showLibrary: boolean;
  setShowLibrary: (v: boolean) => void;
  showInspector: boolean;
  setShowInspector: (v: boolean) => void;
  showLayers: boolean;
  setShowLayers: (v: boolean) => void;
  showToolbar: boolean;
  setShowToolbar: (v: boolean) => void;
  showTracks: boolean;
  setShowTracks: (v: boolean) => void;

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

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [fitInView, _setFitInView] = useState<UiState['fitInView']>(undefined);
  const [importAsset, _setImportAsset] = useState<UiState['importAsset']>(undefined);

  const addSceneItem: UiState['addSceneItem'] = (item) => {
    setSceneItems((prev) => {
      // Generate unique label if duplicate
      const existing = prev.filter((i) => i.id !== item.id);
      const sameName = existing.filter((i) => i.label.startsWith(item.label.replace(/ \(\d+\)$/, '')));
      if (sameName.length > 0) {
        item.label = `${item.label} (${sameName.length + 1})`;
      }
      return [...existing, item];
    });
  };
  const removeSceneItem: UiState['removeSceneItem'] = (id) => {
    setSceneItems((prev) => prev.filter((i) => i.id !== id));
  };
  const updateSceneItemLabel: UiState['updateSceneItemLabel'] = (id, label) => {
    setSceneItems((prev) => prev.map((i) => i.id === id ? { ...i, label } : i));
  };
  const bringForward: UiState['bringForward'] = (id) => {
    const item = sceneItems.find((i) => i.id === id);
    if (!item || !(item.el as any).parentNode) return;
    const parent = (item.el as any).parentNode as Node & { insertBefore: Function; lastChild: ChildNode | null };
    if (item.el.nextSibling) {
      parent.insertBefore(item.el.nextSibling, item.el);
    }
  };
  const sendBackward: UiState['sendBackward'] = (id) => {
    const item = sceneItems.find((i) => i.id === id);
    if (!item || !(item.el as any).parentNode) return;
    const parent = (item.el as any).parentNode as Node & { insertBefore: Function; firstChild: ChildNode | null };
    if (item.el.previousSibling) {
      parent.insertBefore(item.el, item.el.previousSibling);
    }
  };

  // load persisted UI layout
  React.useEffect(() => {
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
  React.useEffect(() => {
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
      setFitInView: _setFitInView,
      importAsset,
      setImportAsset: _setImportAsset,
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
      fitInView,
      importAsset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
};
