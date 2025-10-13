import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { useVerticalResize } from "../hooks/useVerticalResize";

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 220;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const extractClientX = (event: MouseEvent | TouchEvent): number | null => {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches?.[0];
    return touch?.clientX ?? null;
  }
  return (event as MouseEvent).clientX ?? null;
};

type TrackId = "visibility" | "position" | "rotation";

type TrackFilters = Record<TrackId, boolean>;

const TRACK_OPTIONS: Array<{ id: TrackId; label: string; description: string }> = [
  { id: "visibility", label: "Visibilité", description: "Segments d'apparition / disparition" },
  { id: "position", label: "Position", description: "Keyframes X / Y" },
  { id: "rotation", label: "Rotation", description: "Keyframes de rotation" },
];

type PositionKeyframe = { frame: number; axis: "x" | "y"; value: number };
type RotationKeyframe = { frame: number; value: number };
type VisibilitySegment = { start: number; end: number; visible: boolean };

type ItemTrackData = {
  id: string;
  label: string;
  type: "puppet" | "image";
  position: PositionKeyframe[];
  rotation: RotationKeyframe[];
  visibility: VisibilitySegment[];
};

const DEFAULT_TRACK_FILTERS: TrackFilters = {
  visibility: true,
  position: true,
  rotation: false,
};

export const Timeline: React.FC = React.memo(() => {
  const { timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const {
    duration,
    currentFrame,
    setCurrentFrame,
    tracks,
    removeKeyframe,
    playing,
    setPlaying,
    snapshotKeyframes,
    addKeyframe,
    getValueAtFrame,
  } = useAnimation();

  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });

  const [trackFilters, setTrackFilters] = useState<TrackFilters>(DEFAULT_TRACK_FILTERS);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const maxFrameIndex = Math.max(duration - 1, 0);
  const frameDivisor = Math.max(maxFrameIndex, 1);
  const safeFrameDivisor = Math.max(frameDivisor, 1);

  useEffect(() => {
    if (timelineHeight > MAX_HEIGHT) {
      setTimelineHeight(MAX_HEIGHT);
    }
  }, [timelineHeight, setTimelineHeight]);

  const computeFrameFromClientX = useCallback(
    (clientX: number): number | null => {
      const rect = laneRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const ratio = rect.width > 0 ? relativeX / rect.width : 0;
      const nextFrame = Math.round(ratio * frameDivisor);
      return clamp(nextFrame, 0, frameDivisor);
    },
    [frameDivisor]
  );

  const updateFrameFromClientX = useCallback(
    (clientX: number) => {
      const frame = computeFrameFromClientX(clientX);
      if (frame === null) return;
      setCurrentFrame(frame);
    },
    [computeFrameFromClientX, setCurrentFrame]
  );

  const startScrubbing = useCallback(
    (initialClientX: number) => {
      setIsScrubbing(true);
      updateFrameFromClientX(initialClientX);

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const clientX = extractClientX(moveEvent);
        if (clientX != null) {
          updateFrameFromClientX(clientX);
        }
      };

      const stopScrubbing = () => {
        setIsScrubbing(false);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("mouseup", stopScrubbing);
        window.removeEventListener("touchend", stopScrubbing);
        window.removeEventListener("touchcancel", stopScrubbing);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", stopScrubbing);
      window.addEventListener("touchend", stopScrubbing);
      window.addEventListener("touchcancel", stopScrubbing);
    },
    [updateFrameFromClientX]
  );

  const handleLanePointerDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      const initialClientX =
        "touches" in event ? event.touches[0]?.clientX ?? null : event.clientX ?? null;
      if (initialClientX == null) return;
      startScrubbing(initialClientX);
    },
    [startScrubbing]
  );

  const handleTrackLayerPointerDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      const clientX =
        "touches" in event ? event.touches[0]?.clientX ?? null : (event as React.MouseEvent).clientX ?? null;
      if (clientX == null) return;
      startScrubbing(clientX);
    },
    [startScrubbing]
  );

  const toggleVisibilityAtFrame = useCallback(
    (itemId: string, frame: number) => {
      const currentValue = getValueAtFrame(itemId, null, "visible", frame);
      const nextValue = !(currentValue === null ? true : Boolean(currentValue));
      addKeyframe(itemId, null, "visible", frame, nextValue);
    },
    [addKeyframe, getValueAtFrame]
  );

  const handleVisibilityTrackPointerDown = useCallback(
    (itemId: string, event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const clientX =
        "touches" in event ? event.touches[0]?.clientX ?? null : (event as React.MouseEvent).clientX ?? null;
      if (clientX == null) return;
      const frame = computeFrameFromClientX(clientX);
      if (frame === null) return;
      setCurrentFrame(frame);
      toggleVisibilityAtFrame(itemId, frame);
    },
    [computeFrameFromClientX, setCurrentFrame, toggleVisibilityAtFrame]
  );

  const frameMarkers = useMemo(
    () =>
      Array.from(
        tracks.reduce((acc, track) => {
          track.keyframes.forEach((kf) => {
            acc.set(kf.frame, (acc.get(kf.frame) ?? 0) + 1);
          });
          return acc;
        }, new Map<number, number>())
      )
        .sort((a, b) => a[0] - b[0])
        .map(([frame, count]) => ({ frame, count })),
    [tracks]
  );

  const currentFramePosition = useMemo(
    () => (currentFrame / safeFrameDivisor) * 100,
    [currentFrame, safeFrameDivisor]
  );

  const tickStep = useMemo(() => {
    if (frameDivisor > 720) return 60;
    if (frameDivisor > 360) return 30;
    if (frameDivisor > 240) return 24;
    if (frameDivisor > 120) return 12;
    if (frameDivisor > 60) return 8;
    if (frameDivisor > 30) return 4;
    return 1;
  }, [frameDivisor]);

  const itemTrackData = useMemo<ItemTrackData[]>(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        type: "puppet" | "image";
        positionX: Map<number, number>;
        positionY: Map<number, number>;
        rotation: Map<number, number>;
        visibility: Map<number, boolean>;
      }
    >();

    sceneItems.forEach((item) => {
      map.set(item.id, {
        id: item.id,
        label: item.label,
        type: item.type,
        positionX: new Map(),
        positionY: new Map(),
        rotation: new Map(),
        visibility: new Map(),
      });
    });

    tracks.forEach((track) => {
      const entry = map.get(track.targetId);
      if (!entry) return;

      if (track.property === "x" && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue = typeof kf.value === "number" ? kf.value : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.positionX.set(frame, numericValue);
          }
        });
      }

      if (track.property === "y" && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue = typeof kf.value === "number" ? kf.value : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.positionY.set(frame, numericValue);
          }
        });
      }

      if (track.property === "rotation" && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue = typeof kf.value === "number" ? kf.value : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.rotation.set(frame, numericValue);
          }
        });
      }

      if (track.property === "visible" && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          entry.visibility.set(frame, Boolean(kf.value));
        });
      }
    });

    const buildVisibilitySegments = (visibilityMap: Map<number, boolean>): VisibilitySegment[] => {
      const entries = Array.from(visibilityMap.entries()).sort((a, b) => a[0] - b[0]);
      const segments: VisibilitySegment[] = [];
      let cursor = 0;
      let currentVisible = true;

      entries.forEach(([frame, value]) => {
        const clampedFrame = clamp(frame, 0, frameDivisor);
        if (clampedFrame > cursor) {
          segments.push({ start: cursor, end: clampedFrame, visible: currentVisible });
        }
        currentVisible = value;
        cursor = clampedFrame;
      });

      if (cursor <= frameDivisor) {
        segments.push({ start: cursor, end: frameDivisor, visible: currentVisible });
      }

      return segments;
    };

    return Array.from(map.values()).map((entry) => {
      const position: PositionKeyframe[] = [];
      entry.positionX.forEach((value, frame) => {
        position.push({ frame, value, axis: "x" });
      });
      entry.positionY.forEach((value, frame) => {
        position.push({ frame, value, axis: "y" });
      });
      position.sort((a, b) => (a.frame === b.frame ? (a.axis > b.axis ? 1 : -1) : a.frame - b.frame));

      const rotation: RotationKeyframe[] = Array.from(entry.rotation.entries())
        .map(([frame, value]) => ({ frame, value }))
        .sort((a, b) => a.frame - b.frame);

      const visibility = buildVisibilitySegments(entry.visibility);

      return {
        id: entry.id,
        label: entry.label,
        type: entry.type,
        position,
        rotation,
        visibility,
      };
    });
  }, [sceneItems, tracks, frameDivisor]);

  const handleToggleTrackFilter = useCallback((id: TrackId) => {
    setTrackFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleTogglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setCurrentFrame, setPlaying]);

  const gotoFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(clamp(frame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame]
  );

  const clearFrameKeyframes = useCallback(
    (frame: number) => {
      tracks.forEach((track) => {
        const hasKeyframe = track.keyframes.some((kf) => kf.frame === frame);
        if (hasKeyframe) {
          removeKeyframe(track.id, frame);
        }
      });
    },
    [removeKeyframe, tracks]
  );

  const activeTrackCount = TRACK_OPTIONS.filter((option) => trackFilters[option.id]).length;
  const showTrackRows = activeTrackCount > 0 && sceneItems.length > 0;

  return (
    <div className="timeline" style={{ height: timelineHeight }}>
      <div
        className="timeline-resizer"
        onMouseDown={onResizeMouseDown}
        title="Redimensionner la timeline"
      />
      <div className="timeline-toolbar">
        <div className="timeline-toolbar-left">
          <button
            type="button"
            className="timeline-icon-button"
            title={playing ? "Pause" : "Lecture"}
            onClick={handleTogglePlay}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Revenir au début"
            onClick={handleStop}
          >
            ⏹
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Snapshot des éléments à ce frame"
            onClick={() => snapshotKeyframes(sceneItems)}
          >
            📸
          </button>
        </div>
        <div className="timeline-toolbar-right">
          <span className="timeline-readout" title="Frame courante">
            <span className="timeline-readout-label">Frame</span>
            <span className="timeline-readout-value">{currentFrame}</span>
          </span>
          <span className="timeline-readout" title="Durée totale">
            <span className="timeline-readout-label">Durée</span>
            <span className="timeline-readout-value">{duration || 0}</span>
          </span>
        </div>
      </div>

      <div className="timeline-body">
        <div className="timeline-track-panel">
          <div className="timeline-track-panel-header">Pistes</div>
          <div className="timeline-track-toggle-list">
            {TRACK_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`timeline-track-toggle${trackFilters[option.id] ? " is-active" : ""}`}
                onClick={() => handleToggleTrackFilter(option.id)}
                aria-pressed={trackFilters[option.id]}
              >
                <span className="timeline-track-toggle-label">{option.label}</span>
                <span className="timeline-track-toggle-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="timeline-track-view">
          <div className="timeline-track-header">
            <div className="timeline-track-label timeline-track-label--header">Élément</div>
            <div
              className={`timeline-lane${isScrubbing ? " is-scrubbing" : ""}`}
              ref={laneRef}
              onMouseDown={handleLanePointerDown}
              onTouchStart={handleLanePointerDown}
              role="presentation"
            >
              <div className="timeline-lane-background" />
              <div className="timeline-playhead" style={{ left: `${currentFramePosition}%` }} />
              {frameMarkers.map(({ frame, count }) => {
                const left = (frame / safeFrameDivisor) * 100;
                return (
                  <button
                    key={frame}
                    type="button"
                    className={`timeline-marker${frame === currentFrame ? " is-active" : ""}`}
                    style={{ left: `${left}%` }}
                    title={count > 1 ? `${count} keyframes au frame ${frame}` : `Keyframe au frame ${frame}`}
                    onClick={() => gotoFrame(frame)}
                    onDoubleClick={() => clearFrameKeyframes(frame)}
                  >
                    <span className="timeline-marker-stem" />
                    <span className="timeline-marker-cap" />
                  </button>
                );
              })}
              {frameMarkers.length === 0 && (
                <div className="timeline-lane-empty">Aucune keyframe pour l’instant.</div>
              )}
              <div className="timeline-lane-scale">
                {Array.from({ length: frameDivisor + 1 }, (_, index) => {
                  if (index !== 0 && index !== frameDivisor && index % tickStep !== 0) {
                    return null;
                  }
                  const left = (index / safeFrameDivisor) * 100;
                  return (
                    <div key={index} className="timeline-lane-tick" style={{ left: `${left}%` }}>
                      <span className="timeline-lane-tick-line" />
                      <span className="timeline-lane-tick-label">{index}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="timeline-track-scroll">
            {!showTrackRows && (
              <div className="timeline-track-empty">
                {sceneItems.length === 0
                  ? "Aucun élément dans la scène pour le moment."
                  : "Sélectionner au moins un type de piste pour visualiser la timeline."}
              </div>
            )}

            {showTrackRows && (
              <div className="timeline-track-list">
                {itemTrackData.map((trackData) => {
                  const icon = trackData.type === "puppet" ? "🪆" : "🖼️";
                  return (
                    <div className="timeline-track-row" key={trackData.id}>
                      <div className="timeline-track-label" title={trackData.label}>
                        <span className="timeline-track-label-icon" aria-hidden>{icon}</span>
                        <span className="timeline-track-label-text">{trackData.label}</span>
                      </div>
                      <div className="timeline-track-layers">
                        {trackFilters.visibility && (
                          <div
                            className="timeline-track-layer track-layer-visibility"
                            onMouseDown={(event) => handleVisibilityTrackPointerDown(trackData.id, event)}
                            onTouchStart={(event) => handleVisibilityTrackPointerDown(trackData.id, event)}
                            role="presentation"
                          >
                            {trackData.visibility.map((segment, index) => {
                              const start = clamp(segment.start, 0, frameDivisor);
                              const end = clamp(segment.end, 0, frameDivisor);
                              const leftPercent = (start / safeFrameDivisor) * 100;
                              const span = Math.max(end - start, 1);
                              const widthPercent = Math.min((span / safeFrameDivisor) * 100, 100 - leftPercent);
                              return (
                                <div
                                  key={index}
                                  className={`timeline-track-segment${segment.visible ? " is-visible" : " is-hidden"}`}
                                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                />
                              );
                            })}
                            <div
                              className="timeline-track-playhead"
                              style={{ left: `${currentFramePosition}%` }}
                            />
                          </div>
                        )}

                        {trackFilters.position && (
                          <div
                            className="timeline-track-layer track-layer-position"
                            onMouseDown={handleTrackLayerPointerDown}
                            onTouchStart={handleTrackLayerPointerDown}
                            role="presentation"
                          >
                            {trackData.position.map((kf, index) => {
                              const leftPercent = (kf.frame / safeFrameDivisor) * 100;
                              return (
                                <div
                                  key={`${kf.axis}-${index}-${kf.frame}`}
                                  className={`timeline-keyframe position-${kf.axis}`}
                                  style={{ left: `${leftPercent}%` }}
                                  title={`${kf.axis.toUpperCase()} • Frame ${kf.frame}`}
                                />
                              );
                            })}
                            <div
                              className="timeline-track-playhead"
                              style={{ left: `${currentFramePosition}%` }}
                            />
                          </div>
                        )}

                        {trackFilters.rotation && (
                          <div
                            className="timeline-track-layer track-layer-rotation"
                            onMouseDown={handleTrackLayerPointerDown}
                            onTouchStart={handleTrackLayerPointerDown}
                            role="presentation"
                          >
                            {trackData.rotation.map((kf, index) => {
                              const leftPercent = (kf.frame / safeFrameDivisor) * 100;
                              return (
                                <div
                                  key={`${trackData.id}-rot-${index}-${kf.frame}`}
                                  className="timeline-keyframe rotation"
                                  style={{ left: `${leftPercent}%` }}
                                  title={`Rotation • Frame ${kf.frame}`}
                                />
                              );
                            })}
                            <div
                              className="timeline-track-playhead"
                              style={{ left: `${currentFramePosition}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
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
