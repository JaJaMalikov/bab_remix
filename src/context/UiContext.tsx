import React, { createContext, useContext, useMemo, useState } from "react";

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

  // Scene items for Layers panel
  sceneItems: Array<{ id: string; type: 'puppet' | 'image'; label: string; el: Element }>;
  addSceneItem: (item: { id: string; type: 'puppet' | 'image'; label: string; el: Element }) => void;
  removeSceneItem: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
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
  const [sceneItems, setSceneItems] = useState<
    Array<{ id: string; type: 'puppet' | 'image'; label: string; el: Element }>
  >([]);

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
      sceneItems,
      addSceneItem,
      removeSceneItem,
      bringForward,
      sendBackward,
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
      sceneItems,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
};
