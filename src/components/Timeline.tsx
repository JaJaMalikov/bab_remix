import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import type {
  Keyframe as AnimationKeyframe,
  KeyframeMutation,
} from "../context/AnimationContext";
import { useTimelineData } from "../hooks/useTimelineData";
import type { TimelineKeyframe } from "../hooks/useTimelineData";
import { useVerticalResize } from "../hooks/useVerticalResize";
import { useTimelineKeyboardShortcuts } from "../hooks/useTimelineKeyboardShortcuts";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineTrack } from "./TimelineTrack";
import { PlaybackControls } from "./PlaybackControls";

const MIN_HEIGHT = 46;
const MAX_HEIGHT = 147;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface DragState {
  pointerId: number;
  startClientX: number;
  pixelsPerFrame: number;
  offset: number;
  duplicate: boolean;
  minOffset: number;
  maxOffset: number;
  originKey: string;
}

export const Timeline: React.FC = React.memo(() => {
  const { timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const {
    duration,
    fps,
    currentFrame,
    setCurrentFrame,
    tracks,
    playing,
    recording,
    setPlaying,
    setRecording,
    snapshotKeyframes,
    addKeyframe,
    getValueAtFrame,
    setDuration,
    setFps,
    moveKeyframes,
    duplicateKeyframes,
  } = useAnimation();

  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });

  const rulerScrollRef = useRef<HTMLDivElement | null>(null);
  const tracksScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineBodyRef = useRef<HTMLDivElement | null>(null);

  // Calculer le zoom par défaut pour remplir l'écran
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (timelineBodyRef.current) {
      // Soustraire la largeur du panneau de contrôle (~200px) et du label (~136px)
      const width = timelineBodyRef.current.offsetWidth - 200 - 150;
      setContainerWidth(width > 0 ? width : 800);
    }
  }, []);

  const defaultZoom = useMemo(() => {
    if (containerWidth > 0 && duration > 0) {
      const pixelsPerFrame = 2;
      const neededWidth = duration * pixelsPerFrame;
      if (neededWidth < containerWidth) {
        return containerWidth / neededWidth;
      }
    }
    return 1;
  }, [containerWidth, duration]);

  const [zoom, setZoom] = useState(defaultZoom);
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedKeyframeIdsRef = useRef<Set<string>>(new Set());
  const [dragStateValue, setDragStateValue] = useState<DragState | null>(null);
  const [copiedKeyframeValue, setCopiedKeyframeValue] = useState<number | boolean | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const setDragState = useCallback(
    (
      value:
        | DragState
        | null
        | ((prev: DragState | null) => DragState | null),
    ) => {
      setDragStateValue((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: DragState | null) => DragState | null)(prev)
            : value;
        dragStateRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (defaultZoom > 1 && zoom === 1) {
      setZoom(defaultZoom);
    }
  }, [defaultZoom, zoom]);

  const maxFrameIndex = Math.max(duration - 1, 0);
  const frameDivisor = Math.max(maxFrameIndex, 1);

  const itemTrackData = useTimelineData(sceneItems, tracks, frameDivisor);

  // Rassembler toutes les keyframes pour les raccourcis clavier
  const allKeyframes = useMemo(() => {
    return itemTrackData.flatMap((item) => item.keyframes);
  }, [itemTrackData]);

  // Gestion des raccourcis clavier de la Timeline
  useTimelineKeyboardShortcuts({
    selectedKeyframeIds,
    setSelectedKeyframeIds,
    allKeyframes,
    duration,
    isTimelineVisible: true, // Le composant est rendu donc visible
  });

  const keyframeLookup = useMemo(() => {
    const map = new Map<
      string,
      { trackId: string; frame: number; keyframe: AnimationKeyframe }
    >();
    tracks.forEach((track) => {
      track.keyframes.forEach((kf) => {
        map.set(`${track.id}:${kf.frame}`, {
          trackId: track.id,
          frame: kf.frame,
          keyframe: kf,
        });
      });
    });
    return map;
  }, [tracks]);

  useEffect(() => {
    if (timelineHeight > MAX_HEIGHT) {
      setTimelineHeight(MAX_HEIGHT);
    }
  }, [timelineHeight, setTimelineHeight]);

  useEffect(() => {
    setSelectedKeyframeIds((prev) => {
      let mutated = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (keyframeLookup.has(id)) {
          next.add(id);
        } else {
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, [keyframeLookup]);

  useEffect(() => {
    selectedKeyframeIdsRef.current = selectedKeyframeIds;
  }, [selectedKeyframeIds]);

  const toggleVisibilityAtFrame = useCallback(
    (itemId: string, frame: number) => {
      const currentValue = getValueAtFrame(itemId, null, "visible", frame);
      const nextValue = !(currentValue === null ? true : Boolean(currentValue));
      addKeyframe(itemId, null, "visible", frame, nextValue);
    },
    [addKeyframe, getValueAtFrame],
  );

  const frameMarkers = useMemo(
    () =>
      Array.from(
        tracks.reduce((acc, track) => {
          track.keyframes.forEach((kf) => {
            acc.set(kf.frame, (acc.get(kf.frame) ?? 0) + 1);
          });
          return acc;
        }, new Map<number, number>()),
      )
        .sort((a, b) => a[0] - b[0])
        .map(([frame, count]) => ({ frame, count })),
    [tracks],
  );

  const keyframeFrames = useMemo(
    () => frameMarkers.map((marker) => marker.frame),
    [frameMarkers],
  );

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setCurrentFrame, setPlaying]);

  const handleDurationChange = useCallback(
    (nextDuration: number) => {
      if (!Number.isFinite(nextDuration)) return;
      const normalized = Math.max(1, Math.round(nextDuration));
      setDuration(normalized);
      setCurrentFrame((prev) => Math.min(prev, normalized - 1));
    },
    [setCurrentFrame, setDuration],
  );

  const handleFpsChange = useCallback(
    (nextFps: number) => {
      if (!Number.isFinite(nextFps)) return;
      const normalized = Math.max(1, Math.round(nextFps));
      setFps(normalized);
    },
    [setFps],
  );

  const gotoFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(clamp(frame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame],
  );

  const handleKeyframePointerDown = useCallback(
    (
      keyframe: TimelineKeyframe,
      event: React.PointerEvent<HTMLButtonElement>,
      pixelsPerFrame: number,
    ) => {
      if (event.button !== 0 || dragStateRef.current) return;

      const prevSelection = selectedKeyframeIds;
      const updatedSelection = new Set(prevSelection);
      const keyId = keyframe.id;
      const isToggle = event.metaKey || event.ctrlKey;
      const isAdditive = event.shiftKey;

      if (isToggle) {
        if (updatedSelection.has(keyId)) {
          updatedSelection.delete(keyId);
        } else {
          updatedSelection.add(keyId);
        }
        if (updatedSelection.size === 0) {
          updatedSelection.add(keyId);
        }
      } else if (isAdditive) {
        updatedSelection.add(keyId);
      } else {
        if (!(updatedSelection.size === 1 && updatedSelection.has(keyId))) {
          updatedSelection.clear();
          updatedSelection.add(keyId);
        }
      }

      let selectionChanged = updatedSelection.size !== prevSelection.size;
      if (!selectionChanged) {
        for (const id of updatedSelection) {
          if (!prevSelection.has(id)) {
            selectionChanged = true;
            break;
          }
        }
      }

      const selectionForDrag = selectionChanged ? updatedSelection : prevSelection;
      if (selectionChanged) {
        setSelectedKeyframeIds(updatedSelection);
      }

      if (selectionForDrag.size === 0) return;

      const frames: number[] = [];
      selectionForDrag.forEach((id) => {
        const meta = keyframeLookup.get(id);
        if (meta) frames.push(meta.frame);
      });
      if (frames.length === 0) return;

      const minFrame = Math.min(...frames);
      const maxFrame = Math.max(...frames);
      const safePixelsPerFrame = pixelsPerFrame <= 0 ? 1 : pixelsPerFrame;
      const minOffset = -minFrame;
      const maxOffset = maxFrameIndex - maxFrame;

      window.getSelection()?.removeAllRanges();
      setDragState({
        pointerId: event.pointerId,
        startClientX: event.clientX,
        pixelsPerFrame: safePixelsPerFrame,
        offset: 0,
        duplicate: event.altKey,
        minOffset,
        maxOffset,
        originKey: keyId,
      });
    },
    [
      keyframeLookup,
      maxFrameIndex,
      selectedKeyframeIds,
      setDragState,
      setSelectedKeyframeIds,
    ],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;

      const divisor = state.pixelsPerFrame || 1;
      const rawOffset = Math.round(
        (event.clientX - state.startClientX) / divisor,
      );
      const clamped = clamp(
        rawOffset,
        state.minOffset,
        state.maxOffset,
      );
      const duplicate = event.altKey;

      if (clamped !== state.offset || duplicate !== state.duplicate) {
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                offset: clamped,
                duplicate,
              }
            : prev,
        );
      }
    },
    [setDragState],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;

      const offset = state.offset;
      const duplicate = state.duplicate || event.altKey;
      const selection = selectedKeyframeIdsRef.current;
      const mutations: KeyframeMutation[] = [];

      selection.forEach((id) => {
        const meta = keyframeLookup.get(id);
        if (!meta) return;
        mutations.push({
          trackId: meta.trackId,
          from: meta.frame,
          to: meta.frame + offset,
          keyframe: meta.keyframe,
        });
      });

      if (offset !== 0 && mutations.length > 0) {
        if (duplicate) {
          duplicateKeyframes(mutations);
        } else {
          moveKeyframes(mutations);
        }
        const updatedSelection = new Set<string>();
        mutations.forEach((mutation) => {
          updatedSelection.add(`${mutation.trackId}:${mutation.to}`);
        });
        setSelectedKeyframeIds(updatedSelection);
      } else if (offset === 0) {
        const originMeta = keyframeLookup.get(state.originKey);
        if (originMeta) {
          gotoFrame(originMeta.frame);
        }
      }

      setDragState(null);
    },
    [
      duplicateKeyframes,
      gotoFrame,
      keyframeLookup,
      moveKeyframes,
      setDragState,
      setSelectedKeyframeIds,
    ],
  );

  useEffect(() => {
    if (!dragStateValue) return;
    const moveListener = (event: PointerEvent) => { handlePointerMove(event); };
    const upListener = (event: PointerEvent) => { handlePointerUp(event); };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
    window.addEventListener("pointercancel", upListener);

    return () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      window.removeEventListener("pointercancel", upListener);
    };
  }, [dragStateValue, handlePointerMove, handlePointerUp]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.3, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handlePrevKeyframe = useCallback(() => {
    if (keyframeFrames.length === 0) return;
    for (let index = keyframeFrames.length - 1; index >= 0; index -= 1) {
      const frame = keyframeFrames[index];
      if (frame < currentFrame) {
        setCurrentFrame(frame);
        return;
      }
    }
    setCurrentFrame(keyframeFrames[0] ?? 0);
  }, [currentFrame, keyframeFrames, setCurrentFrame]);

  const handleNextKeyframe = useCallback(() => {
    if (keyframeFrames.length === 0) return;
    for (let index = 0; index < keyframeFrames.length; index += 1) {
      const frame = keyframeFrames[index];
      if (frame > currentFrame) {
        setCurrentFrame(frame);
        return;
      }
    }
    setCurrentFrame(keyframeFrames[keyframeFrames.length - 1]);
  }, [currentFrame, keyframeFrames, setCurrentFrame]);

  const syncScroll = useCallback((sourceScrollLeft: number, source: "ruler" | "tracks") => {
      if (source === "ruler" && tracksScrollRef.current) {
        tracksScrollRef.current.scrollLeft = sourceScrollLeft;
      } else if (source === "tracks" && rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft = sourceScrollLeft;
      }
    }, []);

  const showTrackRows = sceneItems.length > 0;
  const dragOffset = dragStateValue?.offset ?? 0;

  const hasPrevKeyframe = useMemo(
    () => keyframeFrames.some((frame) => frame < currentFrame),
    [keyframeFrames, currentFrame],
  );

  const hasNextKeyframe = useMemo(
    () => keyframeFrames.some((frame) => frame > currentFrame),
    [keyframeFrames, currentFrame],
  );

  const handleZoomChange = useCallback(
    (delta: number) => {
      if (delta > 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut],
  );

  return (
    <div className="timeline" style={{ height: timelineHeight }}>
      <div
        className="timeline-resizer"
        onMouseDown={onResizeMouseDown}
        title="Redimensionner la timeline"
      />

      <div ref={timelineBodyRef} className="timeline-body">
        {/* Controls Panel */}
        <PlaybackControls
          isPlaying={playing}
          isRecording={recording}
          currentFrame={currentFrame}
          duration={duration}
          fps={fps}
          zoom={zoom}
          hasPrevKeyframe={hasPrevKeyframe}
          hasNextKeyframe={hasNextKeyframe}
          onPlay={() => { setPlaying(true); }}
          onPause={() => { setPlaying(false); }}
          onStop={handleStop}
          onToggleRecording={() => { setRecording(prev => !prev); }}
          onPrevKeyframe={handlePrevKeyframe}
          onNextKeyframe={handleNextKeyframe}
          onSnapshot={() => { snapshotKeyframes(sceneItems); }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleResetZoom}
          onDurationChange={handleDurationChange}
          onFpsChange={handleFpsChange}
        />

        {/* Timeline View */}
        <div className="timeline-view">
          {/* Ruler */}
          <div
            ref={rulerScrollRef}
            className="timeline-ruler-scroll"
            onScroll={(e) => { syncScroll(e.currentTarget.scrollLeft, 'ruler'); }}
          >
            <TimelineRuler
              duration={duration}
              currentFrame={currentFrame}
              zoom={zoom}
              fps={fps}
              onSeek={gotoFrame}
              onZoom={handleZoomChange}
            />
          </div>

          {/* Tracks */}
          <div className="timeline-tracks-scroll">
            {showTrackRows && (
              <div
                ref={tracksScrollRef}
                className="timeline-tracks-container"
                onScroll={(e) => { syncScroll(e.currentTarget.scrollLeft, 'tracks'); }}
              >
                {itemTrackData.map((trackData) => {
                  const renderedKeyframes = trackData.keyframes.map((kf) => {
                    const isSelected = selectedKeyframeIds.has(kf.id);
                    const offset = isSelected ? dragOffset : 0;
                    const targetFrame = clamp(kf.frame + offset, 0, maxFrameIndex);
                    return {
                      ...kf,
                      displayFrame: targetFrame,
                    };
                  });

                  return (
                    <TimelineTrack
                      key={trackData.id}
                      name={trackData.label}
                      type={trackData.type}
                      keyframes={renderedKeyframes}
                      visibilitySegments={trackData.visibility}
                      duration={duration}
                      zoom={zoom}
                      currentFrame={currentFrame}
                      selectedKeyframes={selectedKeyframeIds}
                      dragOffset={dragOffset}
                      copiedValue={copiedKeyframeValue}
                      onKeyframePointerDown={handleKeyframePointerDown}
                      onVisibilityTrackClick={(frame) => {
                        setCurrentFrame(frame);
                        toggleVisibilityAtFrame(trackData.id, frame);
                      }}
                      onCopyValue={setCopiedKeyframeValue}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
