import React, { createContext, useContext, useMemo, useState } from "react";
import type { PuppetMetadata, PuppetVariantSelections } from "../components/SvgPuppet";

type LimbKeyframe = { frame: number; value: number };

const TOTAL_FRAMES = 240;

const interpolateKeyframes = (frames: LimbKeyframe[], frame: number): number | null => {
  if (!frames.length) return null;
  const sorted = frames.slice().sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0]!.frame) return sorted[0]!.value;
  const last = sorted[sorted.length - 1]!;
  if (frame >= last.frame) return last.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (frame >= a.frame && frame <= b.frame) {
      const span = b.frame - a.frame;
      if (span === 0) return b.value;
      const t = (frame - a.frame) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
};

export interface UiState {
  selectedPuppet: SVGGElement | null;
  setSelectedPuppet: (g: SVGGElement | null) => void;

  limbIds: string[];
  setLimbIds: (ids: string[]) => void;

  selectedLimb: string;
  setSelectedLimb: (id: string) => void;

  angle: number;
  setAngle: (deg: number) => void;

  playing: boolean;
  setPlaying: (v: boolean) => void;

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

  selectedPuppetMetadata: PuppetMetadata | null;
  setSelectedPuppetMetadata: (metadata: PuppetMetadata | null) => void;
  selectedVariantSelections: PuppetVariantSelections;
  setSelectedVariantSelections: (
    selections: PuppetVariantSelections | ((prev: PuppetVariantSelections) => PuppetVariantSelections),
  ) => void;
  setVariantForSelected: (group: string, variantId: string | null) => void;
  setVariantSetter: (fn: UiState["setVariantForSelected"]) => void;

  // Scene items for Layers panel
  sceneItems: Array<{ id: string; type: 'puppet' | 'image'; label: string; el: Element }>;
  addSceneItem: (item: { id: string; type: 'puppet' | 'image'; label: string; el: Element }) => void;
  removeSceneItem: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  keyframes: Record<string, LimbKeyframe[]>;
  addKeyframe: (limbId: string, frame: number, value: number) => void;
  updateKeyframe: (limbId: string, frame: number, value: number) => void;
  removeKeyframe: (limbId: string, frame: number) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  totalFrames: number;

  // Scene helpers injected by SvgScene
  fitInView?: () => void;
  setFitInView: (fn: (() => void) | undefined) => void;
  importAsset?: (asset: { name: string; type: 'pantin' | 'objet' | 'decor'; path: string }) => void;
  setImportAsset: (fn: ((asset: { name: string; type: 'pantin' | 'objet' | 'decor'; path: string }) => void) | undefined) => void;

  attachObjectToSelectedLimb: (objectId: string) => void;
  detachObjectFromSelectedLimb: (objectId: string) => void;
  setAttachHandler: (fn: UiState["attachObjectToSelectedLimb"]) => void;
  setDetachHandler: (fn: UiState["detachObjectFromSelectedLimb"]) => void;
}

const Ctx = createContext<UiState | null>(null);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPuppet, setSelectedPuppet] = useState<SVGGElement | null>(null);
  const [limbIds, setLimbIds] = useState<string[]>([]);
  const [selectedLimb, setSelectedLimb] = useState<string>("");
  const [angle, setAngle] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);
  const [timelineHeight, setTimelineHeight] = useState<number>(200);
  const [showLibrary, setShowLibrary] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showTracks, setShowTracks] = useState<boolean>(true);
  const [selectedPuppetMetadata, setSelectedPuppetMetadata] = useState<PuppetMetadata | null>(null);
  const [selectedVariantSelections, setSelectedVariantSelections] = useState<PuppetVariantSelections>({});
  const [sceneItems, setSceneItems] = useState<
    Array<{ id: string; type: 'puppet' | 'image'; label: string; el: Element }>
  >([]);
  const [fitInView, _setFitInView] = useState<UiState['fitInView']>(undefined);
  const [importAsset, _setImportAsset] = useState<UiState['importAsset']>(undefined);
  const [variantSetter, _setVariantSetter] = useState<UiState['setVariantForSelected']>(() => () => {});
  const [keyframes, setKeyframes] = useState<Record<string, LimbKeyframe[]>>({});
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [attachHandler, _setAttachHandler] = useState<UiState['attachObjectToSelectedLimb']>(() => () => {});
  const [detachHandler, _setDetachHandler] = useState<UiState['detachObjectFromSelectedLimb']>(() => () => {});

  const setVariantSetter = React.useCallback<UiState['setVariantSetter']>((fn) => {
    _setVariantSetter(() => fn);
  }, []);
  const setAttachHandler = React.useCallback<UiState['setAttachHandler']>((fn) => {
    _setAttachHandler(() => fn);
  }, []);
  const setDetachHandler = React.useCallback<UiState['setDetachHandler']>((fn) => {
    _setDetachHandler(() => fn);
  }, []);

  const addKeyframe = React.useCallback<UiState['addKeyframe']>((limbId, frame, value) => {
    setKeyframes((prev) => {
      const frames = prev[limbId] ? [...prev[limbId]!] : [];
      const idx = frames.findIndex((k) => k.frame === frame);
      if (idx >= 0) {
        frames[idx] = { frame, value };
      } else {
        frames.push({ frame, value });
      }
      frames.sort((a, b) => a.frame - b.frame);
      return { ...prev, [limbId]: frames };
    });
  }, []);

  const updateKeyframe = React.useCallback<UiState['updateKeyframe']>((limbId, frame, value) => {
    setKeyframes((prev) => {
      const frames = prev[limbId];
      if (!frames) return prev;
      const idx = frames.findIndex((k) => k.frame === frame);
      if (idx === -1) return prev;
      const nextFrames = frames.slice();
      nextFrames[idx] = { frame, value };
      return { ...prev, [limbId]: nextFrames };
    });
  }, []);

  const removeKeyframe = React.useCallback<UiState['removeKeyframe']>((limbId, frame) => {
    setKeyframes((prev) => {
      const frames = prev[limbId];
      if (!frames) return prev;
      const nextFrames = frames.filter((k) => k.frame !== frame);
      const next = { ...prev };
      if (nextFrames.length) {
        next[limbId] = nextFrames;
      } else {
        delete next[limbId];
      }
      return next;
    });
  }, []);

  const addSceneItem: UiState['addSceneItem'] = (item) => {
    setSceneItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
  };
  const removeSceneItem: UiState['removeSceneItem'] = (id) => {
    setSceneItems((prev) => prev.filter((i) => i.id !== id));
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

  React.useEffect(() => {
    if (!selectedLimb) return;
    const frames = keyframes[selectedLimb];
    if (!frames || frames.length === 0) return;
    const v = interpolateKeyframes(frames, currentFrame);
    if (v === null || Number.isNaN(v)) return;
    setAngle(v);
  }, [selectedLimb, keyframes, currentFrame]);

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
      playing,
      setPlaying,
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
      selectedPuppetMetadata,
      setSelectedPuppetMetadata,
      selectedVariantSelections,
      setSelectedVariantSelections,
      setVariantForSelected: variantSetter,
      setVariantSetter,
      sceneItems,
      addSceneItem,
      removeSceneItem,
      bringForward,
      sendBackward,
      keyframes,
      addKeyframe,
      updateKeyframe,
      removeKeyframe,
      currentFrame,
      setCurrentFrame,
      totalFrames: TOTAL_FRAMES,
      fitInView,
      setFitInView: _setFitInView,
      importAsset,
      setImportAsset: _setImportAsset,
      attachObjectToSelectedLimb: attachHandler,
      detachObjectFromSelectedLimb: detachHandler,
      setAttachHandler,
      setDetachHandler,
    }),
    [
      selectedPuppet,
      limbIds,
      selectedLimb,
      angle,
      playing,
      showTimeline,
      timelineHeight,
      showLibrary,
      showInspector,
      showLayers,
      showToolbar,
      showTracks,
      selectedPuppetMetadata,
      selectedVariantSelections,
      sceneItems,
      keyframes,
      currentFrame,
      fitInView,
      importAsset,
      variantSetter,
      attachHandler,
      detachHandler,
      setVariantSetter,
      setAttachHandler,
      setDetachHandler,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
};
